import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exploreTopics, matchedTopics, mmr, relevance, sampleBeta, score, topicAffinity, userVector, type Cand, type ReaderModel } from '../src/edition/rank';
import { normalize } from '../src/lib/vec';

const unit = (...xs: number[]) => normalize(Float32Array.from(xs));
const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const cand = (id: string, over: Partial<Cand> = {}): Cand => ({
  id, headline: id, dek: null, whyItMatters: null, category: null, topics: [], entities: [], importance: 5, distress: 0, sourceCount: 3, isPrimary: false,
  updatedAt: new Date(), firstSeen: new Date(), dayCount: 1, parentId: null, unknowns: null, quiz: null, world: null, imageUrl: null,
  embedding: unit(1, 0, 0), region: 'global', sentences: [], articles: [], ...over,
});
const reader = (over: Partial<ReaderModel> = {}): ReaderModel => ({ vecLong: unit(1, 0, 0), vecShort: null, topicBeta: {}, mutedTopics: [], mutedStories: [], mutedSources: [], country: 'pk', calm: false, ...over });

test('relevance rescales the narrow cosine band across candidates to 0..1', () => {
  const rel = relevance([cand('a', { embedding: unit(1, 0.05, 0) }), cand('b', { embedding: unit(1, 0.4, 0) }), cand('c', { embedding: unit(0.2, 1, 0) })], unit(1, 0, 0));
  assert.equal(rel.get('a'), 1);
  assert.equal(rel.get('c'), 0);
  assert.ok(rel.get('b')! > 0 && rel.get('b')! < 1);
});

test('a story matching the reader beats an equally important one that does not', () => {
  const s = score([cand('match', { embedding: unit(1, 0, 0) }), cand('other', { embedding: unit(0, 1, 0) })], reader());
  assert.ok(s[0].score > s[1].score);
});

test('topic preference, locality, and a friend pick all lift the score', () => {
  const base = score([cand('x')], reader())[0].score;
  assert.ok(score([cand('x', { topics: ['f1'] })], reader({ topicBeta: { f1: [9, 1] } }))[0].score > base);
  assert.ok(score([cand('x', { region: 'pk' })], reader())[0].score > base);
  assert.ok(score([cand('x', { friend: 'Ayesha' })], reader())[0].score > base);
  assert.ok(score([cand('x', { topics: ['f1'] })], reader({ topicBeta: { f1: [1, 9] } }))[0].score < base);
});

test('a topic the reader clearly turned down is demoted well below an otherwise identical story', () => {
  const r = reader({ topicBeta: { energy: [2, 7] } });
  const [disliked, other] = score([cand('d', { topics: ['energy'] }), cand('o', { topics: ['f1'] })], r);
  assert.ok(other.score - disliked.score > 0.1, `gap ${other.score - disliked.score}`);
  // thin evidence is not enough to demote
  const thin = score([cand('t', { topics: ['energy'] })], reader({ topicBeta: { energy: [1, 1.9] } }))[0].score;
  const none = score([cand('t', { topics: ['energy'] })], reader())[0].score;
  assert.ok(Math.abs(none - thin) < 0.05);
});

test('fresher stories outrank stale ones, all else equal', () => {
  const s = score([cand('new'), cand('old', { updatedAt: new Date(Date.now() - 30 * 3_600_000) })], reader());
  assert.ok(s[0].score > s[1].score);
});

test('MMR avoids five near-duplicates in a row', () => {
  const dupes = Array.from({ length: 5 }, (_, i) => cand(`d${i}`, { embedding: unit(1, 0.001 * i, 0), importance: 9 }));
  const different = cand('diff', { embedding: unit(0.6, 0.8, 0), importance: 6 });
  const anchor = cand('far', { embedding: unit(-1, 0, 0), importance: 1 }); // anchors the min of the relevance scale
  const picked = mmr(score([...dupes, different, anchor], reader()), 2);
  assert.ok(picked.some((p) => p.cand.id === 'diff'), 'second pick should be the different story');
});

test('Thompson exploration picks off-beat, important, multi-outlet stories and skips near-duplicates', () => {
  const r = reader();
  const rest = score([
    cand('onbeat', { embedding: unit(1, 0, 0), topics: ['ai'] }),
    cand('climate', { embedding: unit(0, 1, 0), topics: ['climate'], importance: 8 }),
    cand('climate2', { embedding: unit(0.001, 1, 0), topics: ['climate'], importance: 8 }),
    cand('trivial', { embedding: unit(0, 0, 1), topics: ['fashion'], importance: 2 }),
    cand('single', { embedding: unit(0, 0.5, 1), topics: ['music'], importance: 8, sourceCount: 1 }),
  ], r);
  const picks = exploreTopics(rest, r, 2, seeded(5));
  const ids = picks.map((p) => p.cand.id);
  assert.ok(ids.includes('climate') || ids.includes('climate2'));
  assert.ok(!(ids.includes('climate') && ids.includes('climate2')));
  assert.ok(!ids.includes('trivial') && !ids.includes('single') && !ids.includes('onbeat'));
});

test('sampleBeta stays in (0,1) with the right mean', () => {
  const rand = seeded(11);
  const xs = Array.from({ length: 4000 }, () => sampleBeta(8, 2, rand));
  assert.ok(xs.every((x) => x > 0 && x < 1));
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  assert.ok(Math.abs(mean - 0.8) < 0.02, `mean ${mean}`);
});

test('helpers: topicAffinity, matchedTopics, userVector blend', () => {
  assert.equal(topicAffinity([], {}), 0.5);
  assert.ok(Math.abs(topicAffinity(['a', 'b'], { a: [3, 1], b: [1, 1] }) - 0.625) < 1e-9);
  assert.deepEqual(matchedTopics(cand('x', { topics: ['a', 'b'] }), reader({ topicBeta: { a: [3, 1], b: [1, 3] } })), ['a']);
  const v = userVector(reader({ vecLong: unit(1, 0, 0), vecShort: unit(0, 1, 0) }))!;
  assert.ok(v[0] > v[1] && v[1] > 0);
  assert.equal(userVector(reader({ vecLong: null, vecShort: null })), null);
});
