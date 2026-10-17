// The source scout: a reader's niche interest makes the catalog better for everyone with that interest.
//   Google News RSS search -> outlet domains -> RSS autodiscovery -> live + recent check -> LLM vet -> add to catalog (tagged with the beat)
import { z } from 'zod';
import { adminClient } from '../lib/supabase';
import { llm, LLMUnavailableError, wrapUntrusted } from '../lib/llm';
import { checkFeed, fetchText } from '../press/feedcheck';

const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

export const normalizeBeat = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();
export const beatSlug = (s: string) => normalizeBeat(s).replace(/\s+/g, '-');
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };

// Domains that never make a useful beat source (aggregators, social, search).
const SKIP_DOMAINS = /(^|\.)(google\.|youtube\.|facebook\.|twitter\.|x\.com|instagram\.|linkedin\.|reddit\.|wikipedia\.|msn\.com|yahoo\.com|flipboard\.|newsbreak\.|apple\.news|pinterest\.|tiktok\.)/;

export function gnewsUrls(beat: string): string[] {
  const q = encodeURIComponent(`${beat} when:7d`);
  return [`https://news.google.com/rss/search?q=${q}&hl=en-PK&gl=PK&ceid=PK:en`, `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`];
}

const ITEM = /<item>[\s\S]*?<\/item>/g;
const SOURCE_URL = /<source[^>]*\burl="([^"]+)"/i;
const TITLE = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i;

// Outlet domains covering the beat, most frequent first.
// Google News puts the outlet in <source url="https://outlet.com">, and rss-parser drops attributes, so read the XML directly.
export async function discoverDomains(beat: string): Promise<{ domain: string; hits: number; sample: string }[]> {
  const counts = new Map<string, { hits: number; sample: string }>();
  for (const url of gnewsUrls(beat)) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; FoldBot/0.1)' }, signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      for (const item of (await res.text()).match(ITEM) ?? []) {
        const d = host(item.match(SOURCE_URL)?.[1] ?? '');
        if (!d || SKIP_DOMAINS.test(d)) continue;
        const cur = counts.get(d) ?? { hits: 0, sample: item.match(TITLE)?.[1] ?? '' };
        counts.set(d, { hits: cur.hits + 1, sample: cur.sample });
      }
    } catch { /* one edition failing is fine */ }
  }
  return [...counts.entries()].map(([domain, v]) => ({ domain, ...v })).sort((a, b) => b.hits - a.hits);
}

// Feed URLs advertised in a page's <head>, resolved against the page URL.
export function feedLinksFromHtml(html: string, base: string): string[] {
  const out: string[] = [];
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    if (!/rel=["']?alternate/i.test(tag) || !/type=["']?application\/(rss|atom)\+xml/i.test(tag)) continue;
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    try { out.push(new URL(href.replace(/&amp;/g, '&'), base).toString()); } catch { /* skip malformed */ }
  }
  return [...new Set(out)];
}

const COMMON_PATHS = ['/feed', '/rss', '/feed.xml', '/rss.xml', '/atom.xml', '/index.xml', '/feeds/posts/default'];

// Candidate feeds for a domain: a beat-specific tag/topic feed first (on-topic), then the advertised feeds, then common paths.
export async function candidateFeeds(domain: string, beat: string): Promise<string[]> {
  const origin = `https://${domain}`;
  const slug = beatSlug(beat);
  const tag = [`/tag/${slug}/feed`, `/tag/${slug}/rss`, `/topic/${slug}/feed`, `/topics/${slug}/rss`, `/category/${slug}/feed`, `/search/feed/rss/?search=${encodeURIComponent(beat)}`].map((p) => origin + p);
  const html = await fetchText(origin);
  const advertised = html ? feedLinksFromHtml(html, origin + '/') : [];
  return [...new Set([...tag, ...advertised, ...COMMON_PATHS.map((p) => origin + p)])];
}

export type ScoutCandidate = { domain: string; feedUrl: string; title: string; recent: string[]; beatHits: number; viaTag: boolean };

const tokens = (beat: string) => normalizeBeat(beat).split(' ').filter((w) => w.length > 2);

export async function probeDomain(domain: string, beat: string): Promise<ScoutCandidate | null> {
  const need = tokens(beat);
  const feeds = await candidateFeeds(domain, beat);
  const slug = beatSlug(beat);
  let best: ScoutCandidate | null = null;
  for (const url of feeds.slice(0, 14)) {
    const v = await checkFeed(url);
    if (!v.ok) continue;
    const beatHits = v.items.filter((i) => need.some((t) => i.title.toLowerCase().includes(t))).length;
    const viaTag = url.includes(slug);
    const cand: ScoutCandidate = { domain, feedUrl: url, title: v.title || domain, recent: v.items.slice(0, 6).map((i) => i.title), beatHits, viaTag };
    if (viaTag || !best || beatHits > best.beatHits) best = cand;
    if (viaTag) break; // a tag feed is the best possible answer
  }
  return best;
}

// ---- vetting --------------------------------------------------------------------------------------------

const VetSchema = z.object({ verdicts: z.array(z.object({ i: z.number().int(), keep: z.boolean() })) });

export function heuristicVet(c: ScoutCandidate): boolean {
  return c.viaTag || c.beatHits >= 2; // an on-topic tag feed, or a feed whose recent items keep mentioning the beat (one mention is a sponsor, not a beat)
}

export async function vet(beat: string, cands: ScoutCandidate[]): Promise<{ kept: ScoutCandidate[]; by: 'llm' | 'heuristic' }> {
  if (!cands.length) return { kept: [], by: 'heuristic' };
  try {
    const system = `You vet news sources for a reader who wants to follow "${beat}". For each numbered candidate (outlet, feed title, recent headlines) answer keep=true only if it is a credible outlet or blog that regularly publishes original reporting or analysis relevant to that beat. keep=false for content farms, SEO spam, press-release mills, coupon/affiliate sites, aggregators of other sites' headlines, or sources whose recent headlines are off-topic for the beat. Return {"verdicts":[{"i":0,"keep":true}, ...]} with one entry per candidate.`;
    const user = wrapUntrusted('candidates', cands.map((c, i) => `${i}. ${c.domain} | feed: ${c.title}\n   ${c.recent.slice(0, 5).map((t) => `- ${t}`).join('\n   ')}`).join('\n'));
    const res = await llm({ task: 'parse', system, user, schema: VetSchema });
    const keep = new Map(res.data.verdicts.map((v) => [v.i, v.keep]));
    return { kept: cands.filter((_, i) => keep.get(i) === true), by: 'llm' };
  } catch (e) {
    if (!(e instanceof LLMUnavailableError)) throw e;
    return { kept: cands.filter(heuristicVet), by: 'heuristic' };
  }
}

// ---- the whole run ----------------------------------------------------------------------------------------

export type ScoutResult = { beat: string; domainsFound: number; probed: number; candidates: number; added: { name: string; feedUrl: string }[]; vetted: 'llm' | 'heuristic'; skippedKnown: number; ms: number };

export async function runScout(rawBeat: string, opts: { maxDomains?: number; maxAdd?: number } = {}): Promise<ScoutResult> {
  const t0 = Date.now();
  const beat = normalizeBeat(rawBeat).slice(0, 60);
  if (beat.length < 2) throw new Error('Beat too short');
  const db = adminClient();
  if (!db) throw new Error('Supabase env missing');

  // Domains we already read are not "new sources".
  const { data: known } = await db.from('sources').select('feed_url,site_url');
  const knownHosts = new Set((known ?? []).flatMap((s) => [host(s.feed_url as string), host((s.site_url as string) ?? '')]).filter(Boolean));

  const domains = await discoverDomains(beat);
  const fresh = domains.filter((d) => !knownHosts.has(d.domain));
  const toProbe = fresh.slice(0, opts.maxDomains ?? 10);
  log(`scout "${beat}": ${domains.length} outlets in Google News, ${fresh.length} new, probing ${toProbe.length}`);

  const probed = (await Promise.all(toProbe.map((d) => probeDomain(d.domain, beat)))).filter((c): c is ScoutCandidate => !!c);
  const { kept, by } = await vet(beat, probed);
  const chosen = kept.slice(0, opts.maxAdd ?? 6);

  const rows = chosen.map((c) => ({ name: c.title.slice(0, 80), feed_url: c.feedUrl, site_url: `https://${c.domain}`, kind: 'rss', category: 'general', region: 'global', language: 'en', beat, status: 'active', last_ok_at: new Date().toISOString() }));
  if (rows.length) {
    const { error } = await db.from('sources').upsert(rows, { onConflict: 'feed_url' });
    if (error) throw new Error(`sources: ${error.message}`);
  }
  const out: ScoutResult = { beat, domainsFound: domains.length, probed: toProbe.length, candidates: probed.length, added: rows.map((r) => ({ name: r.name, feedUrl: r.feed_url })), vetted: by, skippedKnown: domains.length - fresh.length, ms: Date.now() - t0 };
  log(`scout "${beat}": added ${rows.length} source(s) in ${(out.ms / 1000).toFixed(1)}s (vetted by ${by})`);
  return out;
}
