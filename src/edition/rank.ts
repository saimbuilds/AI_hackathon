// Ranking: score -> MMR diversify -> Thompson-sampled exploration. Pure functions (no I/O) so they
// are testable and cheap: no LLM is involved in choosing what goes in a reader's paper.
import { addScaled, dot, normalize } from '../lib/vec';

export type Cand = {
  id: string;
  headline: string;
  dek: string | null;
  whyItMatters: string | null;
  category: string | null;
  topics: string[];
  entities: { name: string; type: string }[];
  importance: number;
  distress: number;
  sourceCount: number;
  isPrimary: boolean;
  updatedAt: Date;
  firstSeen: Date;
  dayCount: number;
  parentId: string | null;
  unknowns: string | null;
  quiz: { q: string; options: string[]; answer: number } | null;
  world: { country: string; outlet: string; line: string; url: string }[] | null;
  imageUrl: string | null;
  embedding: Float32Array;
  region: string; // dominant source region (for the local boost)
  sentences: { text: string; sourceIds: string[] }[];
  articles: { id: string; name: string; url: string }[];
  friend?: string | null; // "Saim thinks you'd like this"
};

export type ReaderModel = {
  vecLong: Float32Array | null;
  vecShort: Float32Array | null;
  topicBeta: Record<string, [number, number]>;
  mutedTopics: string[];
  mutedStories: string[];
  mutedSources: string[]; // outlet names
  country: string; // ISO-ish region code of the reader, '' if unknown
  calm: boolean;
};

export const WEIGHTS = { relevance: 0.35, topic: 0.32, importance: 0.13, freshness: 0.1, sources: 0.1, local: 0.05 } as const;
export const MMR_LAMBDA = 0.7;
// A topic the reader has clearly turned down (posterior mean below this, with some evidence) is demoted, not just nudged,
// so a single "less like this" is visible in the very next paper.
export const DISLIKE_BELOW = 0.4;
export const DISLIKE_PENALTY = 0.6;

export const userVector = (r: ReaderModel): Float32Array | null => {
  if (!r.vecLong && !r.vecShort) return null;
  const out = new Float32Array((r.vecLong ?? r.vecShort)!.length);
  if (r.vecLong) addScaled(out, r.vecLong, 0.7);
  if (r.vecShort) addScaled(out, r.vecShort, r.vecLong ? 0.3 : 1);
  return normalize(out);
};

const betaMean = (b?: [number, number]) => (b ? b[0] / (b[0] + b[1]) : 0.5);

// How strongly the reader has turned down the story's most-disliked topic (0 = not at all).
export function dislike(topics: string[], beta: Record<string, [number, number]>): number {
  let worst = 1;
  for (const t of topics) {
    const b = beta[t];
    if (b && b[0] + b[1] >= 3) worst = Math.min(worst, b[0] / (b[0] + b[1]));
  }
  return Math.max(0, DISLIKE_BELOW - worst);
}

export function topicAffinity(topics: string[], beta: Record<string, [number, number]>): number {
  if (!topics.length) return 0.5;
  // Best-matching topic counts most: a story tagged [ai, software, startups] should win on its AI match, not be averaged down.
  const means = topics.map((t) => betaMean(beta[t]));
  return 0.6 * Math.max(...means) + 0.4 * (means.reduce((a, b) => a + b, 0) / means.length);
}

// e5 cosine lives in a narrow band, so rescale relevance across today's candidates (0..1).
export function relevance(cands: Cand[], user: Float32Array | null): Map<string, number> {
  const out = new Map<string, number>();
  if (!user) { cands.forEach((c) => out.set(c.id, 0.5)); return out; }
  const sims = cands.map((c) => dot(user, c.embedding));
  const lo = Math.min(...sims);
  const hi = Math.max(...sims);
  cands.forEach((c, i) => out.set(c.id, hi - lo < 1e-6 ? 0.5 : (sims[i] - lo) / (hi - lo)));
  return out;
}

export type Scored = { cand: Cand; score: number; rel: number; topic: number };

export function score(cands: Cand[], reader: ReaderModel, now = Date.now(), coRead: Map<string, number> = new Map()): Scored[] {
  const rel = relevance(cands, userVector(reader));
  return cands.map((cand) => {
    const ageH = Math.max(0, (now - cand.updatedAt.getTime()) / 3_600_000);
    const topic = topicAffinity(cand.topics, reader.topicBeta);
    const total =
      WEIGHTS.relevance * rel.get(cand.id)! -
      DISLIKE_PENALTY * dislike(cand.topics, reader.topicBeta) +
      WEIGHTS.topic * topic +
      WEIGHTS.importance * (cand.importance / 10) +
      WEIGHTS.freshness * Math.exp(-ageH / 18) +
      WEIGHTS.sources * Math.min(1, Math.log2(Math.max(1, cand.sourceCount)) / 4) +
      WEIGHTS.local * (reader.country && cand.region === reader.country ? 1 : 0) +
      0.08 * Math.min(1, coRead.get(cand.id) ?? 0) + // "readers like you finished this"
      (cand.friend ? 0.15 : 0); // a friend's pick gets a real shot
    return { cand, score: total, rel: rel.get(cand.id)!, topic };
  });
}

// Max Marginal Relevance: stop the lead from being five versions of one topic.
export function mmr(scored: Scored[], k: number, lambda = MMR_LAMBDA): Scored[] {
  const pool = [...scored].sort((a, b) => b.score - a.score);
  const picked: Scored[] = [];
  const sim = (a: Cand, b: Cand) => Math.max(0, Math.min(1, (dot(a.embedding, b.embedding) - 0.75) / 0.2)); // e5 band -> 0..1
  while (picked.length < k && pool.length) {
    let bestI = 0;
    let bestV = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const penalty = picked.length ? Math.max(...picked.map((p) => sim(pool[i].cand, p.cand))) : 0;
      const v = lambda * pool[i].score - (1 - lambda) * penalty;
      if (v > bestV) { bestV = v; bestI = i; }
    }
    picked.push(pool.splice(bestI, 1)[0]);
  }
  return picked;
}

// Gamma/Beta sampling (Marsaglia-Tsang) so we can Thompson-sample topic preferences.
function gamma(shape: number, rand: () => number): number {
  if (shape < 1) return gamma(shape + 1, rand) * Math.pow(rand(), 1 / shape);
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number, v: number;
    do {
      const u1 = rand() || 1e-9, u2 = rand();
      x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rand() || 1e-9;
    if (Math.log(u) < 0.5 * x * x + d - d * v + d * Math.log(v)) return d * v;
  }
}
export const sampleBeta = (a: number, b: number, rand: () => number = Math.random): number => {
  const x = gamma(a, rand), y = gamma(b, rand);
  return x / (x + y);
};

// "Off Your Beat": 10-15% of slots chosen by Thompson sampling over topic preferences, from stories
// outside the reader's usual interests. Wide posteriors (little evidence) explore more.
export function exploreTopics(rest: Scored[], reader: ReaderModel, n: number, rand: () => number = Math.random): Scored[] {
  if (n <= 0 || !rest.length) return [];
  const byRel = [...rest].sort((a, b) => a.rel - b.rel);
  const offBeat = byRel.slice(0, Math.max(n, Math.ceil(byRel.length * 0.6))); // least aligned 60%
  const ranked = offBeat
    .filter((s) => s.cand.importance >= 4 && s.cand.sourceCount >= 2)
    .map((s) => {
      const thetas = s.cand.topics.map((t) => sampleBeta(...(reader.topicBeta[t] ?? [1, 1]), rand));
      return { s, draw: (thetas.length ? Math.max(...thetas) : rand()) * (0.5 + s.cand.importance / 20) };
    })
    .sort((a, b) => b.draw - a.draw);
  const out: Scored[] = [];
  for (const { s } of ranked) {
    if (out.some((o) => dot(o.cand.embedding, s.cand.embedding) > 0.9)) continue; // no near-duplicate surprises
    out.push(s);
    if (out.length === n) break;
  }
  return out;
}

export const matchedTopics = (c: Cand, r: ReaderModel, min = 0.6): string[] => c.topics.filter((t) => betaMean(r.topicBeta[t]) >= min);
