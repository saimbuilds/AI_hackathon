// Source scout. `pnpm scout --beat="formula e" [--skip-scout]`
//   default      find, vet and add sources for the beat, then read just those sources into stories
//   --skip-scout only read the sources already scouted for the beat (used when the web app already scouted)
import { runScout, normalizeBeat } from '../src/scout/scout';
import { runPress } from '../src/press/run';
import { runEnrich } from '../src/press/enrich';

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');

async function main() {
  const beat = normalizeBeat(arg('beat') ?? '');
  if (!beat) throw new Error('Pass --beat="<topic>"');
  if (!process.argv.includes('--skip-scout')) await runScout(beat);
  await runPress({ onlyBeat: beat, extractMax: 60 });
  await runEnrich({ max: 40, perCategory: 40 });
}

main().then(
  () => { process.exitCode = 0; },
  (e) => { console.error(e); process.exitCode = 1; },
);
