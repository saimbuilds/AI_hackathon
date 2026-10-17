// Learning Lab: simulated readers prove the paper gets better. `pnpm lab`
import { runLab } from '../src/lab/run';

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];

runLab({
  judge: (arg('judge') as 'auto' | 'llm' | 'keywords' | undefined) ?? 'auto',
  save: !process.argv.includes('--no-save'),
  config: { ...(arg('days') ? { days: Number(arg('days')) } : {}), ...(arg('size') ? { editionSize: Number(arg('size')) } : {}), ...(arg('seed') ? { seed: Number(arg('seed')) } : {}) },
}).then(
  () => { process.exitCode = 0; },
  (e) => { console.error(e); process.exitCode = 1; },
);
