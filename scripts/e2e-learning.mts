// Acceptance test for learning: "less like this" must visibly change the next build.
// Needs a running server (BASE, default http://localhost:3001). Cleans up its user.
import { createClient } from '@supabase/supabase-js';
import { adminClient } from '../src/lib/supabase';
import { EditionSchema, type Edition, type StorySlot } from '../src/types/edition';

const BASE = process.env.BASE ?? 'http://localhost:3001';
const admin = adminClient()!;
const email = `e2e-learn-${Date.now()}@example.com`;
const password = crypto.randomUUID();
const TARGET = process.env.TARGET_TOPIC ?? 'ai';

const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (error) throw error;
const userId = created.user.id;

const allSlots = (e: Edition): StorySlot[] => [e.lead, ...e.sections.flatMap((s) => s.slots), ...e.offYourBeat, ...e.briefs];
const share = (e: Edition) => { const s = allSlots(e); return { n: s.length, hit: s.filter((x) => x.topics.includes(TARGET)).length }; };

try {
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: session } = await anon.auth.signInWithPassword({ email, password });
  const token = session.session!.access_token;
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  const post = (path: string, body: unknown) => fetch(`${BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const readEdition = async (id: string) => {
    const { data } = await admin.from('editions').select('payload').eq('id', id).single();
    return EditionSchema.parse(data!.payload);
  };
  const build = async (rebuild: boolean) => {
    const res = await post('/api/edition/build', { rebuild });
    const text = await res.text();
    const done = text.split('\n').find((l) => l.includes('"step":"done"'));
    if (!done) throw new Error(`build failed: ${text.slice(0, 300)}`);
    return JSON.parse(done.slice(6)).editionId as string;
  };

  const complete = await post('/api/onboarding/complete', { name: 'Learner', tz: 'Asia/Karachi', interests: { chips: [TARGET], topics: [TARGET, 'f1', 'pakistan-economy'] } });
  if (!complete.ok) throw new Error(`complete failed ${complete.status}`);

  const ed1 = await readEdition(await build(false));
  const s1 = share(ed1);
  console.log(`edition 1: ${s1.hit}/${s1.n} stories on "${TARGET}"`);

  // The reader reads edition 1: loves nothing on the target topic, says "less like this" to all of it, likes the rest.
  type Ev = { editionId: string; storyId?: string; type: string; meta?: Record<string, unknown> };
  const events: Ev[] = allSlots(ed1).map((slot): Ev => slot.topics.includes(TARGET)
    ? { editionId: ed1.id, storyId: slot.storyId, type: 'less', meta: { reason: 'topic' } }
    : { editionId: ed1.id, storyId: slot.storyId, type: 'read_end' });
  events.push({ editionId: ed1.id, type: 'caught_up' });
  const ev = await post('/api/events', { events });
  console.log('events:', ev.status, await ev.json());

  const { data: prof } = await admin.from('profiles').select('topic_beta,streak').eq('id', userId).single();
  const beta = (prof!.topic_beta as Record<string, [number, number]>)[TARGET];
  console.log(`topic_beta[${TARGET}] = [${beta.map((x) => x.toFixed(2))}]  (mean ${(beta[0] / (beta[0] + beta[1])).toFixed(2)}), streak = ${prof!.streak}`);

  const ed2 = await readEdition(await build(true));
  const s2 = share(ed2);
  const overlap = allSlots(ed2).filter((x) => allSlots(ed1).some((y) => y.storyId === x.storyId)).length;
  console.log(`edition 2: ${s2.hit}/${s2.n} stories on "${TARGET}"; ${overlap} repeated stories`);
  console.log(`share on "${TARGET}": ${(100 * s1.hit / s1.n).toFixed(0)}% -> ${(100 * s2.hit / s2.n).toFixed(0)}%`);
  if (!(s2.hit / s2.n < s1.hit / s1.n) && s1.hit > 0) throw new Error('learning did not change the next build');
  if (overlap > 0) throw new Error('edition 2 repeated stories the reader already saw');
  console.log('PASS: "less like this" visibly changed the next build');
} finally {
  await admin.auth.admin.deleteUser(userId);
  console.log('cleaned up user');
}
