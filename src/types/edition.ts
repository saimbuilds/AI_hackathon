// THE CONTRACT: backend-owned. Frontend builds against fixtures/edition.sample.json
// and asks for changes; it never edits this file. Editions are immutable snapshots.
//
// Citations: every body sentence carries `sources`, a list of 1-based indexes into
// that slot's `sources` array. Render them as superscripts (¹ ²) linking to the source.
import { z } from 'zod';

export const TrustSchema = z.object({
  outlets: z.number().int().min(1),
  label: z.enum(['confirmed', 'single-source', 'developing']),
  unknowns: z.string().optional(), // "What we don't know yet"
});

export const SourceRefSchema = z.object({ name: z.string(), url: z.url() });

export const WorldLineSchema = z.object({
  country: z.string(),
  outlet: z.string(),
  line: z.string(), // translated one-liner
  url: z.url(),
});

export const StorySlotSchema = z.object({
  storyId: z.uuid(),
  size: z.enum(['lead', 'major', 'minor', 'brief']),
  kicker: z.string(),
  headline: z.string(),
  dek: z.string(),
  body: z.array(z.object({ text: z.string(), sources: z.array(z.number().int().min(1)).min(1) })),
  whyThis: z.string(), // "Why you're seeing this"
  whyItMatters: z.string(),
  forYou: z.string().optional(), // implication for THIS reader; omitted if no grounded link
  trust: TrustSchema,
  distress: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]), // Calm mode
  sources: z.array(SourceRefSchema).min(1),
  primary: z.boolean().optional(), // one of the sources is the origin (regulator, court, company blog)
  imageUrl: z.url().optional(), // real photos only; absent = typographic treatment
  developing: z.object({ sinceLastRead: z.string(), dayCount: z.number().int().min(1) }).optional(),
  topics: z.array(z.string()),
  readMinutes: z.number().min(0.5),
  world: z.array(WorldLineSchema).optional(), // "How the world covered it"
  fromFriend: z.string().optional(), // "Saim thinks you'd like this"
});

export const QuizItemSchema = z.object({
  q: z.string(),
  options: z.array(z.string()).min(2).max(4),
  answer: z.number().int().min(0), // index into options
  storyId: z.uuid(),
});

export const EditionSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  date: z.iso.date(), // YYYY-MM-DD, reader's local date
  number: z.number().int().min(1),
  paperName: z.string(), // "The Saim Times"
  city: z.string(), // "Islamabad" -> "Islamabad Edition"
  tone: z.enum(['straight', 'new', 'witty']),
  weather: z.object({ hi: z.number(), lo: z.number(), summary: z.string() }).optional(),
  editorNote: z.string(),
  lead: StorySlotSchema,
  sections: z.array(z.object({ name: z.string(), slots: z.array(StorySlotSchema) })),
  offYourBeat: z.array(StorySlotSchema), // serendipity / exploration picks
  briefs: z.array(StorySlotSchema), // "In other news"
  threeThings: z.array(z.string()), // "3 things you learned today"
  quiz: z.array(QuizItemSchema), // personal recall quiz
  dailyThree: z.array(QuizItemSchema), // SAME for everyone today
  tomorrow: z.array(z.string()), // cliffhangers from developing stories
  everyonesFrontPage: z.array(StorySlotSchema), // 1-2 shared top stories (anti-bubble)
  calm: z.boolean(),
  gift: z
    .object({
      forName: z.string(),
      fromName: z.string(),
      relation: z.string(),
      language: z.enum(['en', 'ur']),
      largePrint: z.boolean(),
    })
    .optional(),
  extras: z.object({
    onThisDay: z.string().optional(),
    prayer: z.record(z.string(), z.string()).optional(),
    markets: z.record(z.string(), z.string()).optional(),
  }),
  meta: z.object({
    builtAt: z.iso.datetime(),
    fallback: z.boolean(), // true = built without the editor LLM (ranking + stored briefs + template copy)
    grounding: z.number().min(0).max(1).optional(), // share of brief sentences verified today
  }),
});

export type Trust = z.infer<typeof TrustSchema>;
export type SourceRef = z.infer<typeof SourceRefSchema>;
export type WorldLine = z.infer<typeof WorldLineSchema>;
export type StorySlot = z.infer<typeof StorySlotSchema>;
export type QuizItem = z.infer<typeof QuizItemSchema>;
export type Edition = z.infer<typeof EditionSchema>;
