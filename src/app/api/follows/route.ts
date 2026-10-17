import { NextResponse } from 'next/server';
import { FREE_FOLLOW_LIMIT, listWatches } from '@/follow/watch';
import { rateLimit, requireUser, route } from '@/lib/http';
import { adminClient } from '@/lib/supabase';

// GET /api/follows -> { follows: [...with latestUpdate], plan, limit }
export const GET = route(async (req) => {
  const user = await requireUser(req);
  rateLimit(`follows:user:${user.id}`, 120, 60_000);
  const db = adminClient()!;
  const [follows, { data: profile }] = await Promise.all([listWatches(db, user.id), db.from('profiles').select('plan').eq('id', user.id).maybeSingle()]);
  const plan = profile?.plan === 'plus' ? 'plus' : 'free';
  return NextResponse.json({ follows, plan, limit: plan === 'plus' ? null : FREE_FOLLOW_LIMIT });
});
