// End-to-end: throwaway user -> cold-start profile -> real edition built from today's database.
// Run: LLM_DISABLED=1 pnpm tsx --env-file=.env.local scripts/e2e-edition.mts   (omit LLM_DISABLED to use the editor)
import { adminClient } from '../src/lib/supabase';
import { coldStart } from '../src/lib/profile';
import { fromPg, toPg } from '../src/lib/vec';
import { buildEdition } from '../src/edition/build';
import { EditionSchema } from '../src/types/edition';

const db = adminClient()!;
const keep = process.argv.includes('--keep');
const topics = ['ai', 'startups', 'f1', 'pakistan-economy', 'cricket'];
const negativeTopics = ['celebrity'];

const { data: created, error } = await db.auth.admin.createUser({ email: `e2e-${Date.now()}@example.com`, password: crypto.randomUUID(), email_confirm: true });
if (error) throw error;
const userId = created.user.id;
console.log('user', userId);

try {
  const { data: tv } = await db.from('topic_vectors').select('topic,embedding').in('topic', [...topics, ...negativeTopics]);
  const vecs = new Map((tv ?? []).map((r) => [r.topic as string, fromPg(r.embedding as string)]));
  const { vec, topicBeta } = coldStart({
    topics: topics.map((slug) => ({ slug, vec: vecs.get(slug)! })),
    negativeTopics: negativeTopics.map((slug) => ({ slug, vec: vecs.get(slug)! })),
    swipes: [],
  });
  const { error: upErr } = await db.from('profiles').update({
    name: 'Saim', paper_name: 'The Saim Times', city: 'Islamabad', tz: 'Asia/Karachi', size: 'standard', tone: 'straight', role: 'CS grad', goals: 'stay sharp on AI and Pakistan',
    interests: { chips: ['AI startups', 'F1', "Pakistan's economy"], topics, entities: [], negatives: ['celebrity gossip'], negativeTopics },
    topic_beta: topicBeta, muted: { topics: negativeTopics, sources: [], stories: [] }, vec_long: toPg(vec!), vec_short: toPg(vec!), onboarded_at: new Date().toISOString(),
  }).eq('id', userId);
  if (upErr) throw upErr;

  const steps: string[] = [];
  const t0 = Date.now();
  const result = await buildEdition(userId, { onProgress: (p) => steps.push(`${p.step}@${Date.now() - t0}ms`) });
  console.log('built', result, '\nprogress:', steps.join(' > '));

  const { data: row } = await db.from('editions').select('payload,stats').eq('id', result.editionId).single();
  const ed = EditionSchema.parse(row!.payload);
  const slotLine = (s: { size: string; kicker: string; headline: string; whyThis: string; trust: { label: string; outlets: number }; body: unknown[] }) =>
    `  [${s.size}] ${s.kicker} | ${s.headline.slice(0, 80)}\n         why: ${s.whyThis.slice(0, 110)} | ${s.trust.label} ${s.trust.outlets} | ${s.body.length} sentences`;
  console.log(`\n${ed.paperName} · ${ed.city} Edition · No. ${ed.number} · ${ed.date}  (fallback=${ed.meta.fallback})`);
  console.log('weather:', ed.weather, '| onThisDay:', ed.extras.onThisDay?.slice(0, 70));
  console.log('\nNOTE:', ed.editorNote);
  console.log('\nLEAD\n' + slotLine(ed.lead));
  for (const s of ed.sections) { console.log(`SECTION ${s.name}`); s.slots.forEach((x) => console.log(slotLine(x))); }
  console.log('OFF YOUR BEAT'); ed.offYourBeat.forEach((x) => console.log(slotLine(x)));
  console.log('BRIEFS'); ed.briefs.forEach((x) => console.log(slotLine(x)));
  console.log("EVERYONE'S FRONT PAGE"); ed.everyonesFrontPage.forEach((x) => console.log(slotLine(x)));
  console.log('\nthreeThings:', ed.threeThings.map((t) => t.slice(0, 70)));
  console.log('quiz:', ed.quiz.length, '| dailyThree:', ed.dailyThree.length, '| tomorrow:', ed.tomorrow.length);
  console.log('stats:', JSON.stringify(row!.stats).slice(0, 300));

  const again = await buildEdition(userId);
  console.log('\nsecond build same day reused:', again.reused, again.editionId === result.editionId);
} finally {
  if (!keep) { await db.auth.admin.deleteUser(userId); console.log('\ncleaned up user'); }
}
