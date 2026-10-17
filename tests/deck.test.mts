import { test } from 'node:test';
import assert from 'node:assert/strict';
import { farthestPoint } from '../src/lib/deck';
import { coldStart } from '../src/lib/profile';
import { dot, normalize } from '../src/lib/vec';

const unit = (...xs: number[]) => normalize(Float32Array.from(xs));
const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

test('farthest-point sampling spreads picks across clusters instead of repeating one topic', () => {
  // 3 tight clusters of 10 near-identical vectors each; ask for 3 picks.
  const base = [unit(1, 0, 0), unit(0, 1, 0), unit(0, 0, 1)];
  const cands = base.flatMap((b, c) => Array.from({ length: 10 }, (_, i) => ({ emb: unit(b[0] + i * 0.001, b[1] + i * 0.001, b[2] + i * 0.001), weight: 0.5 + c * 0.01 })));
  const picks = farthestPoint(cands, 3, seeded(7));
  const clusters = new Set(picks.map((i) => Math.floor(i / 10)));
  assert.equal(clusters.size, 3);
  assert.equal(new Set(picks).size, 3);
});

test('importance weight tilts a pick toward the important story among equally distant ones', () => {
  const cands = [{ emb: unit(1, 0, 0), weight: 1 }, { emb: unit(0, 1, 0), weight: 0.05 }, { emb: unit(0, 0, 1), weight: 0.95 }];
  const picks = farthestPoint(cands, 2, seeded(3), 0);
  assert.equal(picks[0], 0);
  assert.equal(picks[1], 2);
});

test('handles fewer candidates than requested and empty input', () => {
  assert.deepEqual(farthestPoint([], 12), []);
  assert.equal(farthestPoint([{ emb: unit(1, 0), weight: 1 }, { emb: unit(0, 1), weight: 1 }], 12).length, 2);
});

test('cold start: liked stories and topics pull the vector toward them, dislikes push away', () => {
  const ai = unit(1, 0, 0), gossip = unit(0, 1, 0), f1 = unit(0, 0, 1);
  const { vec, topicBeta } = coldStart({
    topics: [{ slug: 'ai', vec: ai }],
    negativeTopics: [{ slug: 'celebrity', vec: gossip }],
    swipes: [{ action: 'love', vec: f1, topics: ['f1'] }, { action: 'no', vec: gossip, topics: ['celebrity'] }],
  });
  assert.ok(vec);
  assert.ok(Math.abs(Math.hypot(...vec) - 1) < 1e-5);
  assert.ok(dot(vec, ai) > 0 && dot(vec, f1) > 0);
  assert.ok(dot(vec, gossip) < 0);
  assert.deepEqual(topicBeta.ai, [3, 1]); // a stated topic counts double
  assert.ok(topicBeta.celebrity[1] > topicBeta.celebrity[0]); // negatives weigh into beta
  assert.ok(topicBeta.f1[0] > topicBeta.f1[1]);
});

test('cold start with no signal yields no vector', () => {
  assert.equal(coldStart({ topics: [], negativeTopics: [], swipes: [] }).vec, null);
});
