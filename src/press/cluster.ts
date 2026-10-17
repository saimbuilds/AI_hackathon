// Pure clustering / threading / importance logic (no I/O) so it can be unit-tested and tuned.
import { dot, normalize } from '../lib/vec';
import type { Article } from './normalize';

// e5 similarities live in a compressed band: same-event headlines score ~0.85-0.94, unrelated
// news up to ~0.89. Tuned on 1.5k real articles (scripts/tune-cluster.mts): 0.86 snowballs into a
// 500-article blob, 0.90 keeps events pure, 0.93 starts splitting real ones. Env overrides for experiments.
export const CLUSTER_MIN = Number(process.env.CLUSTER_MIN ?? 0.9);
export const THREAD_MIN = Number(process.env.THREAD_MIN ?? 0.86);

// CJK and Thai text embeds into a tighter band, so unrelated articles score high: demand more.
const TIGHT_BAND = new Set(['zh', 'ja', 'ko', 'th']);
export const thresholdFor = (language: string, base: number) => (TIGHT_BAND.has(language) ? base + 0.04 : base);

export type EmbeddedArticle = Article & { id: string; embedding: Float32Array };

export type StoryState = {
  id: string;
  centroid: Float32Array;
  n: number; // articles folded into the centroid
  outlets: Set<string>; // distinct domains
  primary: boolean; // any article is from a primary source
  firstSeen: Date;
  updatedAt: Date;
  headline: string;
  imageUrl?: string;
  recent: number; // articles published in the last 6h (growth signal), recomputed per run
  isNew: boolean;
  dirty: boolean;
};

export type Assignment = { article: EmbeddedArticle; storyId: string };

export function assignArticles(stories: Map<string, StoryState>, items: EmbeddedArticle[], newId: () => string, minSim = CLUSTER_MIN, now = Date.now()): Assignment[] {
  const out: Assignment[] = [];
  const sorted = [...items].sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime());
  for (const a of sorted) {
    let best: StoryState | undefined;
    let bestSim = -1;
    for (const s of stories.values()) {
      const sim = dot(s.centroid, a.embedding);
      if (sim > bestSim) { bestSim = sim; best = s; }
    }
    let story: StoryState;
    if (best && bestSim >= thresholdFor(a.language, minSim)) {
      story = best;
      const merged = new Float32Array(story.centroid.length);
      for (let i = 0; i < merged.length; i++) merged[i] = story.centroid[i] * story.n + a.embedding[i];
      story.centroid = normalize(merged);
      story.n += 1;
      story.dirty = true;
    } else {
      story = { id: newId(), centroid: a.embedding, n: 1, outlets: new Set(), primary: false, firstSeen: a.publishedAt, updatedAt: a.publishedAt, headline: a.title, imageUrl: a.imageUrl, recent: 0, isNew: true, dirty: true };
      stories.set(story.id, story);
    }
    story.outlets.add(a.domain);
    if (a.sourceKind === 'primary' || a.sourceKind === 'arxiv') story.primary = true;
    if (a.publishedAt > story.updatedAt) story.updatedAt = a.publishedAt;
    if (a.publishedAt < story.firstSeen) story.firstSeen = a.publishedAt;
    if (!story.imageUrl && a.imageUrl) story.imageUrl = a.imageUrl;
    if (now - a.publishedAt.getTime() < 6 * 3_600_000) story.recent += 1;
    out.push({ article: a, storyId: story.id });
  }
  return out;
}

// A new story that sits close to a 2-7 day old story continues it ("Developing · Day N").
export function findParent(centroid: Float32Array, older: { id: string; centroid: Float32Array; dayCount: number }[], minSim = THREAD_MIN) {
  let best: (typeof older)[number] | undefined;
  let bestSim = -1;
  for (const o of older) {
    const sim = dot(centroid, o.centroid);
    if (sim > bestSim) { bestSim = sim; best = o; }
  }
  return best && bestSim >= minSim ? { parentId: best.id, dayCount: best.dayCount + 1, sim: bestSim } : null;
}

// Provisional 0-10 importance from coverage alone; the enrichment pass blends in an LLM rating.
// outlets 1 -> 1, 2 -> 3, 4 -> 5, 8 -> 8, 16 -> 10; primary source and fast growth add a bump.
export function provisionalImportance(outlets: number, primary: boolean, recent: number, total: number): number {
  let score = 1 + 2.2 * Math.log2(Math.max(1, outlets));
  if (primary) score += 1.5;
  if (outlets >= 3 && total > 0 && recent / total > 0.5) score += 1;
  return Math.max(0, Math.min(10, Math.round(score)));
}
