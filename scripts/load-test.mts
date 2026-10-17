// Launch load test: N readers onboard and build their first edition at the same moment.
// Pass criteria (LAUNCH.md §1.11): every build succeeds and the queue drains in under 2 minutes.
// Usage: BASE=https://your-app.vercel.app pnpm tsx --env-file=.env.local scripts/load-test.mts [N=30]
import { createClient } from '@supabase/supabase-js';
import { adminClient } from '../src/lib/supabase';

const BASE = process.env.BASE ?? 'http://localhost:3001';
const N = Number(process.argv[2] ?? 30);
const DEADLINE_MS = 120_000;
const admin = adminClient()!;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type Result = { i: number; ok: boolean; ms: number; maxQueue: number; fallback?: boolean; error?: string };
const userIds: string[] = [];

async function reader(i: number): Promise<Result> {
  const t0 = Date.now();
  let maxQueue = 0;
  try {
    const email = `load-${Date.now()}-${i}@example.com`;
    const password = crypto.randomUUID();
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    userIds.push(data.user.id);
    const { data: s, error: sErr } = await createClient(url, anonKey).auth.signInWithPassword({ email, password });
    if (sErr) throw sErr;
    const headers = { authorization: `Bearer ${s.session!.access_token}`, 'content-type': 'application/json' };
    const call = (path: string, init: RequestInit = {}) => fetch(`${BASE}${path}`, { ...init, headers: { ...headers, ...init.headers } });

    const deck = await (await call('/api/onboarding/deck')).json();
    const topics = [['ai', 'startups'], ['f1', 'cricket'], ['pakistan-economy', 'markets'], ['climate', 'science'], ['football', 'movies'], ['middle-east', 'geopolitics']][i % 6];
    const swipes = (deck.cards ?? []).slice(0, 8).map((c: { storyId: string }, k: number) => ({ storyId: c.storyId, action: k % 3 === 0 ? 'love' : k % 3 === 1 ? 'yes' : 'no' }));
    const done = await call('/api/onboarding/complete', { method: 'POST', body: JSON.stringify({ name: `Load${i}`, tz: 'Asia/Karachi', interests: { chips: topics, topics }, swipes }) });
    if (!done.ok) throw new Error(`complete ${done.status}`);

    const res = await call('/api/edition/build', { method: 'POST', body: '{}' });
    if (!res.ok) throw new Error(`build HTTP ${res.status}`);
    const text = await res.text();
    const events = text.split('\n\n').flatMap((b) => { const l = b.split('\n').find((x) => x.startsWith('data: ')); return l ? [JSON.parse(l.slice(6))] : []; });
    for (const e of events) if (e.step === 'queued') maxQueue = Math.max(maxQueue, e.position);
    const last = events.at(-1);
    if (last?.step !== 'done') throw new Error(`build ended with ${JSON.stringify(last)}`);
    const { data: ed } = await admin.from('editions').select('payload').eq('id', last.editionId).single();
    return { i, ok: true, ms: Date.now() - t0, maxQueue, fallback: (ed?.payload as { meta?: { fallback?: boolean } })?.meta?.fallback };
  } catch (e) {
    return { i, ok: false, ms: Date.now() - t0, maxQueue, error: e instanceof Error ? e.message : String(e) };
  }
}

console.log(`load test: ${N} readers against ${BASE}`);
const started = Date.now();
const results = await Promise.all(Array.from({ length: N }, (_, i) => reader(i)));
const total = Date.now() - started;

const ok = results.filter((r) => r.ok);
const times = ok.map((r) => r.ms).sort((a, b) => a - b);
const q = (p: number) => times[Math.min(times.length - 1, Math.floor(times.length * p))] ?? 0;
console.log(`\n${ok.length}/${N} succeeded in ${(total / 1000).toFixed(1)}s total`);
console.log(`per-reader time (onboard + build): p50 ${(q(0.5) / 1000).toFixed(1)}s  p90 ${(q(0.9) / 1000).toFixed(1)}s  max ${(q(1) / 1000).toFixed(1)}s`);
console.log(`deepest queue position seen: ${Math.max(0, ...results.map((r) => r.maxQueue))}; fallback editions: ${ok.filter((r) => r.fallback).length}`);
for (const r of results.filter((x) => !x.ok)) console.log(`  FAIL reader ${r.i}: ${r.error}`);

for (const id of userIds) await admin.auth.admin.deleteUser(id);
console.log(`cleaned up ${userIds.length} users`);

if (ok.length < N) { console.log('RESULT: FAIL (errors)'); process.exitCode = 1; }
else if (total > DEADLINE_MS) { console.log(`RESULT: FAIL (queue drained in ${(total / 1000).toFixed(0)}s, limit ${DEADLINE_MS / 1000}s)`); process.exitCode = 1; }
else console.log(`RESULT: PASS (queue drained in ${(total / 1000).toFixed(0)}s)`);
