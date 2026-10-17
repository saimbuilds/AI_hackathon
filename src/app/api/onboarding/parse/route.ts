import { NextResponse } from 'next/server';
import { z } from 'zod';
import { clientIp, parseJson, rateLimit, requireUser, route } from '@/lib/http';
import { parseOnboarding } from '@/lib/onboarding';

export const maxDuration = 30;

const Body = z.object({ text: z.string().trim().min(2).max(800) });

// POST /api/onboarding/parse  { text }  ->  { parsed: ParsedProfile, source: 'llm' | 'heuristic' }
export const POST = route(async (req) => {
  const user = await requireUser(req);
  rateLimit(`parse:ip:${clientIp(req)}`, 150, 60_000);
  rateLimit(`parse:user:${user.id}`, 10, 60_000);
  const { text } = await parseJson(req, Body);
  return NextResponse.json(await parseOnboarding(text));
});
