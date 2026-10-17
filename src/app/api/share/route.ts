import { NextResponse } from 'next/server';
import { z } from 'zod';
import { appUrl } from '@/email/render';
import { loadProfile } from '@/edition/candidates';
import { BRAND } from '@/lib/brand';
import { fail, parseJson, rateLimit, requireUser, route } from '@/lib/http';
import { adminClient } from '@/lib/supabase';

const Body = z.object({ storyId: z.uuid() });

export const shareUrl = (token: string) => (process.env.SHARE_URL_TEMPLATE ?? `${appUrl()}/s/{token}`).replace('{token}', token);

// POST /api/share  { storyId }  ->  { token, url, text, whatsappUrl }
// "Send this story to a friend's paper": the link onboards the friend with this story as their first swipe,
// and shows up in their next paper as "<you> thinks you'd like this".
export const POST = route(async (req) => {
  const user = await requireUser(req);
  rateLimit(`share:user:${user.id}`, 30, 3_600_000);
  const { storyId } = await parseJson(req, Body);
  const db = adminClient()!;

  const { data: story } = await db.from('stories').select('id,headline').eq('id', storyId).eq('printable', true).maybeSingle();
  if (!story) return fail(404, 'That story is no longer available.');
  const profile = await loadProfile(db, user.id);
  const fromName = profile?.name?.trim() || 'A friend';

  const { data, error } = await db.from('shares').insert({ from_user_id: user.id, from_name: fromName, story_id: storyId }).select('token').single();
  if (error) return fail(500, 'Could not create the link.');
  const url = shareUrl(data.token);
  const text = `${fromName} thinks you'd like this: "${story.headline}"\nRead it in your own ${BRAND.name} paper: ${url}`;
  return NextResponse.json({ token: data.token, url, text, whatsappUrl: `https://wa.me/?text=${encodeURIComponent(text)}` });
});
