// Builds worker/sources.json: curated list + a sample of the Kagi Kite catalog (MIT),
// validated live (fetch + parse + freshness). Dead or stale feeds are dropped.
// Run: pnpm sources:build        (about 2-4 min; re-run any time to refresh the catalog)
import { writeFileSync } from 'node:fs';
import Parser from 'rss-parser';
import pLimit from 'p-limit';
import { CURATED } from '../worker/curated-sources';
import type { Category, Pack, SourceKind } from '../src/lib/taxonomy';

const KITE_URL = 'https://raw.githubusercontent.com/kagisearch/kite-public/main/kite_feeds.json';
const SCALE = 0.6; // shrink the per-category caps below so the catalog stays crawlable
const OVERSAMPLE = 2.4; // candidates per kept slot, to survive dead feeds
const MAX_PER_HOST = 3; // Kite-sourced entries only; curated entries are never capped
const FRESH_DAYS: Record<string, number> = { rss: 21, world: 21, hn: 14, gnews: 7, primary: 120, arxiv: 14, reddit: 14, scrape: 30 };

type Source = {
  name: string; feedUrl: string; siteUrl?: string; kind: SourceKind; category: Category; region: string;
  language: string; pack: Pack; origin: 'curated' | 'kite';
};

// [kite category, our category, region, kept cap, pack]
const KITE_MAP: [string, Category, string, number, Pack][] = [
  // regions
  ['Pakistan', 'general', 'pk', 40, 'south-asia'], ['India', 'general', 'in', 25, 'south-asia'],
  ['Bangladesh', 'general', 'bd', 8, 'south-asia'], ['Middle East', 'world', 'mena', 25, 'middle-east'],
  ['Iran', 'world', 'ir', 6, 'middle-east'], ['Israel', 'world', 'il', 5, 'middle-east'],
  ['Palestine', 'world', 'ps', 5, 'middle-east'], ['UK', 'general', 'uk', 20, 'us-uk'],
  ['Ireland', 'general', 'ie', 3, 'us-uk'], ['Canada', 'general', 'ca', 6, 'us-uk'],
  ['Australia', 'general', 'au', 6, 'core'], ['New Zealand', 'general', 'nz', 3, 'core'],
  ['Africa', 'world', 'africa', 12, 'core'], ['Asia', 'world', 'asia', 15, 'core'], ['Europe', 'world', 'eu', 15, 'core'],
  ['Central and South America', 'world', 'latam', 4, 'core'], ['Caribbean', 'world', 'latam', 2, 'core'],
  ['Kenya', 'general', 'ke', 5, 'core'], ['Nigeria', 'general', 'ng', 5, 'core'], ['South Africa', 'general', 'za', 4, 'core'],
  ['Ghana', 'general', 'gh', 3, 'core'], ['Singapore', 'general', 'sg', 3, 'core'], ['Malaysia', 'general', 'my', 4, 'core'],
  ['Philippines', 'general', 'ph', 3, 'core'], ['Indonesia', 'general', 'id', 4, 'core'], ['Japan', 'general', 'jp', 6, 'world'],
  ['South Korea', 'general', 'kr', 5, 'world'], ['China', 'general', 'cn', 5, 'world'], ['Hong Kong', 'general', 'hk', 3, 'world'],
  ['Taiwan', 'general', 'tw', 4, 'world'], ['Turkey', 'general', 'tr', 5, 'world'], ['Russia', 'general', 'ru', 4, 'world'],
  ['Ukraine', 'general', 'ua', 4, 'world'], ['Germany', 'general', 'de', 5, 'world'], ['France', 'general', 'fr', 6, 'world'],
  ['Spain', 'general', 'es', 5, 'world'], ['Italy', 'general', 'it', 4, 'world'], ['Brazil', 'general', 'br', 5, 'world'],
  ['Mexico', 'general', 'mx', 4, 'world'], ['Argentina', 'general', 'ar', 4, 'world'], ['Chile', 'general', 'cl', 3, 'world'],
  ['Colombia', 'general', 'co', 3, 'world'], ['Poland', 'general', 'pl', 3, 'world'], ['Greece', 'general', 'gr', 2, 'world'],
  ['The Netherlands', 'general', 'nl', 3, 'world'], ['Sweden', 'general', 'se', 2, 'world'], ['Morocco', 'general', 'ma', 4, 'world'],
  ['Algeria', 'general', 'dz', 2, 'world'], ['Ethiopia', 'general', 'et', 2, 'world'], ['Tanzania', 'general', 'tz', 2, 'world'],
  ['Vietnam', 'general', 'vn', 3, 'world'], ['Thailand', 'general', 'th', 3, 'world'],
  // topics
  ['AI', 'ai', 'global', 20, 'tech'], ['Climate Change', 'climate', 'global', 12, 'core'], ['Cybersecurity', 'security', 'global', 10, 'tech'],
  ['Economy', 'economy', 'global', 12, 'core'], ['Energy', 'energy', 'global', 8, 'core'], ['Defense', 'defense', 'global', 6, 'core'],
  ['Diplomacy', 'politics', 'global', 5, 'core'], ['Space', 'space', 'global', 10, 'core'], ['Medicine', 'health', 'global', 6, 'core'],
  ['Healthcare | USA', 'health', 'us', 4, 'us-uk'], ['Formula 1', 'f1', 'global', 8, 'sports'], ['Motorsports', 'sports', 'global', 3, 'sports'],
  ['Soccer', 'football', 'global', 8, 'sports'], ['NBA', 'sports', 'us', 3, 'sports'], ['MLB', 'sports', 'us', 2, 'sports'],
  ['NFL', 'sports', 'us', 2, 'sports'], ['Cryptocurrency', 'crypto', 'global', 6, 'tech'], ['Bitcoin', 'crypto', 'global', 3, 'tech'],
  ['Linux & OSS', 'technology', 'global', 6, 'tech'], ['Privacy', 'security', 'global', 5, 'tech'], ['Cloud Computing', 'technology', 'global', 4, 'tech'],
  ['Computer Science', 'technology', 'global', 4, 'tech'], ['Quantum Physics', 'science', 'global', 3, 'core'], ['Positive News', 'general', 'global', 4, 'core'],
  ['Movies', 'entertainment', 'global', 4, 'core'], ['Music', 'entertainment', 'global', 3, 'core'], ['Agriculture', 'business', 'global', 4, 'core'],
  ['Psychology', 'science', 'global', 3, 'core'], ['Apple', 'technology', 'us', 2, 'tech'], ['Google', 'technology', 'us', 2, 'tech'],
  ['Microsoft', 'technology', 'us', 2, 'tech'], ['Nuclear Power', 'energy', 'global', 3, 'core'], ['Aviation', 'business', 'global', 3, 'core'],
  ['Auto', 'auto', 'global', 3, 'core'], ['Entertainment', 'entertainment', 'global', 8, 'core'],
];

const normUrl = (u: string) => {
  try {
    const x = new URL(u);
    return `${x.hostname.replace(/^www\./, '')}${x.pathname.replace(/\/$/, '')}${x.search}`.toLowerCase();
  } catch { return u.toLowerCase(); }
};
const hostOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
const LANG_FIX: Record<string, string> = { gr: 'el', arq: 'ar', cnr: 'sr' }; // Kite uses a few non-ISO codes
const lang = (l: string) => {
  const code = l.split('-')[0].toLowerCase();
  return LANG_FIX[code] ?? code;
};

// ---- candidates -------------------------------------------------------------------------------
const kite = (await (await fetch(KITE_URL)).json()) as Record<string, { source_language: string; feeds: string[] | Record<string, unknown> }>;
const curatedKeys = new Set(CURATED.map(([, url]) => normUrl(url)));

const candidates: (Source & { slotKey?: string })[] = CURATED.map(([name, feedUrl, kind, category, region, language, pack]) => ({
  name, feedUrl, kind, category, region, language, pack, origin: 'curated' as const,
}));

const slots = new Map<string, number>(); // slotKey -> how many we keep
for (const [kiteName, category, region, cap, pack] of KITE_MAP) {
  const entry = kite[kiteName];
  if (!entry) { console.warn(`kite category missing: ${kiteName}`); continue; }
  const feeds = (Array.isArray(entry.feeds) ? entry.feeds : Object.keys(entry.feeds)).filter((u) => !curatedKeys.has(normUrl(u)));
  const keep = Math.max(2, Math.round(cap * SCALE));
  const want = Math.min(feeds.length, Math.ceil(keep * OVERSAMPLE));
  const step = feeds.length / want;
  const language = lang(entry.source_language);
  slots.set(kiteName, keep);
  for (let i = 0; i < want; i++) {
    const feedUrl = feeds[Math.floor(i * step)];
    candidates.push({
      name: hostOf(feedUrl), feedUrl, category, region, pack, language, origin: 'kite', slotKey: kiteName,
      kind: language === 'en' ? 'rss' : 'world',
    });
  }
}
console.log(`candidates: ${candidates.length} (${CURATED.length} curated)`);

// ---- validation ---------------------------------------------------------------------------------
const parser = new Parser({ timeout: 8000 });
type Verdict = { ok: true; title?: string; items: number; newest: Date } | { ok: false; why: string };

async function check(src: Source): Promise<Verdict> {
  try {
    const res = await fetch(src.feedUrl, {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; FoldBot/0.1; +https://github.com/saimbuilds/AI_hackathon)', accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' },
      redirect: 'follow', signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { ok: false, why: `HTTP ${res.status}` };
    const text = await res.text();
    if (text.length > 6_000_000) return { ok: false, why: 'too large' };
    const feed = await parser.parseString(text);
    // arXiv announces Mon-Fri only: a valid but empty feed on the weekend is still alive.
    if (!feed.items?.length) return src.kind === 'arxiv' ? { ok: true, title: feed.title?.trim(), items: 0, newest: new Date() } : { ok: false, why: 'no items' };
    const dates = feed.items.map((i) => Date.parse(i.isoDate ?? i.pubDate ?? '')).filter(Number.isFinite);
    if (!dates.length) return { ok: false, why: 'no dates' };
    const newest = new Date(Math.max(...dates));
    const ageDays = (Date.now() - newest.getTime()) / 86_400_000;
    if (ageDays > FRESH_DAYS[src.kind]) return { ok: false, why: `stale (${Math.round(ageDays)}d)` };
    if (ageDays < -2) return { ok: false, why: 'future dates' };
    return { ok: true, title: feed.title?.trim(), items: feed.items.length, newest };
  } catch (e) {
    return { ok: false, why: e instanceof Error ? e.message.slice(0, 80) : String(e) };
  }
}

const limit = pLimit(24);
let done = 0;
const verdicts = await Promise.all(candidates.map((c) => limit(async () => {
  const v = await check(c);
  if (++done % 100 === 0) console.log(`  checked ${done}/${candidates.length}`);
  return v;
})));

// ---- select ---------------------------------------------------------------------------------------
const kept: Source[] = [];
const dead: { name: string; url: string; why: string }[] = [];
const keptPerSlot = new Map<string, number>();
const perHost = new Map<string, number>();
const seen = new Set<string>();

candidates.forEach((c, i) => {
  const v = verdicts[i];
  if (!v.ok) { dead.push({ name: c.name, url: c.feedUrl, why: v.why }); return; }
  const key = normUrl(c.feedUrl);
  if (seen.has(key)) return;
  if (c.origin === 'kite') {
    const slot = c.slotKey!;
    if ((keptPerSlot.get(slot) ?? 0) >= slots.get(slot)!) return;
    const host = hostOf(c.feedUrl);
    if ((perHost.get(host) ?? 0) >= MAX_PER_HOST) return;
    keptPerSlot.set(slot, (keptPerSlot.get(slot) ?? 0) + 1);
    perHost.set(host, (perHost.get(host) ?? 0) + 1);
    if (v.title) c.name = v.title.slice(0, 80);
  }
  seen.add(key);
  const { slotKey: _slot, ...src } = c;
  void _slot;
  try { src.siteUrl = new URL(c.feedUrl).origin; } catch { /* keep undefined */ }
  kept.push(src);
});

kept.sort((a, b) => a.pack.localeCompare(b.pack) || a.kind.localeCompare(b.kind) || a.region.localeCompare(b.region) || a.name.localeCompare(b.name));
writeFileSync('worker/sources.json', JSON.stringify({ generatedAt: new Date().toISOString(), count: kept.length, sources: kept }, null, 1) + '\n');
writeFileSync('worker/sources.dead.json', JSON.stringify(dead, null, 1) + '\n');

const tally = (f: (s: Source) => string) => Object.entries(kept.reduce<Record<string, number>>((m, s) => ((m[f(s)] = (m[f(s)] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}:${n}`).join('  ');
console.log(`\nkept ${kept.length} live feeds, dropped ${dead.length}`);
console.log('by kind    ', tally((s) => s.kind));
console.log('by pack    ', tally((s) => s.pack));
console.log('by language', tally((s) => s.language));
console.log('by region  ', tally((s) => s.region));
console.log('curated dead:', dead.filter((d) => CURATED.some(([, u]) => u === d.url)).map((d) => `${d.name} (${d.why})`).join('; '));
