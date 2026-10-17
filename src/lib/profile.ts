// Cold start: turn parsed topics + swipes into the reader's first taste vectors and topic priors.
// All inputs are precomputed vectors (topic_vectors, stories.embedding); nothing is embedded here.
import { addScaled, normalize } from './vec';

export const SWIPE_WEIGHT = { love: 2, yes: 1, no: -0.6 } as const;
export type SwipeAction = keyof typeof SWIPE_WEIGHT;

const TOPIC_PRIOR = 0.8;
const NEGATIVE_TOPIC_PRIOR = -0.5;

export type ColdStartInput = {
  topics: { slug: string; vec: Float32Array }[];
  negativeTopics: { slug: string; vec: Float32Array }[];
  swipes: { action: SwipeAction; vec: Float32Array; topics: string[] }[];
};

export function coldStart(input: ColdStartInput): { vec: Float32Array | null; topicBeta: Record<string, [number, number]> } {
  const dim = input.topics[0]?.vec.length ?? input.swipes[0]?.vec.length ?? input.negativeTopics[0]?.vec.length ?? 0;
  const topicBeta: Record<string, [number, number]> = {};
  const bump = (slug: string, a: number, b: number) => {
    const cur = topicBeta[slug] ?? [1, 1];
    topicBeta[slug] = [cur[0] + a, cur[1] + b];
  };
  if (!dim) return { vec: null, topicBeta };

  const sum = new Float32Array(dim);
  for (const t of input.topics) { addScaled(sum, t.vec, TOPIC_PRIOR); bump(t.slug, 2, 0); } // stated interests outweigh a few swipes
  for (const t of input.negativeTopics) { addScaled(sum, t.vec, NEGATIVE_TOPIC_PRIOR); bump(t.slug, 0, 2); }
  for (const s of input.swipes) {
    addScaled(sum, s.vec, SWIPE_WEIGHT[s.action]);
    for (const slug of s.topics) {
      if (s.action === 'no') bump(slug, 0, 0.5);
      else bump(slug, s.action === 'love' ? 1 : 0.5, 0);
    }
  }
  const norm = Math.hypot(...sum);
  return { vec: norm < 1e-6 ? null : normalize(sum), topicBeta };
}
