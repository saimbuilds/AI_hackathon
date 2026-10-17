// Turn raw feed items into clean article records.
const TRACKING = /^(utm_|fbclid|gclid|mc_|ref$|ref_|at_medium|at_campaign|at_|cmpid|ocid|taid|source$|ito$|smid|scid|cid$)/i;

export function canonicalUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    u.hash = '';
    for (const k of [...u.searchParams.keys()]) if (TRACKING.test(k)) u.searchParams.delete(k);
    u.hostname = u.hostname.toLowerCase();
    let s = u.toString();
    if (s.endsWith('/') && u.pathname !== '/') s = s.slice(0, -1);
    return s;
  } catch {
    return null;
  }
}

export const domainOf = (url: string): string => {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
};

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', ndash: '–', mdash: '—' };

export function cleanText(html: string | undefined | null, max = 600): string {
  if (!html) return '';
  const text = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

// Near-duplicate title key: lowercase alphanumerics only (any script), outlet suffix stripped.
export function titleKey(title: string): string {
  return title
    .replace(/\s[|–—-]\s[^|–—-]{2,40}$/u, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

export type RawItem = {
  title?: string; link?: string; guid?: string; isoDate?: string; pubDate?: string; content?: string; contentSnippet?: string; summary?: string;
  enclosure?: { url?: string; type?: string };
  mediaContent?: { $?: { url?: string; medium?: string; type?: string } } | { $?: { url?: string } }[];
  mediaThumbnail?: { $?: { url?: string } } | { $?: { url?: string } }[];
};

export function imageOf(item: RawItem): string | undefined {
  const first = <T,>(v: T | T[] | undefined): T | undefined => (Array.isArray(v) ? v[0] : v);
  const candidates = [
    item.enclosure?.type?.startsWith('image') ? item.enclosure.url : undefined,
    first(item.mediaContent)?.$?.url,
    first(item.mediaThumbnail)?.$?.url,
    item.content?.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1],
  ];
  const url = candidates.find((u) => u && /^https?:\/\//.test(u));
  return url && !/(pixel|spacer|1x1|logo)/i.test(url) ? url : undefined;
}

export type Article = {
  sourceId: string; sourceKind: string; url: string; title: string; excerpt: string; imageUrl?: string; language: string; publishedAt: Date; domain: string;
};

export function toArticle(item: RawItem, src: { id: string; kind: string; language: string }, now = Date.now()): Article | null {
  const url = canonicalUrl(item.link ?? item.guid ?? '');
  const title = cleanText(item.title, 300);
  if (!url || title.length < 12) return null;
  const parsed = Date.parse(item.isoDate ?? item.pubDate ?? '');
  // Missing dates count as "now"; future dates are clamped (some feeds publish timezone-garbled times).
  const publishedAt = new Date(Number.isFinite(parsed) ? Math.min(parsed, now) : now);
  const excerpt = cleanText(item.contentSnippet ?? item.summary ?? item.content, 600);
  return { sourceId: src.id, sourceKind: src.kind, url, title, excerpt: excerpt === title ? '' : excerpt, imageUrl: imageOf(item), language: src.language, publishedAt, domain: domainOf(url) };
}
