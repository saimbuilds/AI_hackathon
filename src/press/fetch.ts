// Fetch every feed with per-source isolation: one dead source never kills a run.
import Parser from 'rss-parser';
import pLimit from 'p-limit';
import { toArticle, type Article, type RawItem } from './normalize';

export type SourceRow = { id: string; name: string; feed_url: string; kind: string; language: string };
export type FetchResult = { source: SourceRow; ok: boolean; error?: string; ms: number; articles: Article[] };

const UA = 'Mozilla/5.0 (compatible; FoldBot/0.1; +https://github.com/saimbuilds/AI_hackathon)';
const parser = new Parser({
  customFields: { item: [['media:content', 'mediaContent'], ['media:thumbnail', 'mediaThumbnail']] },
});

const global = pLimit(16);
const perHost = new Map<string, ReturnType<typeof pLimit>>();
const hostLimit = (url: string) => {
  const host = new URL(url).hostname;
  if (!perHost.has(host)) perHost.set(host, pLimit(2)); // BBC/Guardian/NYT host dozens of our feeds
  return perHost.get(host)!;
};

export async function fetchSource(source: SourceRow, opts: { maxAgeHours: number; perSource: number; timeoutMs: number }): Promise<FetchResult> {
  const started = Date.now();
  try {
    const res = await fetch(source.feed_url, {
      headers: { 'user-agent': UA, accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' },
      redirect: 'follow',
      signal: AbortSignal.timeout(opts.timeoutMs),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const feed = await parser.parseString(await res.text());
    const cutoff = Date.now() - opts.maxAgeHours * 3_600_000;
    const articles = (feed.items as RawItem[])
      .map((i) => toArticle(i, source))
      .filter((a): a is Article => !!a && a.publishedAt.getTime() >= cutoff)
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
      .slice(0, opts.perSource);
    return { source, ok: true, ms: Date.now() - started, articles };
  } catch (e) {
    return { source, ok: false, error: e instanceof Error ? e.message.slice(0, 160) : String(e), ms: Date.now() - started, articles: [] };
  }
}

export function fetchAll(sources: SourceRow[], opts: { maxAgeHours?: number; perSource?: number; timeoutMs?: number } = {}): Promise<FetchResult[]> {
  const o = { maxAgeHours: opts.maxAgeHours ?? 48, perSource: opts.perSource ?? 25, timeoutMs: opts.timeoutMs ?? 8000 };
  return Promise.all(sources.map((s) => global(() => hostLimit(s.feed_url)(() => fetchSource(s, o)))));
}
