// HTTP end-to-end against a running server (default http://localhost:3001) with a real Supabase session.
// Flow a new reader takes: deck -> parse -> complete -> build (SSE) -> read the edition via RLS -> reprint.
import { createClient } from '@supabase/supabase-js';
import { adminClient } from '../src/lib/supabase';
import { EditionSchema } from '../src/types/edition';

const BASE = process.env.BASE ?? 'http://localhost:3001';
const admin = adminClient()!;
const email = `e2e-http-${Date.now()}@example.com`;
const password = crypto.randomUUID();

const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (error) throw error;
const userId = created.user.id;

try {
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: session, error: sErr } = await anon.auth.signInWithPassword({ email, password });
  if (sErr) throw sErr;
  const auth = { authorization: `Bearer ${session.session!.access_token}`, 'content-type': 'application/json' };
  const call = async (path: string, init: RequestInit = {}) => {
    const t = Date.now();
    const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...auth, ...init.headers } });
    return { res, ms: Date.now() - t };
  };

  // 1. deck
  const deck = await call('/api/onboarding/deck?n=12');
  const { cards } = (await deck.res.json()) as { cards: { storyId: string; headline: string }[] };
  console.log(`deck: HTTP ${deck.res.status}, ${cards.length} cards in ${deck.ms}ms`);

  // 2. parse (heuristic when LLM_DISABLED=1)
  const parse = await call('/api/onboarding/parse', { method: 'POST', body: JSON.stringify({ text: "CS grad, into AI startups, F1 and Pakistan's economy. Skip celebrity gossip." }) });
  const parsed = (await parse.res.json()) as { parsed: { topics: string[]; negativeTopics: string[]; interests: string[]; negatives: string[] }; source: string };
  console.log(`parse: HTTP ${parse.res.status} (${parsed.source}) topics=${parsed.parsed.topics} neg=${parsed.parsed.negativeTopics} in ${parse.ms}ms`);

  // 3. complete (swipe right on 4, left on 2)
  const swipes = cards.slice(0, 6).map((c, i) => ({ storyId: c.storyId, action: i < 3 ? 'yes' : i === 3 ? 'love' : 'no' }));
  const complete = await call('/api/onboarding/complete', {
    method: 'POST',
    body: JSON.stringify({ name: 'Saim', city: 'Islamabad', tz: 'Asia/Karachi', size: 'standard', tone: 'straight', role: 'CS grad', interests: { chips: parsed.parsed.interests, topics: parsed.parsed.topics, negatives: parsed.parsed.negatives, negativeTopics: parsed.parsed.negativeTopics }, swipes }),
  });
  console.log(`complete: HTTP ${complete.res.status}`, await complete.res.json(), `${complete.ms}ms`);

  // 4. build over SSE
  const t0 = Date.now();
  const build = await fetch(`${BASE}/api/edition/build`, { method: 'POST', headers: auth, body: JSON.stringify({}) });
  console.log(`build: HTTP ${build.status} ${build.headers.get('content-type')}`);
  const events: { step: string; editionId?: string; message?: string }[] = [];
  const reader = build.body!.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    for (const block of buf.split('\n\n').slice(0, -1)) {
      const line = block.split('\n').find((l) => l.startsWith('data: '));
      if (line) events.push(JSON.parse(line.slice(6)));
    }
    buf = buf.slice(buf.lastIndexOf('\n\n') + 2);
  }
  console.log(`stream: ${events.map((e) => e.step).join(' > ')} in ${Date.now() - t0}ms`);
  const last = events.at(-1)!;
  if (last.step !== 'done') throw new Error(`build failed: ${JSON.stringify(last)}`);

  // 5. the reader reads their own edition through RLS with their own token
  const userDb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { headers: { authorization: `Bearer ${session.session!.access_token}` } } });
  const { data: row, error: rErr } = await userDb.from('editions').select('id,payload').eq('id', last.editionId!).single();
  if (rErr) throw rErr;
  const ed = EditionSchema.parse(row.payload);
  console.log(`RLS read ok: "${ed.lead.headline.slice(0, 70)}" + ${ed.sections.reduce((n, s) => n + s.slots.length, 0)} section stories, fallback=${ed.meta.fallback}`);
  const { data: others } = await userDb.from('editions').select('id').neq('user_id', userId);
  console.log('RLS: rows visible from other users =', others?.length ?? 0);

  // 6. reprint same day without rebuild -> instant, no queue
  const t1 = Date.now();
  const again = await fetch(`${BASE}/api/edition/build`, { method: 'POST', headers: auth, body: JSON.stringify({}) });
  const txt = await again.text();
  console.log(`reprint: ${txt.trim().replace(/\n+/g, ' | ')} in ${Date.now() - t1}ms`);

  // 7. input validation + auth edges
  const bad = await call('/api/onboarding/parse', { method: 'POST', body: JSON.stringify({ text: '' }) });
  console.log('validation: empty text ->', bad.res.status, JSON.stringify(await bad.res.json()).slice(0, 120));
  const noAuth = await fetch(`${BASE}/api/edition/build`, { method: 'POST', body: '{}' });
  console.log('no token ->', noAuth.status);
} finally {
  await admin.auth.admin.deleteUser(userId);
  console.log('cleaned up user');
}
