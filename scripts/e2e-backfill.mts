// Backfill a throwaway account and show what each past day's paper contains.
import { adminClient } from '../src/lib/supabase';
import { backfillEditions } from '../src/edition/backfill';
import { EditionSchema, type Edition, type StorySlot } from '../src/types/edition';

const db = adminClient()!;
const { data: u, error } = await db.auth.admin.createUser({ email: `e2e-bf-${Date.now()}@example.com`, password: crypto.randomUUID(), email_confirm: true });
if (error) throw error;
const id = u.user.id;
try {
  await db.from('profiles').update({ name: 'Saim', tz: 'Asia/Karachi', city: 'Islamabad', onboarded_at: new Date().toISOString(), interests: { chips: ['AI'], topics: ['ai', 'f1'] } }).eq('id', id);
  const t0 = Date.now();
  const out = await backfillEditions(id, { days: 7 });
  console.log('result:', out, `in ${((Date.now() - t0) / 1000).toFixed(0)}s`);

  const { data: eds } = await db.from('editions').select('date,number,payload,stats').eq('user_id', id).order('date');
  const slots = (e: Edition): StorySlot[] => [e.lead, ...e.sections.flatMap((s) => s.slots), ...e.offYourBeat, ...e.briefs, ...e.everyonesFrontPage];
  console.log('\ndate        No.  stories  multi-outlet  lead');
  const seen = new Set<string>();
  let repeats = 0;
  for (const row of eds ?? []) {
    const e = EditionSchema.parse(row.payload);
    const s = slots(e);
    s.forEach((x) => { if (seen.has(x.storyId)) repeats++; seen.add(x.storyId); });
    console.log(`${row.date}  ${String(row.number).padStart(2)}   ${String(s.length).padStart(6)}  ${String(s.filter((x) => x.trust.outlets >= 2).length).padStart(11)}   ${e.lead.headline.slice(0, 70)}  [backfill=${(row.stats as { backfill?: boolean }).backfill}] weather=${e.weather ? 'yes' : 'no'}`);
  }
  console.log(`\nrepeated stories across the archive: ${repeats} (must be 0)`);
  console.log('dates are distinct:', new Set((eds ?? []).map((r) => r.date)).size === (eds ?? []).length);
} finally {
  await db.auth.admin.deleteUser(id);
  console.log('cleaned up');
}
