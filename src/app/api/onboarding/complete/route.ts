import { NextResponse } from 'next/server';
import { z } from 'zod';
import { fail, parseJson, rateLimit, requireUser, route } from '@/lib/http';
import { coldStart, type SwipeAction } from '@/lib/profile';
import { adminClient } from '@/lib/supabase';
import { TOPICS } from '@/lib/taxonomy';
import { fromPg, toPg } from '@/lib/vec';

const slugs = Object.keys(TOPICS) as [string, ...string[]];
const validTz = (tz: string) => { try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch { return false; } };

const Body = z.object({
  name: z.string().trim().min(1).max(40),
  paperName: z.string().trim().min(1).max(60).optional(), // "The Saim Times"
  city: z.string().trim().max(60).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
  tz: z.string().refine(validTz, 'unknown time zone').default('UTC'),
  deliveryTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default('07:00'),
  size: z.enum(['espresso', 'standard', 'long']).default('standard'),
  tone: z.enum(['straight', 'new', 'witty']).default('straight'),
  language: z.enum(['en', 'ur']).default('en'),
  largePrint: z.boolean().default(false),
  calm: z.boolean().default(false),
  role: z.string().max(80).optional(),
  goals: z.string().max(160).optional(),
  extras: z.object({ weather: z.boolean(), prayer: z.boolean(), markets: z.boolean(), cricket: z.boolean(), onThisDay: z.boolean(), quiz: z.boolean(), audio: z.boolean() }).partial().default({}),
  // The (edited) chips from /api/onboarding/parse.
  interests: z.object({
    chips: z.array(z.string().max(60)).max(15).default([]),
    topics: z.array(z.enum(slugs)).max(10).default([]),
    entities: z.array(z.string().max(60)).max(12).default([]),
    negatives: z.array(z.string().max(60)).max(10).default([]),
    negativeTopics: z.array(z.enum(slugs)).max(8).default([]),
  }).default({ chips: [], topics: [], entities: [], negatives: [], negativeTopics: [] }),
  swipes: z.array(z.object({ storyId: z.uuid(), action: z.enum(['love', 'yes', 'no']) })).max(30).default([]),
  email: z.email().optional(),
  emailOptIn: z.boolean().default(false),
});

// POST /api/onboarding/complete -> saves the profile and its first taste vectors.
export const POST = route(async (req) => {
  const user = await requireUser(req);
  rateLimit(`complete:user:${user.id}`, 6, 60_000);
  const b = await parseJson(req, Body);
  const db = adminClient()!;

  const wanted = [...b.interests.topics, ...b.interests.negativeTopics];
  const { data: topicRows, error: tErr } = wanted.length ? await db.from('topic_vectors').select('topic,embedding').in('topic', wanted) : { data: [], error: null };
  if (tErr) return fail(500, 'Could not load topic fingerprints');
  const tv = new Map((topicRows ?? []).map((r) => [r.topic as string, fromPg(r.embedding as string)]));

  const swipeIds = b.swipes.map((s) => s.storyId);
  const { data: storyRows, error: sErr } = swipeIds.length ? await db.from('stories').select('id,embedding,topics').in('id', swipeIds).not('embedding', 'is', null) : { data: [], error: null };
  if (sErr) return fail(500, 'Could not load swiped stories');
  const sv = new Map((storyRows ?? []).map((r) => [r.id as string, { vec: fromPg(r.embedding as string), topics: (r.topics as string[]) ?? [] }]));

  const { vec, topicBeta } = coldStart({
    topics: b.interests.topics.flatMap((slug) => (tv.has(slug) ? [{ slug, vec: tv.get(slug)! }] : [])),
    negativeTopics: b.interests.negativeTopics.flatMap((slug) => (tv.has(slug) ? [{ slug, vec: tv.get(slug)! }] : [])),
    swipes: b.swipes.flatMap((s) => (sv.has(s.storyId) ? [{ action: s.action as SwipeAction, vec: sv.get(s.storyId)!.vec, topics: sv.get(s.storyId)!.topics.filter((t) => t in TOPICS) }] : [])),
  });

  const { error } = await db.from('profiles').update({
    name: b.name, paper_name: b.paperName ?? `The ${b.name} Times`, city: b.city ?? null, lat: b.lat ?? null, lon: b.lon ?? null, tz: b.tz, delivery_time: b.deliveryTime,
    size: b.size, tone: b.tone, language: b.language, large_print: b.largePrint, calm: b.calm, role: b.role ?? null, goals: b.goals ?? null, extras: b.extras,
    interests: b.interests, topic_beta: topicBeta, muted: { topics: b.interests.negativeTopics, sources: [], stories: [] },
    vec_long: vec ? toPg(vec) : null, vec_short: vec ? toPg(vec) : null,
    ...(b.email ? { email: b.email } : {}), email_opt_in: b.emailOptIn, onboarded_at: new Date().toISOString(),
  }).eq('id', user.id);
  if (error) return fail(500, 'Could not save your profile');

  return NextResponse.json({ ok: true, coldStart: vec ? 'vector' : 'none', topics: Object.keys(topicBeta).length });
});
