import { test } from 'node:test';
import assert from 'node:assert/strict';
const { summariseTaste } = await import('../src/learning/taste');

const base = { stated: ['ai'], muted: ['celebrity'], memo: null, streak: 2, signals: { last7d: { reads: 3, saves: 1, lessLikeThis: 1 }, total: 9 }, firstPaperDate: '2026-10-17' };

test('taste ranks liked topics, lists avoids, and says what changed since yesterday', () => {
  const t = summariseTaste({ ...base, beta: { ai: [3, 1], cricket: [1.5, 1], celebrity: [1, 4], f1: [1, 3.5] }, deltas: new Map([['ai', { d1: 1.4, d7: 2 }], ['f1', { d1: -1.2, d7: -1.2 }]]) });
  assert.equal(t.likes[0].topic, 'ai');
  assert.equal(t.likes[0].origin, 'you said');
  assert.ok(!t.likes.some((l) => l.topic === 'celebrity'));
  assert.deepEqual(t.avoids.map((a) => a.topic).sort(), ['celebrity', 'f1']);
  assert.match(t.headline, /leaned into AI/);
  assert.match(t.headline, /pulled back from Formula 1/);
});

test('a brand new reader is told how to teach the paper', () => {
  const t = summariseTaste({ ...base, signals: { last7d: { reads: 0, saves: 0, lessLikeThis: 0 }, total: 0 }, beta: {}, deltas: new Map() });
  assert.match(t.headline, /No reading signals yet/);
});
