import { z } from 'zod';
import { BuildError, buildEdition, existingToday } from '@/edition/build';
import { clientIp, fail, parseJson, rateLimit, requireHuman, requireUser, route } from '@/lib/http';
import { captureError } from '@/lib/monitor';
import { adminClient } from '@/lib/supabase';
import type { BuildProgress } from '@/types/events';

export const maxDuration = 120;

const MAX_CONCURRENT_BUILDS = 5; // Groq's free tier allows ~30 req/min; this keeps a launch-day crowd inside it
const MAX_WAIT_MS = 90_000;
const POLL_MS = 700;

const Body = z.object({ rebuild: z.boolean().default(false) });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// POST /api/edition/build  { rebuild?: boolean }   Authorization: Bearer <access_token>
// Responds with a Server-Sent Events stream: one `data: <BuildProgress JSON>` per step, ending in
// {step:'done', editionId} or {step:'error', message, retryable}. Read it with fetch() + a stream
// reader (EventSource cannot send the Authorization header).
export const POST = route(async (req) => {
  const user = await requireUser(req);
  rateLimit(`build:ip:${clientIp(req)}`, 150, 60_000);
  rateLimit(`build:user:${user.id}`, 6, 60_000);
  await requireHuman(user);
  const { rebuild } = await parseJson(req, Body);
  const db = adminClient()!;

  // Double-click guard: one in-flight build per reader.
  const { data: inflight } = await db.from('jobs').select('id').eq('kind', 'edition').eq('user_id', user.id).in('status', ['queued', 'running']).gt('created_at', new Date(Date.now() - 3 * 60_000).toISOString()).limit(1);
  if (inflight?.length) return fail(409, 'Your paper is already being printed.');

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (p: BuildProgress) => { if (!closed) try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(p)}\n\n`)); } catch { closed = true; } };
      const ping = setInterval(() => { if (!closed) try { controller.enqueue(encoder.encode(': ping\n\n')); } catch { closed = true; } }, 10_000);
      let jobId: string | null = null;
      try {
        // A reprint of today's paper needs no queue slot.
        const today = !rebuild ? await existingToday(user.id) : null;
        if (today) { send({ step: 'done', editionId: today.editionId }); return; }

        const { data: job, error } = await db.from('jobs').insert({ kind: 'edition', user_id: user.id, payload: { rebuild } }).select('id').single();
        if (error) throw new Error(error.message);
        jobId = job.id;

        // Postgres semaphore: wait for one of MAX_CONCURRENT_BUILDS slots. The wait IS the printing-press animation.
        const waitStart = Date.now();
        for (;;) {
          const { data: claimed } = await db.rpc('claim_job_slot', { p_job: jobId, p_kind: 'edition', p_max: MAX_CONCURRENT_BUILDS });
          if (claimed) break;
          const { data: position } = await db.rpc('job_queue_position', { p_job: jobId });
          send({ step: 'queued', position: (position as number | null) ?? 0 });
          if (Date.now() - waitStart > MAX_WAIT_MS) {
            await db.from('jobs').update({ status: 'failed', error: 'queue timeout', finished_at: new Date().toISOString() }).eq('id', jobId);
            send({ step: 'error', message: 'The press is very busy right now. Please try again in a minute.', retryable: true });
            return;
          }
          await sleep(POLL_MS);
        }

        const result = await buildEdition(user.id, { rebuild, onProgress: send });
        await db.from('jobs').update({ status: 'done', result, finished_at: new Date().toISOString() }).eq('id', jobId);
      } catch (e) {
        const known = e instanceof BuildError;
        if (!known) { console.error('edition build failed', e); await captureError(e, { task: 'edition-build', userId: user.id }); }
        if (jobId) await db.from('jobs').update({ status: 'failed', error: e instanceof Error ? e.message.slice(0, 300) : String(e), finished_at: new Date().toISOString() }).eq('id', jobId);
        send({ step: 'error', message: known ? e.message : 'Something went wrong printing your paper. Please try again.', retryable: known ? e.retryable : true });
      } finally {
        clearInterval(ping);
        closed = true;
        try { controller.close(); } catch { /* client already gone */ }
      }
    },
  });

  return new Response(stream, { headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no' } });
});
