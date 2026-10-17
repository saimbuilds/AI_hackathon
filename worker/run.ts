// Entry point for the press. `pnpm press` locally, GitHub Actions in CI.
// Stages: ingest -> cluster -> write-once enrichment (+ fact-check) -> Daily 3.
import { runPress } from '../src/press/run';
import { runEnrich } from '../src/press/enrich';
import { runDaily3 } from '../src/press/daily3';
import { ensureTopicVectors } from '../src/press/topics';
import { adminClient } from '../src/lib/supabase';
import { matchWatches } from '../src/follow/watch';

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const flag = (name: string) => process.argv.includes(`--${name}`);

async function main() {
  const dry = flag('dry');
  const press = flag('skip-press') ? { runId: undefined } : await runPress({
    dry,
    onlyBeat: arg('only-beat'),
    maxAgeHours: arg('max-age-hours') ? Number(arg('max-age-hours')) : undefined,
    sources: arg('sources') ? Number(arg('sources')) : undefined,
    extract: !flag('no-extract'),
    extractMax: arg('extract-max') ? Number(arg('extract-max')) : undefined,
  });
  if (dry || flag('no-enrich')) return;

  const seeded = await ensureTopicVectors();
  if (seeded) console.log(`topic vectors seeded: ${seeded}`);

  const enrich = await runEnrich({ max: arg('enrich-max') ? Number(arg('enrich-max')) : undefined, sinceHours: arg('enrich-since-hours') ? Number(arg('enrich-since-hours')) : undefined, perCategory: arg('per-category') ? Number(arg('per-category')) : undefined, concurrency: arg('enrich-concurrency') ? Number(arg('enrich-concurrency')) : undefined });
  const daily = await runDaily3();
  // Follow & Ask: new stories -> "Since you asked" updates for the next paper.
  const db0 = adminClient();
  const follows = db0 ? await matchWatches(db0) : null;
  if (follows) console.log(`follows: ${follows.checked} checked, ${follows.updated} updated${follows.noLlm ? `, ${follows.noLlm} waiting for a model` : ''}`);

  // Grounding rate and LLM usage land on the press_runs row, which /newsroom reads.
  const db = adminClient();
  if (db && press.runId) {
    const { data } = await db.from('press_runs').select('stats').eq('id', press.runId).single();
    await db.from('press_runs').update({ stats: { ...(data?.stats ?? {}), enrich, daily3: daily, follows } }).eq('id', press.runId);
  }
}

main().then(
  () => { process.exitCode = 0; }, // let sockets close; process.exit() can assert-crash on Windows
  (e) => { console.error(e); process.exitCode = 1; },
);
