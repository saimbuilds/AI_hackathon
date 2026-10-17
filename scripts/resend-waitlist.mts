// Resend the confirmation for signups whose email never went out (e.g. the site had no mail settings yet).
// tsx --env-file=.env.local scripts/resend-waitlist.mts <email> [<email>...]   (only the addresses you name)
import { adminClient } from '../src/lib/supabase';
import { transporter } from '../src/email/deliver';
import { appUrl, esc } from '../src/email/render';
import { BRAND } from '../src/lib/brand';

const emails = process.argv.slice(2).map((e) => e.toLowerCase());
if (!emails.length) throw new Error('name the email addresses to resend to');
const db = adminClient()!;
const mail = transporter();
const { data } = await db.from('waitlist').select('id,email,plan').in('email', emails).is('confirmed_at', null);
for (const r of data ?? []) {
  const home = appUrl();
  await mail.send({
    to: r.email,
    subject: `You're on the list: ${BRAND.name}`,
    text: `You're on the list.\n\nWe'll email you once, when it's ready (${r.plan}).\n\nIn the meantime your free paper is here: ${home}\n\nNo spam, and you can ignore this if it wasn't you.`,
    html: `<div style="font-family:Georgia,serif;max-width:520px;margin:auto;padding:24px;background:#fffdf7;color:#141414"><div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#C8102E">${esc(BRAND.name)}</div><h2 style="margin:8px 0">You're on the list.</h2><p>We'll email you once, when it's ready (${esc(r.plan)}).</p><p><a href="${esc(home)}" style="color:#141414">Read your free paper</a></p><p style="font-size:12px;color:#666">No spam. If this wasn't you, ignore this email.</p></div>`,
  });
  if (!mail.dry) await db.from('waitlist').update({ confirmed_at: new Date().toISOString() }).eq('id', r.id);
  console.log(`${mail.dry ? 'DRY ' : 'sent '} -> ${r.email} (${r.plan})`);
}
console.log(`${data?.length ?? 0} pending confirmation(s) handled`);
