// Full-text extraction (Readability + linkedom). Only run for stories that will be written up.
// Paywalls are fine: we fall back to the RSS excerpt and always link out.
import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';

const UA = 'Mozilla/5.0 (compatible; FoldBot/0.1; +https://github.com/saimbuilds/AI_hackathon)';
const MAX_HTML = 1_500_000;

export type Extracted = { text: string; imageUrl?: string };

export async function extractArticle(url: string, timeoutMs = 8000, maxChars = 4000): Promise<Extracted | null> {
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml' }, redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('html')) return null;
    const html = (await res.text()).slice(0, MAX_HTML);
    const { document } = parseHTML(html);
    const og = document.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? undefined;
    const parsed = new Readability(document as unknown as Document).parse();
    const text = (parsed?.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (text.length < 200) return null; // consent walls, paywall stubs, video pages
    return { text: text.slice(0, maxChars), imageUrl: og && /^https?:\/\//.test(og) ? og : undefined };
  } catch {
    return null;
  }
}
