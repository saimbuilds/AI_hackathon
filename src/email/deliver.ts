// Hourly delivery: for every reader whose delivery time has arrived (in THEIR time zone) and who has not
// been mailed today, build the edition and send it. Gmail SMTP with an app password (~500/day free).
import nodemailer, { type SendMailOptions } from 'nodemailer';
import { adminClient } from '../lib/supabase';
import { captureError } from '../lib/monitor';
import { buildEdition, localDate } from '../edition/build';
import { EditionSchema } from '../types/edition';
import { appUrl, renderEmail } from './render';

const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

// Local clock parts for a time zone.
export function localClock(tz: string, now: number): { date: string; minutes: number } {
  const date = localDate(tz, now);
  let h = 0, m = 0;
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
    h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
    m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  } catch { /* unknown tz: treat as UTC-less midnight, never due */ }
  return { date, minutes: h * 60 + m };
}

// Due once the delivery time has passed, for up to 3 hours (so one missed hourly run isn't a missed paper).
export function isDue(p: { tz: string; delivery_time: string; email: string | null; email_opt_in: boolean }, now: number, graceMinutes = 180): boolean {
  if (!p.email || !p.email_opt_in) return false;
  const { minutes } = localClock(p.tz, now);
  const [hh, mm] = p.delivery_time.split(':').map(Number);
  const since = minutes - (hh * 60 + mm);
  return since >= 0 && since < graceMinutes;
}

// Any SMTP provider works: Brevo, Resend, Mailjet, SES, Gmail... Set SMTP_HOST, SMTP_USER, SMTP_PASS and EMAIL_FROM
// (SMTP_PORT defaults to 587). GMAIL_USER + GMAIL_APP_PASSWORD still work. With neither, it is a logged dry run.
export function transporter() {
  const host = process.env.SMTP_HOST;
  const user = host ? process.env.SMTP_USER : process.env.GMAIL_USER;
  const pass = host ? process.env.SMTP_PASS : process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return { send: async (m: SendMailOptions) => { log(`[dry-run: no SMTP_HOST/SMTP_USER/SMTP_PASS or GMAIL_USER/GMAIL_APP_PASSWORD] would send "${m.subject}" to ${m.to}`); return { messageId: 'dry-run' }; }, dry: true as const };
  const t = host
    ? nodemailer.createTransport({ host, port: Number(process.env.SMTP_PORT ?? 587), secure: Number(process.env.SMTP_PORT ?? 587) === 465, auth: { user, pass } })
    : nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
  const fromAddr = process.env.EMAIL_FROM ?? user;
  return { send: (m: SendMailOptions) => t.sendMail({ from: `"${process.env.EMAIL_FROM_NAME ?? 'Your morning paper'}" <${fromAddr}>`, ...m }), dry: false as const };
}

export type DeliverOptions = { now?: number; force?: boolean; onlyUser?: string; toOverride?: string; limit?: number };

export async function deliverDue(opts: DeliverOptions = {}): Promise<{ due: number; sent: number; failed: number; skipped: number }> {
  const db = adminClient();
  if (!db) throw new Error('Supabase env missing');
  const now = opts.now ?? Date.now();
  const mail = transporter();

  let q = db.from('profiles').select('id,name,email,email_opt_in,tz,delivery_time').not('onboarded_at', 'is', null).eq('email_opt_in', true).not('email', 'is', null);
  if (opts.onlyUser) q = q.eq('id', opts.onlyUser);
  const { data, error } = await q.limit(2000);
  if (error) throw new Error(error.message);

  const due = (data ?? []).filter((p) => opts.force || isDue(p as never, now));
  const out = { due: due.length, sent: 0, failed: 0, skipped: 0 };
  log(`email: ${due.length} readers due of ${data?.length ?? 0} subscribed`);

  for (const p of due.slice(0, opts.limit ?? 400)) {
    const date = localDate(p.tz, now);
    // Dedupe: one email per reader per local day (jobs doubles as the send log).
    const { data: prior } = await db.from('jobs').select('id').eq('kind', 'email').eq('user_id', p.id).eq('payload->>date', date).in('status', ['done', 'running']).limit(1);
    if (prior?.length && !opts.force) { out.skipped += 1; continue; }

    const { data: job } = await db.from('jobs').insert({ kind: 'email', user_id: p.id, payload: { date }, status: 'running', started_at: new Date().toISOString() }).select('id').single();
    try {
      const built = await buildEdition(p.id, { now });
      const { data: row } = await db.from('editions').select('payload').eq('id', built.editionId).single();
      const edition = EditionSchema.parse(row!.payload);
      let url: string | undefined;
      if (edition.gift) {
        const { data: g } = await db.from('gifts').select('token').eq('recipient_user_id', p.id).maybeSingle();
        if (g) url = (process.env.GIFT_URL_TEMPLATE ?? `${appUrl()}/gift/{token}`).replace('{token}', g.token);
      }
      const msg = renderEmail(edition, p.id, { url });
      const info = await mail.send({
        to: opts.toOverride ?? (p.email as string), subject: msg.subject, html: msg.html, text: msg.text,
        headers: { 'List-Unsubscribe': `<${msg.unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      });
      await db.from('jobs').update({ status: 'done', finished_at: new Date().toISOString(), result: { editionId: built.editionId, messageId: info.messageId, fallback: built.fallback } }).eq('id', job!.id);
      out.sent += 1;
    } catch (e) {
      out.failed += 1;
      log(`email: failed for ${p.id}: ${e instanceof Error ? e.message : e}`);
      await captureError(e, { task: 'email', userId: p.id });
      if (job) await db.from('jobs').update({ status: 'failed', error: e instanceof Error ? e.message.slice(0, 300) : String(e), finished_at: new Date().toISOString() }).eq('id', job.id);
    }
  }
  log(`email: ${out.sent} sent, ${out.failed} failed, ${out.skipped} already sent today${mail.dry ? ' (dry run)' : ''}`);
  return out;
}
