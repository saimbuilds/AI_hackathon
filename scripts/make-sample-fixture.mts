// Regenerates fixtures/edition.sample.json from REAL stories for a throwaway New York reader (global/US sample).
// tsx --env-file=.env.local scripts/make-sample-fixture.mts
import { writeFileSync } from 'node:fs';
import { adminClient } from '../src/lib/supabase';
import { coldStart } from '../src/lib/profile';
import { fromPg, toPg } from '../src/lib/vec';
import { buildEdition } from '../src/edition/build';
import { EditionSchema } from '../src/types/edition';

const db = adminClient()!;
const topics = ['us-politics', 'ai', 'markets', 'basketball', 'consumer-tech', 'startups', 'global-economy'];
const { data: u } = await db.auth.admin.createUser({ email: `sample-${Date.now()}@example.com`, password: crypto.randomUUID(), email_confirm: true });
const userId = u.user!.id;
try {
  const { data: tv } = await db.from('topic_vectors').select('topic,embedding').in('topic', topics);
  const vecs = new Map((tv ?? []).map((r) => [r.topic as string, fromPg(r.embedding as string)]));
  const { vec, topicBeta } = coldStart({ topics: topics.map((slug) => ({ slug, vec: vecs.get(slug)! })), negativeTopics: [], swipes: [] });
  await db.from('profiles').update({
    name: 'Alex', paper_name: 'The Alex Times', city: 'New York', lat: 40.71, lon: -74.0, tz: 'America/New_York', size: 'standard', tone: 'straight',
    role: 'product manager', goals: 'stay sharp on tech, markets and the news without doomscrolling',
    interests: { chips: ['AI', 'US politics', 'Markets', 'NBA', 'Startups', 'Consumer tech'], topics, entities: [], negatives: [], negativeTopics: [] },
    topic_beta: Object.fromEntries(Object.entries(topicBeta).map(([k, [a, b]]) => [k, [a + 1, b]])), vec_long: toPg(vec!), vec_short: toPg(vec!), onboarded_at: new Date().toISOString(),
    extras: { weather: true, markets: true, onThisDay: true },
  }).eq('id', userId);
  const r = await buildEdition(userId);
  const { data } = await db.from('editions').select('payload').eq('id', r.editionId).single();
  const ed = EditionSchema.parse(data!.payload);
  const sample = {
    ...ed,
    updates: [{ watchId: crypto.randomUUID(), question: 'What does the AI safety bill propose?', summary: ed.lead.body[0]?.text.slice(0, 160) ?? 'New figures changed the picture.', sources: ed.lead.sources.slice(0, 1), storyId: ed.lead.storyId }],
  };
  writeFileSync('fixtures/edition.sample.json', JSON.stringify(sample, null, 2) + '\n');
  console.log('fallback', ed.meta.fallback, '| slots', [ed.lead, ...ed.sections.flatMap((s) => s.slots), ...ed.offYourBeat, ...ed.briefs].length, '|', ed.paperName, '|', ed.lead.headline);
  console.log('sections:', ed.sections.map((s) => s.name).join(' / '));
  console.log('note:', ed.editorNote);
} finally { await db.auth.admin.deleteUser(userId); }
