import { NextResponse } from 'next/server';
import { BuildError, buildEdition, localDate } from '@/edition/build';
import { loadProfile } from '@/edition/candidates';
import { clientIp, fail, rateLimit, route } from '@/lib/http';
import { adminClient } from '@/lib/supabase';
import { EditionSchema } from '@/types/edition';

export const maxDuration = 120;

async function findGift(token: string) {
  if (!/^[0-9a-f]{24}$/.test(token)) return fail(404, 'This paper link is not valid.');
  const db = adminClient()!;
  const { data: gift } = await db.from('gifts').select('id,recipient_user_id,for_name,from_name,relation,language,large_print').eq('token', token).maybeSingle();
  if (!gift?.recipient_user_id) return fail(404, 'This paper link is not valid.');
  return { db, gift };
}

// GET /api/gift/<token>  (public, no account)  ->  { gift, edition: Edition | null, needsBuild }
// The recipient's read-only paper: "Compiled for Abbu by Saim". If today's edition is not built yet,
// `needsBuild` is true: POST the same URL to print it.
export const GET = route(async (req, ctx) => {
  rateLimit(`gift:read:ip:${clientIp(req)}`, 120, 60_000);
  const { token } = await ctx.params;
  const { db, gift } = await findGift(token);
  const { data: ed } = await db.from('editions').select('payload,date').eq('user_id', gift.recipient_user_id).order('number', { ascending: false }).limit(1);
  const profile = await loadProfile(db, gift.recipient_user_id);
  const today = localDate(profile?.tz ?? 'UTC');
  return NextResponse.json({
    gift: { forName: gift.for_name, fromName: gift.from_name, relation: gift.relation, language: gift.language, largePrint: gift.large_print },
    edition: ed?.[0] ? EditionSchema.parse(ed[0].payload) : null,
    needsBuild: !ed?.[0] || ed[0].date !== today,
  });
});

// POST /api/gift/<token>  (public)  ->  { editionId }   prints today's paper if it does not exist yet.
export const POST = route(async (req, ctx) => {
  const { token } = await ctx.params;
  rateLimit(`gift:build:ip:${clientIp(req)}`, 10, 60_000);
  rateLimit(`gift:build:token:${token}`, 6, 3_600_000);
  const { gift } = await findGift(token);
  try {
    const r = await buildEdition(gift.recipient_user_id, {});
    return NextResponse.json({ editionId: r.editionId, reused: r.reused, fallback: r.fallback });
  } catch (e) {
    if (e instanceof BuildError) return fail(e.status, e.message);
    throw e;
  }
});
