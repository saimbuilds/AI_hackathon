// Real Ask against the live press (no HTTP): node --env-file. `tsx --env-file=.env.local scripts/e2e-ask.mts "question"`
import { answerQuestion } from '../src/follow/ask';
import { adminClient } from '../src/lib/supabase';

const db = adminClient()!;
const qs = process.argv.slice(2).length ? process.argv.slice(2) : ['What do new cars cost in Pakistan?', 'What is happening with gold prices in Pakistan?', 'Who won the 1966 World Cup?'];
for (const q of qs) {
  const t = Date.now();
  const a = await answerQuestion(db, q);
  console.log(`\nQ: ${q}  (${Date.now() - t} ms, model ${a.model}, covered=${a.covered}, keywords: ${a.keywords.join(', ')})`);
  console.log(`A: ${a.answer}`);
  for (const [i, s] of a.sources.entries()) console.log(`   [${i + 1}] ${s.headline} — ${s.name} ${s.url}`);
}
