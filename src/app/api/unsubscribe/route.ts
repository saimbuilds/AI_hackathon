import { NextResponse } from 'next/server';
import { verifyUnsubscribeToken } from '@/email/render';
import { BRAND } from '@/lib/brand';
import { clientIp, fail, rateLimit, route } from '@/lib/http';
import { adminClient } from '@/lib/supabase';

async function unsubscribe(req: Request): Promise<string> {
  rateLimit(`unsub:ip:${clientIp(req)}`, 60, 60_000);
  const token = new URL(req.url).searchParams.get('t') ?? '';
  const userId = verifyUnsubscribeToken(token);
  if (!userId) return fail(400, 'This unsubscribe link is not valid.');
  const { error } = await adminClient()!.from('profiles').update({ email_opt_in: false }).eq('id', userId);
  if (error) return fail(500, 'Could not update your preference. Please try again.');
  return userId;
}

// GET /api/unsubscribe?t=<token>: the link in every email. Public, token-signed.
export const GET = route(async (req) => {
  await unsubscribe(req);
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribed</title>
<body style="margin:0;background:#F3EFE6;color:#141414;font-family:Georgia,serif;display:grid;place-items:center;min-height:100vh;text-align:center;padding:24px">
<div><div style="font-size:30px;font-weight:bold">You're unsubscribed.</div><p style="font-size:17px;max-width:30em">No more morning emails from ${BRAND.name}. Your paper is still there whenever you want it.</p></div></body>`;
  return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
});

// POST: RFC 8058 one-click unsubscribe from the mail client's own button.
export const POST = route(async (req) => {
  await unsubscribe(req);
  return NextResponse.json({ ok: true });
});
