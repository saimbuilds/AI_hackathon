// Dry-run of the email pipeline with a real user: build -> render -> (dry) send -> dedupe -> unsubscribe link.
import { writeFileSync } from 'node:fs';
import { adminClient } from '../src/lib/supabase';
import { deliverDue } from '../src/email/deliver';
import { renderEmail, unsubscribeToken } from '../src/email/render';
import { EditionSchema } from '../src/types/edition';

const db = adminClient()!;
const { data: u, error } = await db.auth.admin.createUser({ email: `e2e-mail-${Date.now()}@example.com`, password: crypto.randomUUID(), email_confirm: true });
if (error) throw error;
const id = u.user.id;
try {
  await db.from('profiles').update({ name: 'Saim', tz: 'Asia/Karachi', city: 'Islamabad', delivery_time: '07:00', email: u.user.email, email_opt_in: true, onboarded_at: new Date().toISOString(), interests: { chips: ['AI'], topics: ['ai'] } }).eq('id', id);
  const r1 = await deliverDue({ force: true, onlyUser: id });
  console.log('first run :', r1);
  const r2 = await deliverDue({ onlyUser: id, now: Date.now(), force: false });
  console.log('second run:', r2, '(not due now or already sent: must not resend)');
  const { data: ed } = await db.from('editions').select('payload').eq('user_id', id).single();
  const m = renderEmail(EditionSchema.parse(ed!.payload), id);
  writeFileSync('.cache/email-preview.html', m.html);
  console.log('subject:', m.subject, '| html bytes:', m.html.length, '| preview: .cache/email-preview.html');
  const res = await fetch(`http://localhost:3001/api/unsubscribe?t=${unsubscribeToken(id)}`);
  const { data: after } = await db.from('profiles').select('email_opt_in').eq('id', id).single();
  console.log('unsubscribe HTTP', res.status, '-> email_opt_in =', after!.email_opt_in);
  const bad = await fetch('http://localhost:3001/api/unsubscribe?t=nonsense');
  console.log('bad token HTTP', bad.status);
} finally {
  await db.auth.admin.deleteUser(id);
}
