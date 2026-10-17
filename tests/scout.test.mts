import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
process.env.LLM_DISABLED = '1'; // vetting falls back to the heuristic
const { normalizeBeat, beatSlug, feedLinksFromHtml, discoverDomains, probeDomain, vet, heuristicVet } = await import('../src/scout/scout');
const { nicheChips } = await import('../src/lib/onboarding');

const recent = new Date(Date.now() - 3_600_000).toUTCString();
const rss = (title: string, items: string[]) => `<?xml version="1.0"?><rss version="2.0"><channel><title>${title}</title>${items.map((t, i) => `<item><title>${t}</title><link>https://x.test/${i}</link><pubDate>${recent}</pubDate></item>`).join('')}</channel></rss>`;

let routes: Record<string, () => Response> = {};
let calls: string[] = [];
const stub = (r: Record<string, () => Response>) => {
  routes = r;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    const hit = Object.entries(routes).find(([k]) => url.startsWith(k) || url.includes(k));
    return hit ? hit[1]() : new Response('nope', { status: 404 });
  }) as typeof fetch;
};
beforeEach(() => { calls = []; });

test('beats are normalised and slugged', () => {
  assert.equal(normalizeBeat('  Formula-E!!  Racing '), 'formula-e racing');
  assert.equal(beatSlug('Formula E racing'), 'formula-e-racing');
});

test('feed autodiscovery reads <link rel=alternate> and resolves relative URLs', () => {
  const html = `<head><link rel="alternate" type="application/rss+xml" href="/feed.xml"><link rel="alternate" type="application/atom+xml" href="https://x.test/atom?a=1&amp;b=2"><link rel="stylesheet" href="/s.css"><link rel="alternate" hreflang="fr" href="/fr"></head>`;
  assert.deepEqual(feedLinksFromHtml(html, 'https://x.test/'), ['https://x.test/feed.xml', 'https://x.test/atom?a=1&b=2']);
  assert.deepEqual(feedLinksFromHtml('<p>no links</p>', 'https://x.test/'), []);
});

test('Google News results become outlet domains ranked by frequency, skipping aggregators', async () => {
  const gn = `<?xml version="1.0"?><rss version="2.0"><channel>${[
    ['A', 'https://www.motorsport.com'], ['B', 'https://motorsport.com'], ['C', 'https://www.autosport.com'], ['D', 'https://www.youtube.com'], ['E', 'https://news.google.com'], ['F', 'https://motorsport.com'],
  ].map(([t, u]) => `<item><title>${t}</title><link>https://news.google.com/x</link><source url="${u}">src</source></item>`).join('')}</channel></rss>`;
  stub({ 'https://news.google.com/rss/search': () => new Response(gn) });
  const d = await discoverDomains('formula e');
  assert.deepEqual(d.map((x) => x.domain), ['motorsport.com', 'autosport.com']);
  assert.ok(d[0].hits >= 3);
});

test('probeDomain prefers a beat-specific tag feed and rejects dead or stale feeds', async () => {
  stub({
    'https://site.test/tag/formula-e/feed': () => new Response(rss('Formula E', ['Formula E: Berlin E-Prix preview', 'Formula E teams react'])),
    'https://site.test/feed': () => new Response(rss('Site', ['Unrelated cooking story'])),
    'https://site.test': () => new Response('<html></html>'),
  });
  const c = await probeDomain('site.test', 'formula e');
  assert.ok(c && c.viaTag && c.feedUrl.endsWith('/tag/formula-e/feed') && c.beatHits === 2);

  const old = new Date(Date.now() - 90 * 86_400_000).toUTCString();
  stub({ 'https://stale.test/feed': () => new Response(`<rss version="2.0"><channel><title>Old</title><item><title>t</title><link>https://s.test/1</link><pubDate>${old}</pubDate></item></channel></rss>`), 'https://stale.test': () => new Response('<html></html>') });
  assert.equal(await probeDomain('stale.test', 'formula e'), null);
  stub({});
  assert.equal(await probeDomain('dead.test', 'formula e'), null);
});

test('without an LLM, vetting keeps feeds that are on-topic and drops ones that are not', async () => {
  const c = (over: object) => ({ domain: 'd', feedUrl: 'u', title: 't', recent: [], beatHits: 0, viaTag: false, ...over });
  assert.ok(heuristicVet(c({ viaTag: true })));
  assert.ok(heuristicVet(c({ beatHits: 2 })));
  assert.ok(!heuristicVet(c({})));
  const { kept, by } = await vet('formula e', [c({ domain: 'good', beatHits: 3 }), c({ domain: 'bad' })]);
  assert.equal(by, 'heuristic');
  assert.deepEqual(kept.map((k) => k.domain), ['good']);
});

test('niche chips are the ones that map to no fixed topic', () => {
  const n = nicheChips(['AI startups', 'Formula E', 'Kenyan fintech', 'cricket', 'ab']);
  assert.ok(n.includes('Formula E') && n.includes('Kenyan fintech'));
  assert.ok(!n.includes('cricket') && !n.includes('ab'));
});
