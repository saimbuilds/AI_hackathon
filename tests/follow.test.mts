// Ask grounding and search-query safety (no network, no database).
import { test } from 'node:test';
import assert from 'node:assert/strict';
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
const { toTsQuery, groundAnswer, heuristicKeywords, NOT_COVERED } = await import('../src/follow/ask');
const { FREE_FOLLOW_LIMIT } = await import('../src/follow/watch');

const doc = (id: string, text: string) => ({ id, headline: `H ${id}`, dek: '', text, updatedAt: '2026-10-17T00:00:00Z', parentId: null, source: { name: 'Dawn', url: `https://dawn.com/${id}` } });
const meta = { keywords: [], topic: null, model: 'x' };

test('tsquery keeps letters and digits only, so input cannot break or inject the query', () => {
  assert.equal(toTsQuery(["cars'); drop table x;--", 'Pakistan']), '(cars:* & drop:* & table:*) | pakistan:*');
  assert.equal(toTsQuery(['the', '!!']), null);
});

test('heuristic keywords drop stopwords', () => {
  assert.deepEqual(heuristicKeywords('What do new cars cost in Pakistan?'), ['cars', 'pakistan']);
});

test('answer sentences need a valid citation and figures that appear in the cited story', () => {
  const docs = [doc('a', 'Gold rose to Rs437,836 per tola.'), doc('b', 'Fuel prices were unchanged.')];
  const a = groundAnswer({ covered: true, sentences: [
    { text: 'Gold rose to Rs437,836 per tola.', stories: [1] },
    { text: 'Gold will hit Rs500,000 next week.', stories: [1] }, // invented figure
    { text: 'Uncited claim.', stories: [9] },                     // citation out of range
    { text: 'Fuel prices were unchanged.', stories: [2] },
  ] }, docs, meta);
  assert.equal(a.sentences.length, 2);
  assert.deepEqual(a.sentences.map((s) => s.sources), [[1], [2]]);
  assert.deepEqual(a.sources.map((s) => s.storyId), ['a', 'b']);
  assert.equal(a.covered, true);
});

test('not covered = plain "not yet" answer with no padding', () => {
  const a = groundAnswer({ covered: false, sentences: [{ text: 'The stories do not give prices.', stories: [1] }] }, [doc('a', 'x')], meta);
  assert.equal(a.covered, false);
  assert.equal(a.answer, NOT_COVERED);
  assert.equal(a.sources.length, 0);
});

test('free plan follows', () => assert.equal(FREE_FOLLOW_LIMIT, 3));
