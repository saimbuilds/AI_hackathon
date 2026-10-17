// THE CONTRACT (events): what the reader logs and what the edition build streams.
// Backend-owned. The reader posts batches to POST /api/events from the first deploy.
import { z } from 'zod';

export const EVENT_TYPES = [
  'edition_open', // paper opened (storyId omitted)
  'impression', // story entered the viewport
  'open', // story opened (drawer / full-screen card)
  'dwell', // meta.seconds
  'read_end', // read to the end of the brief
  'click_original', // meta.sourceIndex
  'save',
  'more', // "More like this"
  'less', // "Less like this", meta.reason required
  'skip', // left swipe or < 2 s in view
  'quiz_answer', // meta.correct, meta.kind: 'personal' | 'daily3'
  'caught_up', // reached "You're all caught up"
  'share', // meta.channel: 'whatsapp' | 'link' | 'card' | 'friend'
  'mute', // meta.target: 'topic' | 'source', meta.value
] as const;

export const LESS_REASONS = ['topic', 'source', 'too-long', 'already-knew'] as const;

// Learning weights (BATTLE_PLAN §4.6). The server applies these; sent weights are ignored.
export const EVENT_WEIGHTS: Record<(typeof EVENT_TYPES)[number], number> = {
  edition_open: 0,
  impression: 0,
  open: 1,
  dwell: 1.5, // when seconds > 20
  read_end: 2.5,
  click_original: 2,
  save: 3,
  more: 4,
  less: -3,
  skip: -0.7,
  quiz_answer: 0,
  caught_up: 0,
  share: 2,
  mute: -3,
};

export const ReaderEventSchema = z.object({
  editionId: z.uuid(),
  storyId: z.uuid().optional(),
  type: z.enum(EVENT_TYPES),
  at: z.iso.datetime().optional(), // client time; server clamps to now
  meta: z
    .object({
      seconds: z.number().min(0).optional(),
      reason: z.enum(LESS_REASONS).optional(),
      sourceIndex: z.number().int().min(1).optional(),
      correct: z.boolean().optional(),
      kind: z.enum(['personal', 'daily3']).optional(),
      channel: z.enum(['whatsapp', 'link', 'card', 'friend']).optional(),
      target: z.enum(['topic', 'source']).optional(),
      value: z.string().max(120).optional(),
    })
    .default({}),
});

// POST /api/events  body
export const EventBatchSchema = z.object({ events: z.array(ReaderEventSchema).min(1).max(100) });

// GET /api/edition/build  (SSE, one JSON object per `data:` line): the printing-press stream.
export const BuildProgressSchema = z.discriminatedUnion('step', [
  z.object({ step: z.literal('queued'), position: z.number().int().min(0) }),
  z.object({ step: z.literal('reading'), articles: z.number().int(), sources: z.number().int() }),
  z.object({ step: z.literal('clustering'), stories: z.number().int() }),
  z.object({ step: z.literal('picking'), picked: z.number().int(), forName: z.string() }),
  z.object({ step: z.literal('layout') }), // "setting the front page"
  z.object({ step: z.literal('note') }), // "writing your editor's note"
  z.object({ step: z.literal('done'), editionId: z.uuid() }),
  z.object({ step: z.literal('error'), message: z.string(), retryable: z.boolean() }),
]);

export type EventType = (typeof EVENT_TYPES)[number];
export type ReaderEvent = z.infer<typeof ReaderEventSchema>;
export type EventBatch = z.infer<typeof EventBatchSchema>;
export type BuildProgress = z.infer<typeof BuildProgressSchema>;
