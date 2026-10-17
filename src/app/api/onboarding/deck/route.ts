import { NextResponse } from 'next/server';
import { buildDeck } from '@/lib/deck';
import { clientIp, rateLimit, requireUser, route } from '@/lib/http';

// GET /api/onboarding/deck?n=12  ->  { cards: DeckCard[] }
// 12 real headlines from today's pool, spread across the interest space (farthest-point sampling).
export const GET = route(async (req) => {
  const user = await requireUser(req);
  rateLimit(`deck:ip:${clientIp(req)}`, 150, 60_000);
  rateLimit(`deck:user:${user.id}`, 10, 60_000);
  const n = Math.min(20, Math.max(4, Number(new URL(req.url).searchParams.get('n')) || 12));
  return NextResponse.json({ cards: await buildDeck(n) });
});
