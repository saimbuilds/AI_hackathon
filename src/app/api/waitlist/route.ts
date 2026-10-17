import { NextResponse } from 'next/server';
import { z } from 'zod';
import { transporter } from '@/email/deliver';
import { appUrl, esc } from '@/email/render';
import { BRAND } from '@/lib/brand';
import { clientIp, parseJson, rateLimit, route } from '@/lib/http';
import { adminClient } from '@/lib/supabase';

export const maxDuration = 30;

const Body = z.object({
  email: z.email().max(254).transform((e) => e.toLowerCase()),
  plan: z.enum(['plus', 'gift', 'teams', 'general']).default('general'),
  source: z.string().max(40).optional(),
  website: z.string().max(200).optional(), // honeypot: real people leave it empty
});

const PLAN_LINE: Record<string, string> = {
  plus: `${BRAND.name} Plus: the audio edition, unlimited follows, the Sunday long-read and Wrapped.`,
  gift: 'The gift paper: a morning paper for someone you love, in their language, in large print.',
  teams: 'Teams: one shared morning brief on your industry, delivered where your team already works.',
  general: `news about ${BRAND.name}.`,
};

// POST /api/waitlist  { email, plan?: 'plus'|'gift'|'teams'|'general', source? }  ->  { ok: true }
// Public (pricing page). Stores the email and sends one confirmation. Always answers { ok: true } so it cannot be
// used to find out who is on the list; a repeat signup does not send a second email.
export const POST = route(async (req) => {
  rateLimit(`waitlist:ip:${clientIp(req)}`, 10, 3_600_000);
  const b = await parseJson(req, Body, 2_000);
  if (b.website) return NextResponse.json({ ok: true }); // bot
  rateLimit(`waitlist:email:${b.email}`, 3, 86_400_000);
  const db = adminClient()!;

  const { data: row, error } = await db.from('waitlist').upsert({ email: b.email, plan: b.plan, source: b.source ?? null }, { onConflict: 'email,plan', ignoreDuplicates: true }).select('id').maybeSingle();
  if (error) throw new Error(`waitlist: ${error.message}`);
  if (!row) return NextResponse.json({ ok: true }); // already on the list

  const mail = transporter();
  const line = PLAN_LINE[b.plan];
  const home = appUrl();
  try {
    await mail.send({
      to: b.email,
      subject: `You're on the list: ${BRAND.name}`,
      text: `You're on the list.\n\nWe'll email you once, when this is ready: ${line}\n\nIn the meantime your free paper is here: ${home}\n\nNo spam, and you can ignore this if it wasn't you.`,
      html: `<!doctype html><html><body style="margin:0;background:#F3EFE6;color:#141414;font-family:Georgia,'Times New Roman',serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="560" style="max-width:560px;background:#fffdf7;border:1px solid #d9d2c0"><tr><td style="padding:24px 28px"><div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#C8102E">${esc(BRAND.name)}</div><div style="font-size:26px;line-height:1.2;font-weight:bold;padding:8px 0">You're on the list.</div><div style="font-size:16px;line-height:1.55">We'll email you once, when this is ready:<br><i>${esc(line)}</i></div><div style="font-size:15px;padding-top:16px"><a href="${esc(home)}" style="color:#141414">Read your free paper</a></div><div style="font-size:12px;color:#666;padding-top:20px">No spam. If this wasn't you, just ignore this email.</div></td></tr></table></td></tr></table></body></html>`,
    });
    if (!mail.dry) await db.from('waitlist').update({ confirmed_at: new Date().toISOString() }).eq('id', row.id);
  } catch (e) {
    console.error('waitlist confirmation email failed:', e instanceof Error ? e.message : e); // the signup still counts
  }
  return NextResponse.json({ ok: true });
});
