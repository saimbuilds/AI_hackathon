// Hourly email delivery. `pnpm email` locally, GitHub Actions in CI.
//   pnpm email                         send to every reader whose delivery time has arrived
//   pnpm email --force                 send to every opted-in reader now (e.g. trigger once on camera)
//   pnpm email --user=<uuid> --to=<addr> --force   send one reader's paper to any address
import { deliverDue } from '../src/email/deliver';

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];

deliverDue({ force: process.argv.includes('--force'), onlyUser: arg('user'), toOverride: arg('to'), limit: arg('limit') ? Number(arg('limit')) : undefined }).then(
  () => { process.exitCode = 0; },
  (e) => { console.error(e); process.exitCode = 1; },
);
