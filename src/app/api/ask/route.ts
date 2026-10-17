import { NextResponse } from 'next/server';
import { z } from 'zod';
import { answerQuestion } from '@/follow/ask';
import { assertCanFollow, createAskWatch, FREE_FOLLOW_LIMIT } from '@/follow/watch';
import { clientIp, parseJson, rateLimit, requireUser, route } from '@/lib/http';
import { adminClient } from '@/lib/supabase';

export const maxDuration = 60;

const Body = z.object({ question: z.string().trim().min(3).max(300), follow: z.boolean().optional() });

// POST /api/ask  { question, follow? }
//   -> { answer, sentences:[{text, sources:number[]}], sources:[{storyId, headline, name, url}], covered, watchId?, needsPlus? }
// Answered ONLY from stories the press has verified (last 14 days); covered=false when the news doesn't say.
export const POST = route(async (req) => {
  const user = await requireUser(req);
  rateLimit(`ask:user:${user.id}`, 20, 3_600_000);
  rateLimit(`ask:burst:${user.id}`, 5, 60_000);
  rateLimit(`ask:ip:${clientIp(req)}`, 120, 3_600_000);
  const { question, follow } = await parseJson(req, Body, 4_000);
  const db = adminClient()!;

  const a = await answerQuestion(db, question);
  let watchId: string | undefined;
  let needsPlus = false;
  if (follow) {
    const can = await assertCanFollow(db, user.id);
    if (can.ok) watchId = await createAskWatch(db, user.id, question, a);
    else needsPlus = true;
  }
  return NextResponse.json({
    answer: a.answer, sentences: a.sentences, sources: a.sources, covered: a.covered,
    ...(watchId ? { watchId } : {}), ...(needsPlus ? { needsPlus: true, limit: FREE_FOLLOW_LIMIT } : {}),
  });
});
