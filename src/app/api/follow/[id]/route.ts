import { NextResponse } from 'next/server';
import { z } from 'zod';
import { fail, rateLimit, requireUser, route } from '@/lib/http';
import { adminClient } from '@/lib/supabase';

// DELETE /api/follow/[id] -> { ok: true }   (unfollow; its updates go with it)
export const DELETE = route(async (req, ctx) => {
  const user = await requireUser(req);
  rateLimit(`unfollow:user:${user.id}`, 60, 60_000);
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return fail(400, 'Invalid id');
  const { data } = await adminClient()!.from('watches').delete().eq('id', id).eq('user_id', user.id).select('id');
  if (!data?.length) return fail(404, 'Not following that.');
  return NextResponse.json({ ok: true });
});
