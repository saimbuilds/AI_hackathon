import { NextResponse } from 'next/server';
import { z } from 'zod';
import { answerQuestion } from '@/follow/ask';
import { assertCanFollow, createAskWatch, createStoryWatch, FREE_FOLLOW_LIMIT } from '@/follow/watch';
import { fail, parseJson, rateLimit, requireUser, route } from '@/lib/http';
import { adminClient } from '@/lib/supabase';
import { BRAND } from '@/lib/brand';

export const maxDuration = 60;

const Body = z.union([
  z.object({ storyId: z.uuid() }),
  z.object({ question: z.string().trim().min(3).max(300) }),
]);

// POST /api/follow  { storyId } | { question }  ->  { watchId, kind, question, answer?, sources?, covered? }
// Free tier: 3 follows, then 402 { needsPlus: true, limit: 3 }.
export const POST = route(async (req) => {
  const user = await requireUser(req);
  rateLimit(`follow:user:${user.id}`, 30, 3_600_000);
  const body = await parseJson(req, Body, 4_000);
  const db = adminClient()!;

  const can = await assertCanFollow(db, user.id);
  if (!can.ok) return fail(402, `Free papers can follow ${FREE_FOLLOW_LIMIT} things. ${BRAND.name} Plus follows as many as you like.`, { needsPlus: true, limit: FREE_FOLLOW_LIMIT });

  if ('storyId' in body) {
    const w = await createStoryWatch(db, user.id, body.storyId);
    if (!w) return fail(404, 'That story is no longer available.');
    return NextResponse.json({ watchId: w.id, kind: 'story', question: w.question });
  }
  const a = await answerQuestion(db, body.question);
  const watchId = await createAskWatch(db, user.id, body.question, a);
  return NextResponse.json({ watchId, kind: 'ask', question: body.question, answer: a.answer, sentences: a.sentences, sources: a.sources, covered: a.covered });
});
