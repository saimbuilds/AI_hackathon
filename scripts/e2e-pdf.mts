// PDF end-to-end with a STAND-IN print page (the real one is the frontend's /print/[id]).
// Needs the dev server started with PRINT_BASE_URL=http://localhost:4010 and a local Chrome.
//   PRINT_BASE_URL=http://localhost:4010 pnpm dev -p 3001   then   pnpm tsx --env-file=.env.local scripts/e2e-pdf.mts
import { createServer } from 'node:http';
import { createClient } from '@supabase/supabase-js';
import { adminClient } from '../src/lib/supabase';
import { EditionSchema } from '../src/types/edition';

const BASE = process.env.BASE ?? 'http://localhost:3001';
const admin = adminClient()!;
let hits = 0;

// Stand-in print page: fetches the edition through the print-token endpoint, like the real page must.
const stub = createServer(async (req, res) => {
  const u = new URL(req.url!, 'http://x');
  const m = u.pathname.match(/^\/print\/([0-9a-f-]{36})$/);
  if (!m) { res.writeHead(404).end(); return; }
  hits++;
  const r = await fetch(`${BASE}/api/print/${m[1]}?pt=${u.searchParams.get('pt')}`);
  if (!r.ok) { res.writeHead(403).end(`print token rejected: ${r.status}`); return; }
  const e = EditionSchema.parse(await r.json());
  const slot = (s: typeof e.lead) => `<article><h2>${s.headline}</h2><p><i>${s.dek}</i></p>${s.body.map((b) => `<p>${b.text}</p>`).join('')}</article>`;
  const all = [e.lead, ...e.sections.flatMap((s) => s.slots), ...e.briefs];
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(`<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:12mm}body{font-family:Georgia,serif}h1{font-size:44px;text-align:center;border-bottom:3px double #000}.cols{column-count:3;column-gap:8mm}article{break-inside:avoid;margin-bottom:6mm}</style></head><body><h1>${e.paperName}</h1><p style="text-align:center">${e.city} Edition · No. ${e.number} · ${e.date}</p><div class="cols">${all.map(slot).join('')}</div><script>document.fonts.ready.then(()=>document.documentElement.dataset.printReady='true')</script></body></html>`);
});
await new Promise<void>((r) => stub.listen(4010, r));

const email = `e2e-pdf-${Date.now()}@example.com`;
const password = crypto.randomUUID();
const { data: u, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (error) throw error;
const other = await admin.auth.admin.createUser({ email: `e2e-pdf2-${Date.now()}@example.com`, password, email_confirm: true });
try {
  const { data: s } = await createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!).auth.signInWithPassword({ email, password });
  const token = s.session!.access_token;
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  await fetch(`${BASE}/api/onboarding/complete`, { method: 'POST', headers, body: JSON.stringify({ name: 'Saim', tz: 'Asia/Karachi', city: 'Islamabad', interests: { chips: ['AI'], topics: ['ai', 'f1'] } }) });
  const built = await (await fetch(`${BASE}/api/edition/build`, { method: 'POST', headers, body: '{}' })).text();
  const editionId = built.match(/"editionId":"([^"]+)"/)![1];

  let t = Date.now();
  const r1 = await fetch(`${BASE}/api/pdf/${editionId}`, { headers });
  const b1 = Buffer.from(await r1.arrayBuffer());
  console.log(`first request : HTTP ${r1.status} ${r1.headers.get('content-type')} ${b1.length} bytes in ${Date.now() - t}ms | disposition: ${r1.headers.get('content-disposition')}`);
  console.log('  starts with %PDF:', b1.subarray(0, 4).toString() === '%PDF', '| pages ~', (b1.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length, '| stand-in print page hit', hits, 'time(s)');
  if (r1.status !== 200) console.log('  body:', b1.toString().slice(0, 300));

  t = Date.now();
  const r2 = await fetch(`${BASE}/api/pdf/${editionId}?access_token=${token}`); // plain <a href> style, no header
  const b2 = Buffer.from(await r2.arrayBuffer());
  console.log(`second request: HTTP ${r2.status} ${b2.length} bytes in ${Date.now() - t}ms (cached: print page hits still ${hits}) via ?access_token=`);

  const { data: row } = await admin.from('editions').select('pdf_path').eq('id', editionId).single();
  console.log('editions.pdf_path =', row!.pdf_path);

  // Print token endpoint: bad / missing token is refused, and a stranger cannot download someone else's PDF.
  console.log('print endpoint without token ->', (await fetch(`${BASE}/api/print/${editionId}`)).status, '| bad token ->', (await fetch(`${BASE}/api/print/${editionId}?pt=1.abc`)).status);
  const { data: os } = await createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!).auth.signInWithPassword({ email: other.data.user!.email!, password });
  console.log("stranger downloading someone else's PDF ->", (await fetch(`${BASE}/api/pdf/${editionId}`, { headers: { authorization: `Bearer ${os.session!.access_token}` } })).status, '| no auth ->', (await fetch(`${BASE}/api/pdf/${editionId}`)).status);
  if (r1.status === 200 && b1.subarray(0, 4).toString() === '%PDF' && r2.status === 200) console.log('PASS');
} finally {
  stub.close();
  await admin.auth.admin.deleteUser(u.user.id);
  if (other.data.user) await admin.auth.admin.deleteUser(other.data.user.id);
  console.log('cleaned up');
}
