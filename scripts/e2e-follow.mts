// HTTP e2e for Follow & Ask against a running server (BASE, default http://localhost:3001).
// Anonymous sign-in (must be enabled in Supabase) -> ask -> follow story -> follow question -> 402 at the 4th
// -> list -> unfollow -> security headers. The throwaway user is deleted at the end.
import { createClient } from '@supabase/supabase-js';
import { adminClient } from '../src/lib/supabase';

const BASE = process.env.BASE ?? 'http://localhost:3001';
const admin = adminClient()!;
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const { data: s, error } = await anon.auth.signInAnonymously();
if (error) throw new Error(`anonymous sign-in failed (is it enabled in Supabase?): ${error.message}`);
const userId = s.user!.id;
console.log('anonymous sign-in: ok');
const headers = { authorization: `Bearer ${s.session!.access_token}`, 'content-type': 'application/json' };
const call = async (path: string, init: RequestInit = {}) => {
  const t = Date.now();
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...headers, ...init.headers } });
  const body = await res.json().catch(() => null);
  return { status: res.status, body, ms: Date.now() - t, res };
};

try {
  const noAuth = await fetch(`${BASE}/api/ask`, { method: 'POST', body: '{"question":"hi there"}' });
  console.log(`no token: HTTP ${noAuth.status}`);
  const bad = await call('/api/ask', { method: 'POST', body: JSON.stringify({ question: 'x' }) });
  console.log(`bad input: HTTP ${bad.status}`);

  const ask = await call('/api/ask', { method: 'POST', body: JSON.stringify({ question: 'What is happening with gold prices in Pakistan?', follow: true }) });
  console.log(`ask+follow: HTTP ${ask.status} in ${ask.ms}ms covered=${ask.body.covered} watchId=${!!ask.body.watchId} sources=${ask.body.sources.length}\n  ${ask.body.answer}`);

  const { data: st } = await admin.from('stories').select('id,headline').not('enriched_at', 'is', null).eq('printable', true).order('importance', { ascending: false }).limit(1).single();
  const fs = await call('/api/follow', { method: 'POST', body: JSON.stringify({ storyId: st!.id }) });
  console.log(`follow story: HTTP ${fs.status} ${fs.body.kind} "${fs.body.question}"`);
  const again = await call('/api/follow', { method: 'POST', body: JSON.stringify({ storyId: st!.id }) });
  console.log(`follow same story again: HTTP ${again.status} same=${again.body.watchId === fs.body.watchId}`);
  const fq = await call('/api/follow', { method: 'POST', body: JSON.stringify({ question: 'Will fuel prices in Pakistan go up?' }) });
  console.log(`follow question: HTTP ${fq.status} covered=${fq.body.covered}`);
  const over = await call('/api/follow', { method: 'POST', body: JSON.stringify({ question: 'What is the latest on the IMF and Pakistan?' }) });
  console.log(`4th follow: HTTP ${over.status} ${JSON.stringify(over.body)}`);

  const list = await call('/api/follows');
  console.log(`follows: HTTP ${list.status} n=${list.body.follows.length} plan=${list.body.plan} limit=${list.body.limit}`);

  // RLS: the reader sees their own watches directly, and cannot set their plan.
  const authed = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { headers: { authorization: headers.authorization } } });
  const { data: own } = await authed.from('watches').select('id');
  const { error: planErr } = await authed.from('profiles').update({ plan: 'plus' }).eq('id', userId);
  const { error: extrasErr } = await authed.from('profiles').update({ extras: { human: true } }).eq('id', userId);
  console.log(`RLS own watches: ${own?.length}; self-upgrade blocked: ${!!planErr}; extras write blocked: ${!!extrasErr}`);

  const del = await call(`/api/follow/${fs.body.watchId}`, { method: 'DELETE' });
  const list2 = await call('/api/follows');
  console.log(`unfollow: HTTP ${del.status}; follows now ${list2.body.follows.length}`);

  const h = ask.res.headers;
  console.log(`headers: csp=${!!h.get('content-security-policy')} hsts=${!!h.get('strict-transport-security')} referrer=${h.get('referrer-policy')} permissions=${h.get('permissions-policy')}`);
} finally {
  await admin.auth.admin.deleteUser(userId);
}
