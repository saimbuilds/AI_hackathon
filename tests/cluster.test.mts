import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assignArticles, findParent, provisionalImportance, type EmbeddedArticle, type StoryState } from '../src/press/cluster';
import { canonicalUrl, titleKey, cleanText } from '../src/press/normalize';

// Hand-built unit vectors so the tests don't need the model.
const vec = (...xs: number[]) => { const v = Float32Array.from(xs); const n = Math.hypot(...xs); return v.map((x) => x / n); };
const art = (id: string, domain: string, e: Float32Array, kind = 'rss', hoursAgo = 1): EmbeddedArticle => ({
  id, sourceId: 's', sourceKind: kind, url: `https://${domain}/${id}`, title: `Title ${id} long enough`, excerpt: '', language: 'en',
  publishedAt: new Date(Date.now() - hoursAgo * 3_600_000), domain, embedding: e,
});

test('similar articles join one story, distant ones open another', () => {
  const stories = new Map<string, StoryState>();
  let n = 0;
  const out = assignArticles(stories, [
    art('a', 'bbc.com', vec(1, 0.05, 0)), art('b', 'dawn.com', vec(1, 0.1, 0)), art('c', 'dw.com', vec(0, 1, 0)),
  ], () => `s${n++}`, 0.9);
  assert.equal(stories.size, 2);
  assert.equal(out[0].storyId, out[1].storyId);
  assert.notEqual(out[0].storyId, out[2].storyId);
  const big = stories.get(out[0].storyId)!;
  assert.equal(big.outlets.size, 2);
  assert.equal(big.n, 2);
});

test('primary source flags the story; centroid stays unit length', () => {
  const stories = new Map<string, StoryState>();
  assignArticles(stories, [art('a', 'bbc.com', vec(1, 0, 0)), art('b', 'fed.gov', vec(1, 0.02, 0), 'primary')], () => 's', 0.9);
  const s = [...stories.values()][0];
  assert.ok(s.primary);
  assert.ok(Math.abs(Math.hypot(...s.centroid) - 1) < 1e-5);
});

test('threading picks the closest older story above the threshold only', () => {
  const older = [{ id: 'old1', centroid: vec(1, 0, 0), dayCount: 2 }, { id: 'old2', centroid: vec(0, 1, 0), dayCount: 1 }];
  assert.deepEqual(findParent(vec(1, 0.1, 0), older, 0.9)?.parentId, 'old1');
  assert.equal(findParent(vec(1, 0.1, 0), older, 0.9)?.dayCount, 3);
  assert.equal(findParent(vec(0, 0, 1), older, 0.9), null);
});

test('importance grows with outlets and is bounded 0-10', () => {
  assert.ok(provisionalImportance(1, false, 0, 1) < provisionalImportance(4, false, 0, 4));
  assert.ok(provisionalImportance(4, true, 0, 4) > provisionalImportance(4, false, 0, 4));
  assert.equal(provisionalImportance(1000, true, 10, 10), 10);
});

test('canonicalUrl strips tracking, titleKey ignores outlet suffix, cleanText decodes', () => {
  assert.equal(canonicalUrl('https://www.bbc.co.uk/news/articles/x?at_medium=RSS&at_campaign=rss&utm_source=a#frag'), 'https://www.bbc.co.uk/news/articles/x');
  assert.equal(canonicalUrl('ftp://x.com/a'), null);
  assert.equal(titleKey('Trump waives sanctions | Dawn'), titleKey('Trump waives sanctions'));
  assert.equal(cleanText('<p>Caf&eacute; &amp; &#8217;s</p>'.replace('&eacute;', 'e')), 'Cafe & ’s');
});
