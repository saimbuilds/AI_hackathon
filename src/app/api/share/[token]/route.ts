import { NextResponse } from 'next/server';
import { clientIp, fail, rateLimit, route } from '@/lib/http';
import { adminClient } from '@/lib/supabase';

// GET /api/share/<token>  (public, no auth)  ->  { fromName, story: { storyId, headline, dek, category, outlets, imageUrl } }
// What the link landing page shows before the friend has an account.
export const GET = route(async (req, ctx) => {
  rateLimit(`sharepeek:ip:${clientIp(req)}`, 120, 60_000);
  const { token } = await ctx.params;
  if (!/^[0-9a-f]{14}$/.test(token)) return fail(404, 'This link is not valid.');
  const db = adminClient()!;
  const { data: share } = await db.from('shares').select('from_name,story_id').eq('token', token).maybeSingle();
  if (!share) return fail(404, 'This link is not valid.');
  const { data: s } = await db.from('stories').select('id,headline,dek,category,source_count,image_url').eq('id', share.story_id).maybeSingle();
  if (!s) return fail(404, 'That story is no longer available.');
  return NextResponse.json({ fromName: share.from_name, story: { storyId: s.id, headline: s.headline, dek: s.dek, category: s.category, outlets: s.source_count, imageUrl: s.image_url } });
});
