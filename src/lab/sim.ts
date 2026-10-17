// Learning Lab simulator. Simulated readers with hidden interests read a real story pool for several days;
// their actions go through the SAME learning code as production, and the next day's paper is built by the SAME
// ranking code. Three policies are compared on identical pools:
//   fold        full system: onboarding vectors + learning from every day's reading
//   onboarding  same cold start, never learns (the "onboarding only" baseline)
//   random      random stories from the same pool
// Pure and deterministic for a given seed, so it can be unit-tested.
import { farthestPoint } from '../lib/deck';
import { coldStart } from '../lib/profile';
import { applyEvents, type LearnEvent, type LearnState } from '../learning/update';
import { exploreTopics, mmr, score, type Cand, type ReaderModel } from '../edition/rank';
import type { Persona } from './personas';

export type Label = 'love' | 'open' | 'skip' | 'less';
export type Judge = (persona: Persona, stories: Cand[]) => Promise<Map<string, Label>>;
export type PolicyName = 'fold' | 'onboarding' | 'random';
export const POLICIES: PolicyName[] = ['fold', 'onboarding', 'random'];

export type LabConfig = { days: number; editionSize: number; exploreSlots: number; seed: number };
export const DEFAULT_CONFIG: LabConfig = { days: 7, editionSize: 14, exploreSlots: 2, seed: 42 };

export type DayStory = { id: string; headline: string; topics: string[]; label: Label };
export type DayResult = { day: number; relevance: number; loved: number; diversity: number; stories: DayStory[] };
export type PersonaResult = { id: string; name: string; bio: string; hidden: string[]; stated: string[]; policies: Record<PolicyName, DayResult[]> };

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const hashSeed = (s: string): number => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);

// Normalised Shannon entropy over each story's primary topic: 1 = evenly spread, 0 = a single-topic bubble.
export function diversity(stories: { topics: string[] }[]): number {
  if (stories.length < 2) return 0;
  const counts = new Map<string, number>();
  for (const s of stories) counts.set(s.topics[0] ?? '_', (counts.get(s.topics[0] ?? '_') ?? 0) + 1);
  const n = stories.length;
  const h = -[...counts.values()].reduce((acc, c) => acc + (c / n) * Math.log(c / n), 0);
  return Math.max(0, h / Math.log(n)); // max() also turns -0 into 0
}

const toEvents = (label: Label, c: Cand): LearnEvent[] => {
  const base = { storyVec: c.embedding, topics: c.topics };
  if (label === 'love') return [{ type: 'save', meta: {}, ...base }, { type: 'read_end', meta: {}, ...base }];
  if (label === 'open') return [{ type: 'read_end', meta: {}, ...base }];
  if (label === 'less') return [{ type: 'less', meta: { reason: 'topic' }, ...base }];
  return [{ type: 'skip', meta: {}, ...base }];
};

const readerOf = (s: LearnState, mutedTopics: string[]): ReaderModel => ({
  vecLong: s.vecLong, vecShort: s.vecShort, topicBeta: s.topicBeta, mutedTopics, mutedStories: [], mutedSources: [], country: '', calm: false,
});

function dayResult(day: number, picks: Cand[], labels: Map<string, Label>): DayResult {
  const stories = picks.map((c) => ({ id: c.id, headline: c.headline, topics: c.topics, label: labels.get(c.id) ?? 'skip' }));
  const n = Math.max(1, stories.length);
  return {
    day, relevance: stories.filter((s) => s.label === 'love' || s.label === 'open').length / n,
    loved: stories.filter((s) => s.label === 'love').length / n, diversity: diversity(stories), stories,
  };
}

export async function simulatePersona(persona: Persona, slices: Cand[][], topicVecs: Map<string, Float32Array>, judge: Judge, cfg: LabConfig = DEFAULT_CONFIG): Promise<PersonaResult> {
  const rand = rng(cfg.seed ^ hashSeed(persona.id));
  const negativeTopics = persona.dislikes.slice(0, 1); // the one dislike they mention at onboarding

  // Onboarding: the persona states part of what they like, then swipes a 12-card deck drawn from day 1.
  const day1 = [...slices[0]].sort((a, b) => b.importance - a.importance).slice(0, 220);
  const deck = farthestPoint(day1.map((c) => ({ emb: c.embedding, weight: Math.min(1, c.importance / 10) })), 12, rand).map((i) => day1[i]);
  const deckLabels = await judge(persona, deck);
  const { vec, topicBeta } = coldStart({
    topics: persona.stated.flatMap((slug) => (topicVecs.has(slug) ? [{ slug, vec: topicVecs.get(slug)! }] : [])),
    negativeTopics: negativeTopics.flatMap((slug) => (topicVecs.has(slug) ? [{ slug, vec: topicVecs.get(slug)! }] : [])),
    swipes: deck.map((c) => {
      const l = deckLabels.get(c.id) ?? 'skip';
      return { action: l === 'love' ? ('love' as const) : l === 'open' ? ('yes' as const) : ('no' as const), vec: c.embedding, topics: c.topics };
    }),
  });
  const start: LearnState = { vecLong: vec, vecShort: vec, topicBeta, muted: { topics: negativeTopics, sources: [], stories: [] }, streak: 0, lastReadOn: null };

  const out: Record<PolicyName, DayResult[]> = { fold: [], onboarding: [], random: [] };

  for (const policy of POLICIES) {
    let state: LearnState = structuredClone(start);
    const seen = new Set<string>();
    const r = rng(cfg.seed + hashSeed(`${persona.id}:${policy}`));

    for (let d = 0; d < Math.min(cfg.days, slices.length); d++) {
      const pool = slices[d].filter((c) => !seen.has(c.id) && !c.topics.some((t) => state.muted.topics.includes(t)));
      if (!pool.length) continue;
      const now = Math.max(...pool.map((c) => c.updatedAt.getTime())) + 3_600_000;

      let picks: Cand[];
      if (policy === 'random') {
        const shuffled = [...pool].sort(() => r() - 0.5);
        picks = shuffled.slice(0, cfg.editionSize);
      } else {
        const reader = readerOf(state, state.muted.topics);
        const scored = score(pool, reader, now);
        const main = mmr(scored, cfg.editionSize - cfg.exploreSlots);
        const taken = new Set(main.map((m) => m.cand.id));
        const off = exploreTopics(scored.filter((s) => !taken.has(s.cand.id)), reader, cfg.exploreSlots, r);
        picks = [...main, ...off].map((s) => s.cand);
      }
      picks.forEach((c) => seen.add(c.id));

      const labels = await judge(persona, picks);
      out[policy].push(dayResult(d + 1, picks, labels));

      if (policy === 'fold') state = applyEvents(state, picks.flatMap((c) => toEvents(labels.get(c.id) ?? 'skip', c)), `2026-10-${String(10 + d).padStart(2, '0')}`);
    }
  }
  return { id: persona.id, name: persona.name, bio: persona.bio, hidden: persona.hidden, stated: persona.stated, policies: out };
}

export type Summary = {
  byDay: Record<PolicyName, { day: number; relevance: number; diversity: number }[]>;
  gapVsOnboarding: { day: number; points: number }[]; // fold minus onboarding-only, per day: the learning effect
  fold: { day1: number; lastDay: number; first2: number; last3: number; liftPoints: number };
  baselines: { onboardingLast3: number; randomLast3: number; foldVsOnboarding: number; foldVsRandom: number };
  diversity: { fold: number; floor: number; ok: boolean };
};

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
export const DIVERSITY_FLOOR = 0.45; // normalised entropy below this is a one-topic bubble

export function summarize(results: PersonaResult[]): Summary {
  const days = Math.max(...results.flatMap((r) => POLICIES.map((p) => r.policies[p].length)), 0);
  const byDay = Object.fromEntries(POLICIES.map((p) => [p, Array.from({ length: days }, (_, i) => {
    const rows = results.map((r) => r.policies[p][i]).filter(Boolean);
    return { day: i + 1, relevance: mean(rows.map((x) => x.relevance)), diversity: mean(rows.map((x) => x.diversity)) };
  })])) as Summary['byDay'];
  const rel = (p: PolicyName) => byDay[p].map((d) => d.relevance);
  const last3 = (xs: number[]) => mean(xs.slice(-3));
  const foldRel = rel('fold');
  const foldDiv = mean(byDay.fold.map((d) => d.diversity));
  const gapVsOnboarding = byDay.fold.map((d, i) => ({ day: d.day, points: d.relevance - (byDay.onboarding[i]?.relevance ?? 0) }));
  return {
    byDay, gapVsOnboarding,
    fold: { day1: foldRel[0] ?? 0, lastDay: foldRel.at(-1) ?? 0, first2: mean(foldRel.slice(0, 2)), last3: last3(foldRel), liftPoints: last3(foldRel) - mean(foldRel.slice(0, 2)) },
    baselines: { onboardingLast3: last3(rel('onboarding')), randomLast3: last3(rel('random')), foldVsOnboarding: last3(foldRel) - last3(rel('onboarding')), foldVsRandom: last3(foldRel) - last3(rel('random')) },
    diversity: { fold: foldDiv, floor: DIVERSITY_FLOOR, ok: foldDiv >= DIVERSITY_FLOOR },
  };
}

// ---- a deterministic reader that does not use embeddings (ground truth independent of the system) -------------

export function keywordJudge(seed = 7, noise = 0.08): Judge {
  return async (persona, stories) => {
    const out = new Map<string, Label>();
    for (const c of stories) {
      const r = rng(seed ^ hashSeed(`${persona.id}:${c.id}`));
      const text = `${c.headline} ${c.dek ?? ''} `.toLowerCase();
      const hits = persona.keywords.filter((k) => text.includes(k)).length;
      let label: Label = hits >= 2 ? 'love' : hits === 1 ? 'open' : c.topics.some((t) => persona.dislikes.includes(t)) && r() < 0.35 ? 'less' : 'skip';
      if (r() < noise) label = label === 'skip' || label === 'less' ? 'open' : 'skip'; // people are inconsistent
      out.set(c.id, label);
    }
    return out;
  };
}
