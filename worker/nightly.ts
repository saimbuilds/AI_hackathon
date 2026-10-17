// Nightly maintenance: decay fast signals, refresh reader memos. `pnpm nightly` / GitHub Actions.
import { runNightly } from '../src/learning/nightly';

runNightly().then(
  () => { process.exitCode = 0; }, // let sockets close; process.exit() can assert-crash on Windows
  (e) => { console.error(e); process.exitCode = 1; },
);
