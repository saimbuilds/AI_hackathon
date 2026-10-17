import { NextResponse } from 'next/server';
import { z } from 'zod';
import { clientIp, fail, parseJson, rateLimit, requireUser, route } from '@/lib/http';
import { adminClient } from '@/lib/supabase';

const Body = z.object({
  kind: z.enum(['wrong-facts', 'broken-link', 'not-for-me', 'general', 'nps']),
  message: z.string().trim().max(1000).optional(),
  editionId: z.uuid().optional(),
  storyId: z.uuid().optional(),
  score: z.number().int().min(0).max(10).optional(), // one-question feedback / NPS
});

// POST /api/feedback  { kind, message?, editionId?, storyId?, score? }  ->  { ok: true }
// "Report a problem" on every story (wrong facts / broken link / not for me) and the one-question
// feedback. Lands in the admin queue (GET /api/admin/stats -> feedback).
export const POST = route(async (req) => {
  const user = await requireUser(req);
  rateLimit(`feedback:ip:${clientIp(req)}`, 30, 3_600_000);
  rateLimit(`feedback:user:${user.id}`, 20, 3_600_000);
  const b = await parseJson(req, Body);
  if (b.kind === 'general' && !b.message) return fail(400, 'Tell us a little more');
  const db = adminClient()!;
  const message = [b.score !== undefined ? `score=${b.score}` : '', b.message ?? ''].filter(Boolean).join(' | ') || null;
  const { error } = await db.from('feedback').insert({ user_id: user.id, edition_id: b.editionId ?? null, story_id: b.storyId ?? null, kind: b.kind, message });
  if (error) return fail(500, 'Could not save your note');
  return NextResponse.json({ ok: true });
});
