// Send one reader's latest edition (real email template) to any address, without touching their profile.
// tsx --env-file=.env.local scripts/send-test-email.mts <readerName> <to>
import { adminClient } from '../src/lib/supabase';
import { transporter } from '../src/email/deliver';
import { renderEmail } from '../src/email/render';
import { EditionSchema } from '../src/types/edition';

const [name = 'Saim', to] = process.argv.slice(2);
if (!to) throw new Error('usage: send-test-email.mts <readerName> <to>');
const db = adminClient()!;
const { data: p } = await db.from('profiles').select('id').eq('name', name).limit(1).single();
const { data: row } = await db.from('editions').select('payload').eq('user_id', p!.id).order('created_at', { ascending: false }).limit(1).single();
const ed = EditionSchema.parse(row!.payload);
const m = renderEmail(ed, p!.id);
const mail = transporter();
const r = await mail.send({ to, subject: m.subject, text: m.text, html: m.html, headers: { 'List-Unsubscribe': `<${m.unsubscribeUrl}>` } });
console.log(`${mail.dry ? 'DRY RUN ' : 'sent '}"${m.subject}" -> ${to}`, JSON.stringify(r).slice(0, 200));
