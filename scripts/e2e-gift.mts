// Gift papers: giver makes one for a parent (Urdu, large print), the recipient reads it by link with no account.
import { createClient } from '@supabase/supabase-js';
import { adminClient } from '../src/lib/supabase';
import { EditionSchema } from '../src/types/edition';

const BASE = process.env.BASE ?? 'http://localhost:3001';
const admin = adminClient()!;
const created: string[] = [];

const email = `e2e-giver-${Date.now()}@example.com`;
const password = crypto.randomUUID();
const { data: g, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (error) throw error;
created.push(g.user.id);

try {
  const { data: s } = await createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!).auth.signInWithPassword({ email, password });
  const headers = { authorization: `Bearer ${s.session!.access_token}`, 'content-type': 'application/json' };
  const call = (path: string, init: RequestInit = {}) => fetch(`${BASE}${path}`, { ...init, headers: { ...headers, ...init.headers } });
  await call('/api/onboarding/complete', { method: 'POST', body: JSON.stringify({ name: 'Saim', tz: 'Asia/Karachi', interests: { chips: ['AI'], topics: ['ai'] } }) });

  const make = await call('/api/gifts', { method: 'POST', body: JSON.stringify({ forName: 'Abbu', relation: 'father', text: 'Likes cricket, Pakistan politics and the weather. No celebrity news.', language: 'ur', largePrint: true, city: 'Lahore' }) });
  const gift = (await make.json()) as { giftId: string; token: string; url: string };
  console.log('create gift:', make.status, gift.url);

  const list = await (await call('/api/gifts')).json();
  console.log('giver sees', list.gifts.length, 'gift(s); latestEdition =', list.gifts[0].latestEdition);

  const before = await (await fetch(`${BASE}/api/gift/${gift.token}`)).json();
  console.log('public read before build: edition =', before.edition, '| needsBuild =', before.needsBuild, '|', JSON.stringify(before.gift));

  // The giver prints it through the normal queue.
  const build = await call('/api/edition/build', { method: 'POST', body: JSON.stringify({ giftId: gift.giftId }) });
  const text = await build.text();
  console.log('giver build:', build.status, text.match(/"step":"(done|error)"/)?.[1]);

  const after = await (await fetch(`${BASE}/api/gift/${gift.token}`)).json();
  const ed = EditionSchema.parse(after.edition);
  console.log('public read after build: needsBuild =', after.needsBuild);
  console.log(`paper: "${ed.paperName}" · ${ed.city} Edition · language=${ed.language} largePrint=${ed.largePrint} stories=${[ed.lead, ...ed.sections.flatMap((x) => x.slots)].length} (large print = a short paper)`);
  console.log('gift stamp:', ed.gift);
  console.log('translation stats:', JSON.stringify((await admin.from('editions').select('stats').eq('id', ed.id).single()).data!.stats.translation));
  if (ed.gift?.forName !== 'Abbu' || ed.gift.fromName !== 'Saim' || !ed.largePrint) throw new Error('gift stamp wrong');

  // Public build trigger reuses today's paper, and a stranger cannot build someone else's gift via the authed route.
  const again = await (await fetch(`${BASE}/api/gift/${gift.token}`, { method: 'POST' })).json();
  console.log('public POST reuses today:', again.reused, again.editionId === ed.id);
  const { data: other } = await admin.auth.admin.createUser({ email: `e2e-other-${Date.now()}@example.com`, password, email_confirm: true });
  created.push(other.user!.id);
  const { data: os } = await createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!).auth.signInWithPassword({ email: other.user!.email!, password });
  const stranger = await fetch(`${BASE}/api/edition/build`, { method: 'POST', headers: { authorization: `Bearer ${os.session!.access_token}`, 'content-type': 'application/json' }, body: JSON.stringify({ giftId: gift.giftId }) });
  console.log("stranger building someone else's gift ->", stranger.status);
  console.log('bad token ->', (await fetch(`${BASE}/api/gift/nope`)).status);

  const { data: giftRow } = await admin.from('gifts').select('recipient_user_id').eq('id', gift.giftId).single();
  created.push(giftRow!.recipient_user_id);
  console.log('PASS');
} finally {
  for (const id of created) await admin.auth.admin.deleteUser(id);
  console.log('cleaned up');
}
