import { NextResponse } from 'next/server';
import { z } from 'zod';
import { fail, parseJson, rateLimit, requireUser, route } from '@/lib/http';
import { adminClient } from '@/lib/supabase';
import { normalizeBeat, runScout } from '@/scout/scout';

export const maxDuration = 120;

const Body = z.object({ beat: z.string().trim().min(2).max(60) });
const FRESH_DAYS = 7; // a beat scouted within the last week is not scouted again

// POST /api/scout  { beat }  ->  { status: 'added' | 'known', beat, added: [{name, feedUrl}] }
// A reader's niche interest ("Formula E", "Kenyan fintech") grows the catalog for everyone with that interest:
// Google News -> outlets -> RSS autodiscovery -> live check -> LLM vet -> new sources tagged with the beat.
// New sources are read from the next press run (every 3 h); with GITHUB_DISPATCH_TOKEN set, the scout workflow
// also reads just this beat right away (the web app never embeds, so CI has to do it).
export const POST = route(async (req) => {
  const user = await requireUser(req);
  rateLimit(`scout:user:${user.id}`, 6, 3_600_000);
  rateLimit('scout:global', 40, 3_600_000);
  const { beat: raw } = await parseJson(req, Body);
  const beat = normalizeBeat(raw);
  if (beat.length < 2) return fail(400, 'Tell us a little more about the topic.');
  const db = adminClient()!;

  const since = new Date(Date.now() - FRESH_DAYS * 86_400_000).toISOString();
  const { data: recent } = await db.from('jobs').select('id').eq('kind', 'scout').eq('payload->>beat', beat).in('status', ['done', 'running']).gte('created_at', since).limit(1);
  if (recent?.length) return NextResponse.json({ status: 'known', beat, added: [] });

  const { data: job } = await db.from('jobs').insert({ kind: 'scout', user_id: user.id, payload: { beat }, status: 'running', started_at: new Date().toISOString() }).select('id').single();
  try {
    const result = await runScout(beat);
    await db.from('jobs').update({ status: 'done', result, finished_at: new Date().toISOString() }).eq('id', job!.id);

    const token = process.env.GITHUB_DISPATCH_TOKEN;
    const repo = process.env.GITHUB_REPO ?? 'saimbuilds/AI_hackathon';
    if (token && result.added.length) {
      await fetch(`https://api.github.com/repos/${repo}/actions/workflows/scout.yml/dispatches`, {
        method: 'POST', headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'content-type': 'application/json' },
        body: JSON.stringify({ ref: 'main', inputs: { beat, skip_scout: 'true' } }), signal: AbortSignal.timeout(5000),
      }).catch(() => null);
    }
    return NextResponse.json({ status: 'added', beat, added: result.added, vetted: result.vetted });
  } catch (e) {
    await db.from('jobs').update({ status: 'failed', error: e instanceof Error ? e.message.slice(0, 300) : String(e), finished_at: new Date().toISOString() }).eq('id', job!.id);
    throw e;
  }
});
