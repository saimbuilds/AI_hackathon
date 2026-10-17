// Two real accounts: Saim shares a story, the friend claims the link, the friend's next paper includes it.
import { createClient } from '@supabase/supabase-js';
import { adminClient } from '../src/lib/supabase';
import { EditionSchema, type Edition, type StorySlot } from '../src/types/edition';

const BASE = process.env.BASE ?? 'http://localhost:3001';
const admin = adminClient()!;
const ids: string[] = [];

async function account(label: string, name: string) {
  const email = `e2e-${label}-${Date.now()}@example.com`;
  const password = crypto.randomUUID();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  ids.push(data.user.id);
  const { data: s } = await createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!).auth.signInWithPassword({ email, password });
  const headers = { authorization: `Bearer ${s.session!.access_token}`, 'content-type': 'application/json' };
  const call = (path: string, body?: unknown, method = 'POST') => fetch(`${BASE}${path}`, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const done = await call('/api/onboarding/complete', { name, tz: 'Asia/Karachi', interests: { chips: ['F1'], topics: ['f1', 'cricket'] } });
  if (!done.ok) throw new Error(`complete ${done.status}`);
  return { id: data.user.id, call, headers };
}
const slots = (e: Edition): StorySlot[] => [e.lead, ...e.sections.flatMap((s) => s.slots), ...e.offYourBeat, ...e.briefs, ...e.everyonesFrontPage];
async function build(a: Awaited<ReturnType<typeof account>>) {
  const text = await (await a.call('/api/edition/build', {})).text();
  const m = text.match(/"editionId":"([^"]+)"/);
  if (!m) throw new Error(`build failed: ${text.slice(0, 200)}`);
  const { data } = await admin.from('editions').select('payload').eq('id', m[1]).single();
  return EditionSchema.parse(data!.payload);
}

try {
  const saim = await account('saim', 'Saim');
  const friend = await account('friend', 'Abbu');

  // A story that would NOT normally be near the friend's top: pick a low-importance printable story.
  const { data: pick } = await admin.from('stories').select('id,headline').eq('printable', true).order('importance', { ascending: true }).limit(1).single();
  console.log('story to share (low importance):', pick!.headline!.slice(0, 80));

  const sh = await saim.call('/api/share', { storyId: pick!.id });
  const share = (await sh.json()) as { token: string; url: string; text: string; whatsappUrl: string };
  console.log('share:', sh.status, share.url);
  console.log('whatsapp text:', share.text.replace(/\n/g, ' / ').slice(0, 140));

  const peek = await fetch(`${BASE}/api/share/${share.token}`);
  console.log('public peek (no auth):', peek.status, JSON.stringify(await peek.json()).slice(0, 120));
  console.log('bad token:', (await fetch(`${BASE}/api/share/not-a-token`)).status);

  const claim = await friend.call(`/api/share/${share.token}/claim`);
  console.log('friend claim:', claim.status, await claim.json());
  console.log('claim again (idempotent):', (await friend.call(`/api/share/${share.token}/claim`)).status);
  console.log('own-link claim by sender (no-op):', (await saim.call(`/api/share/${share.token}/claim`)).status);

  const ed = await build(friend);
  const hit = slots(ed).find((x) => x.storyId === pick!.id);
  console.log('friend paper includes the shared story:', !!hit, '| fromFriend =', hit?.fromFriend, '| whyThis =', hit?.whyThis);
  if (!hit || hit.fromFriend !== "Saim thinks you'd like this") throw new Error('shared story missing or untagged');

  const { data: claims } = await admin.from('share_claims').select('consumed_at').eq('recipient_id', friend.id);
  console.log('claim consumed after delivery:', !!claims?.[0]?.consumed_at);
  console.log('PASS');
} finally {
  for (const id of ids) await admin.auth.admin.deleteUser(id);
  console.log('cleaned up');
}
