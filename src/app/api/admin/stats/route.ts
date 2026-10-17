import { NextResponse } from 'next/server';
import { fail, isAdmin, route } from '@/lib/http';
import { budgetStatus } from '@/lib/llm';
import { adminClient } from '@/lib/supabase';

export const maxDuration = 30;

// GET /api/admin/stats   header: x-admin-key: $ADMIN_KEY
// Everything the /newsroom page and the launch desk need on one screen: users, editions, queue depth,
// last press run (grounding rate!), LLM usage by provider, budget headroom, errors, latest feedback.
export const GET = route(async (req) => {
  if (!isAdmin(req)) return fail(401, 'Admin key required');
  const db = adminClient()!;
  const dayAgo = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const head = (t: string) => db.from(t).select('id', { count: 'exact', head: true });

  const [users, onboarded, editions, editionsToday, queued, running, failedJobs, feedbackOpen, press, jobs, feedback, usage, budget] = await Promise.all([
    head('profiles'),
    head('profiles').not('onboarded_at', 'is', null),
    head('editions'),
    head('editions').gte('created_at', dayAgo),
    head('jobs').eq('kind', 'edition').eq('status', 'queued'),
    head('jobs').eq('kind', 'edition').eq('status', 'running'),
    head('jobs').eq('status', 'failed').gte('created_at', dayAgo),
    head('feedback').eq('status', 'open'),
    db.from('press_runs').select('id,started_at,finished_at,stats,errors').order('started_at', { ascending: false }).limit(5),
    db.from('jobs').select('id,kind,status,error,created_at,started_at,finished_at').order('created_at', { ascending: false }).limit(15),
    db.from('feedback').select('id,kind,message,status,created_at,story_id').order('created_at', { ascending: false }).limit(15),
    db.from('llm_usage').select('provider,model,task,ok,tokens_in,tokens_out,cost_usd,latency_ms,error').gte('created_at', dayAgo).limit(5000),
    budgetStatus(),
  ]);

  const byProvider: Record<string, { calls: number; failures: number; tokens: number; costUsd: number; p50ms: number }> = {};
  const lat: Record<string, number[]> = {};
  for (const u of usage.data ?? []) {
    const p = (byProvider[u.provider] ??= { calls: 0, failures: 0, tokens: 0, costUsd: 0, p50ms: 0 });
    p.calls += 1;
    if (!u.ok) p.failures += 1;
    p.tokens += (u.tokens_in ?? 0) + (u.tokens_out ?? 0);
    p.costUsd += Number(u.cost_usd ?? 0);
    if (u.latency_ms) (lat[u.provider] ??= []).push(u.latency_ms);
  }
  for (const [prov, xs] of Object.entries(lat)) byProvider[prov].p50ms = xs.sort((a, b) => a - b)[xs.length >> 1];

  const lastRun = press.data?.[0];
  return NextResponse.json({
    readers: { total: users.count ?? 0, onboarded: onboarded.count ?? 0 },
    editions: { total: editions.count ?? 0, last24h: editionsToday.count ?? 0 },
    queue: { queued: queued.count ?? 0, running: running.count ?? 0, failedLast24h: failedJobs.count ?? 0 },
    press: { last: lastRun ?? null, ageMinutes: lastRun ? Math.round((Date.now() - Date.parse(lastRun.started_at)) / 60_000) : null, recent: press.data ?? [] },
    llm: { last24h: byProvider, budget },
    jobs: jobs.data ?? [],
    feedback: { open: feedbackOpen.count ?? 0, latest: feedback.data ?? [] },
  });
});
