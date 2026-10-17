import { NextResponse } from 'next/server';
import { z } from 'zod';
import { fail, parseJson, rateLimit, requireUser, route } from '@/lib/http';
import { adminClient } from '@/lib/supabase';

// DELETE /api/me  { confirm: "delete my paper" }  ->  { ok: true }
// "Delete my paper & data": removes the auth user; profiles, editions, events, edition_stories,
// jobs and gifts cascade. Feedback they sent is kept but detached from them (user_id set null).
const Body = z.object({ confirm: z.literal('delete my paper') });

export const DELETE = route(async (req) => {
  const user = await requireUser(req);
  rateLimit(`delete:user:${user.id}`, 3, 3_600_000);
  await parseJson(req, Body);
  const db = adminClient()!;
  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) return fail(500, 'Could not delete your account right now. Please try again.');
  return NextResponse.json({ ok: true });
});

// GET /api/me  ->  a full export of the reader's own data (profile, editions, events) as JSON.
export const GET = route(async (req) => {
  const user = await requireUser(req);
  rateLimit(`export:user:${user.id}`, 5, 3_600_000);
  const db = adminClient()!;
  const [profile, editions, events, feedback] = await Promise.all([
    db.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    db.from('editions').select('id,date,number,payload,created_at').eq('user_id', user.id).order('date'),
    db.from('events').select('type,story_id,edition_id,meta,created_at').eq('user_id', user.id).order('created_at').limit(20000),
    db.from('feedback').select('kind,message,story_id,created_at').eq('user_id', user.id),
  ]);
  const { vec_long: _l, vec_short: _s, ...safeProfile } = (profile.data ?? {}) as Record<string, unknown>; // raw taste vectors are not user-meaningful
  void _l; void _s;
  return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), profile: safeProfile, editions: editions.data ?? [], events: events.data ?? [], feedback: feedback.data ?? [] }, null, 2), {
    headers: { 'content-type': 'application/json', 'content-disposition': 'attachment; filename="my-paper-data.json"' },
  });
});
