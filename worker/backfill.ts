// Give an account a real archive. `pnpm backfill --email=you@x.com [--days=7] [--ingest] [--enrich]`
//   --ingest   first read the feeds with a wide window (default 8 days) so older stories exist
//   --enrich   write up the older stories (LLM when keys exist, verbatim fallback otherwise)
// then build one edition per past day, as of 07:00 local that morning.
import { adminClient } from '../src/lib/supabase';
import { backfillEditions } from '../src/edition/backfill';
import { runPress } from '../src/press/run';
import { runEnrich } from '../src/press/enrich';
import { ensureTopicVectors } from '../src/press/topics';

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const flag = (name: string) => process.argv.includes(`--${name}`);

async function main() {
  const db = adminClient();
  if (!db) throw new Error('Supabase env missing');
  const days = Number(arg('days') ?? 7);

  let userId = arg('user');
  if (!userId && arg('email')) {
    const { data } = await db.from('profiles').select('id').eq('email', arg('email')!).maybeSingle();
    userId = data?.id;
  }
  if (!userId) throw new Error('Pass --user=<uuid> or --email=<address> (the account that should get the archive)');

  if (flag('ingest')) await runPress({ maxAgeHours: (days + 1) * 24, extractMax: 400 });
  if (flag('enrich')) {
    await ensureTopicVectors();
    await runEnrich({ max: 700, perCategory: 45, sinceHours: (days + 1) * 24 + 12 });
  }
  const out = await backfillEditions(userId, { days });
  console.log('backfill done:', out);
}

main().then(
  () => { process.exitCode = 0; },
  (e) => { console.error(e); process.exitCode = 1; },
);
