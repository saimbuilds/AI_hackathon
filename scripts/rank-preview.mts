// Show how a real reader's candidates rank (no paper is built): tsx --env-file=.env.local scripts/rank-preview.mts <name>
import { adminClient } from '../src/lib/supabase';
import { loadProfile, readerModel, loadCandidates } from '../src/edition/candidates';
import { score, mmr } from '../src/edition/rank';
const db = adminClient()!;
const { data } = await db.from('profiles').select('id').eq('name', process.argv[2] ?? 'Saim').limit(1);
const id = data![0].id;
const profile = (await loadProfile(db, id))!;
const reader = readerModel(profile);
const cands = await loadCandidates(db, id, profile, reader);
const picks = mmr(score(cands, reader), 14);
console.log(`${cands.length} candidates; top picks:`);
for (const p of picks) console.log(`${p.score.toFixed(2)} rel=${p.rel.toFixed(2)} topic=${p.topic.toFixed(2)} [${p.cand.topics.join(',')}] ${p.cand.headline.slice(0, 60)}`);
