import { NextResponse } from 'next/server';
import { fail, rateLimit, requireUser, route } from '@/lib/http';
import { adminClient } from '@/lib/supabase';

// POST /api/share/<token>/claim  (auth)  ->  { ok: true, fromName, storyId }
// Call after the friend has a session (anonymous is fine). Their next build includes the story, tagged
// "<fromName> thinks you'd like this". Idempotent; claiming your own link is a no-op.
export const POST = route(async (req, ctx) => {
  const user = await requireUser(req);
  rateLimit(`claim:user:${user.id}`, 20, 3_600_000);
  const { token } = await ctx.params;
  if (!/^[0-9a-f]{14}$/.test(token)) return fail(404, 'This link is not valid.');
  const db = adminClient()!;
  const { data: share } = await db.from('shares').select('id,from_name,story_id,from_user_id').eq('token', token).maybeSingle();
  if (!share) return fail(404, 'This link is not valid.');
  if (share.from_user_id !== user.id) {
    const { error } = await db.from('share_claims').upsert({ share_id: share.id, recipient_id: user.id }, { onConflict: 'share_id,recipient_id', ignoreDuplicates: true });
    if (error) return fail(500, 'Could not add the story to your paper.');
  }
  return NextResponse.json({ ok: true, fromName: share.from_name, storyId: share.story_id });
});
