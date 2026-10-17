import { NextResponse } from 'next/server';
import { loadTaste } from '@/learning/taste';
import { rateLimit, requireUser, route } from '@/lib/http';
import { adminClient } from '@/lib/supabase';

// GET /api/me/taste -> { headline, likes:[{topic,label,score,strength,origin,last24h,last7d}], avoids:[{topic,label,muted}],
//   signals:{last7d:{reads,saves,lessLikeThis},total}, streak, memo, firstPaperDate }
// "What your paper has learned about you": the learning made visible.
export const GET = route(async (req) => {
  const user = await requireUser(req);
  rateLimit(`taste:user:${user.id}`, 60, 60_000);
  return NextResponse.json(await loadTaste(adminClient()!, user.id), { headers: { 'cache-control': 'private, no-store' } });
});
