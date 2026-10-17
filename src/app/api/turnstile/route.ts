import { NextResponse } from 'next/server';
import { z } from 'zod';
import { clientIp, fail, parseJson, rateLimit, requireUser, route } from '@/lib/http';
import { adminClient } from '@/lib/supabase';

const Body = z.object({ token: z.string().min(10).max(4096) });

// POST /api/turnstile  { token }  ->  { ok: true }
// Verifies the Cloudflare Turnstile token from the onboarding widget and marks this reader human.
// /api/onboarding/complete and /api/edition/build then require it (only when TURNSTILE_SECRET is set).
export const POST = route(async (req) => {
  const user = await requireUser(req);
  rateLimit(`turnstile:ip:${clientIp(req)}`, 120, 60_000);
  rateLimit(`turnstile:user:${user.id}`, 10, 60_000);
  const { token } = await parseJson(req, Body);
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) return NextResponse.json({ ok: true, skipped: true });

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST', body: new URLSearchParams({ secret, response: token, remoteip: clientIp(req) }), signal: AbortSignal.timeout(5000),
  }).catch(() => null);
  const out = (await res?.json().catch(() => null)) as { success?: boolean } | null;
  if (!out?.success) return fail(403, 'Could not verify you are human. Please try again.');

  const db = adminClient()!;
  const { data } = await db.from('profiles').select('extras').eq('id', user.id).single();
  await db.from('profiles').update({ extras: { ...((data?.extras as object) ?? {}), human: true } }).eq('id', user.id);
  return NextResponse.json({ ok: true });
});
