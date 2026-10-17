// Is this URL a live, recent RSS/Atom feed? Shared by the source scout (the catalog builder has its own copy).
import Parser from 'rss-parser';

const UA = 'Mozilla/5.0 (compatible; FoldBot/0.1; +https://github.com/saimbuilds/AI_hackathon)';
const parser = new Parser({ timeout: 8000 });

export type FeedVerdict = { ok: true; title: string; items: { title: string; link: string; at: number }[]; newest: number } | { ok: false; why: string };

export async function checkFeed(url: string, maxAgeDays = 14, timeoutMs = 8000): Promise<FeedVerdict> {
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' }, redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return { ok: false, why: `HTTP ${res.status}` };
    const text = await res.text();
    if (text.length > 6_000_000) return { ok: false, why: 'too large' };
    const feed = await parser.parseString(text);
    const items = (feed.items ?? []).flatMap((i) => {
      const at = Date.parse(i.isoDate ?? i.pubDate ?? '');
      return i.title && i.link && Number.isFinite(at) ? [{ title: i.title.trim(), link: i.link, at }] : [];
    });
    if (!items.length) return { ok: false, why: 'no dated items' };
    const newest = Math.max(...items.map((i) => i.at));
    if ((Date.now() - newest) / 86_400_000 > maxAgeDays) return { ok: false, why: 'stale' };
    return { ok: true, title: (feed.title ?? '').trim(), items: items.slice(0, 15), newest };
  } catch (e) {
    return { ok: false, why: e instanceof Error ? e.message.slice(0, 80) : String(e) };
  }
}

export async function fetchText(url: string, timeoutMs = 8000, max = 600_000): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,*/*' }, redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
    return res.ok ? (await res.text()).slice(0, max) : null;
  } catch {
    return null;
  }
}
