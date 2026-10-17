import { NextResponse } from 'next/server';
import { localDate } from '@/edition/build';
import { loadProfile } from '@/edition/candidates';
import { applyEvents, eventWeight, type LearnEvent } from '@/learning/update';
import { parseJson, rateLimit, requireUser, route } from '@/lib/http';
import { adminClient } from '@/lib/supabase';
import { TOPICS } from '@/lib/taxonomy';
import { fromPg, toPg } from '@/lib/vec';
import { EventBatchSchema } from '@/types/events';

const MAX_AGE_MS = 24 * 3_600_000;

// POST /api/events  { events: ReaderEvent[] }  (<= 100 per call)  ->  { accepted, dropped, streak }
// Logs every event from the first deploy and applies the learning update for the batch:
// "less like this" visibly changes the next build.
export const POST = route(async (req) => {
  const user = await requireUser(req);
  rateLimit(`events:user:${user.id}`, 60, 60_000);
  const { events } = await parseJson(req, EventBatchSchema, 200_000);
  const db = adminClient()!;

  // Only events on this reader's own editions count.
  const editionIds = [...new Set(events.map((e) => e.editionId))];
  const { data: own } = await db.from('editions').select('id').eq('user_id', user.id).in('id', editionIds);
  const owned = new Set((own ?? []).map((r) => r.id as string));
  const valid = events.filter((e) => owned.has(e.editionId));

  const storyIds = [...new Set(valid.flatMap((e) => (e.storyId ? [e.storyId] : [])))];
  const stories = new Map<string, { vec: Float32Array | null; topics: string[] }>();
  if (storyIds.length) {
    const { data } = await db.from('stories').select('id,embedding,topics').in('id', storyIds);
    for (const s of data ?? []) stories.set(s.id as string, { vec: s.embedding ? fromPg(s.embedding as string) : null, topics: ((s.topics as string[]) ?? []).filter((t) => t in TOPICS) });
  }

  const now = Date.now();
  const sorted = [...valid].sort((a, b) => Date.parse(a.at ?? '') - Date.parse(b.at ?? '') || 0);
  const rows = sorted.map((e) => {
    const t = e.at ? Date.parse(e.at) : now;
    return {
      user_id: user.id, edition_id: e.editionId, story_id: e.storyId && stories.has(e.storyId) ? e.storyId : null, type: e.type, weight: eventWeight(e.type, e.meta),
      meta: e.meta, created_at: new Date(Number.isFinite(t) ? Math.min(now, Math.max(now - MAX_AGE_MS, t)) : now).toISOString(),
    };
  });
  if (rows.length) {
    const { error } = await db.from('events').insert(rows);
    if (error) console.error('events insert failed', error.message);
  }

  // Learning update for the whole batch, written back in one profile update.
  const profile = await loadProfile(db, user.id);
  let streak = profile?.streak ?? 0;
  if (profile && sorted.length) {
    const learn: LearnEvent[] = sorted.map((e) => {
      const s = e.storyId ? stories.get(e.storyId) : undefined;
      return { type: e.type, storyVec: s?.vec ?? null, topics: s?.topics ?? [], meta: e.meta };
    });
    const before = {
      vecLong: profile.vec_long ? fromPg(profile.vec_long) : null, vecShort: profile.vec_short ? fromPg(profile.vec_short) : null, topicBeta: profile.topic_beta ?? {},
      muted: { topics: profile.muted?.topics ?? [], sources: profile.muted?.sources ?? [], stories: profile.muted?.stories ?? [] },
      streak: profile.streak, lastReadOn: (profile as { last_read_on?: string | null }).last_read_on ?? null,
    };
    const after = applyEvents(before, learn, localDate(profile.tz, now));
    streak = after.streak;
    const { error } = await db.from('profiles').update({
      vec_long: after.vecLong ? toPg(after.vecLong) : null, vec_short: after.vecShort ? toPg(after.vecShort) : null, topic_beta: after.topicBeta, muted: after.muted,
      streak: after.streak, last_read_on: after.lastReadOn,
    }).eq('id', user.id);
    if (error) console.error('profile learn update failed', error.message);
  }

  return NextResponse.json({ accepted: rows.length, dropped: events.length - valid.length, streak });
});
