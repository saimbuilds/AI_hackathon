// Turn ranked candidates into contract-valid StorySlots, sections and template copy.
// Everything here is deterministic, so a paper always prints even with every LLM down.
import type { StorySlot, QuizItem } from '../types/edition';
import { matchedTopics, type Cand, type ReaderModel } from './rank';

export const SECTION_BY_TOPIC: Record<string, string> = {
  ai: 'Artificial Intelligence', startups: 'The Startup Beat', software: 'Code & Craft', cybersecurity: 'Security Desk', 'consumer-tech': 'Gadgets & Apps',
  semiconductors: 'Chips & Hardware', crypto: 'Crypto', space: 'Science & Space', science: 'Science & Space', health: 'Health', 'mental-health': 'Health',
  climate: 'Climate', environment: 'Climate', energy: 'Energy', 'global-economy': 'Economy & Markets', markets: 'Economy & Markets', business: 'Business',
  'pakistan-economy': 'Pakistan Economy', 'pakistan-politics': 'Pakistan', 'pakistan-society': 'Pakistan', india: 'South Asia', 'south-asia': 'South Asia',
  'middle-east': 'The Middle East', china: 'China & Asia', 'russia-ukraine': 'World', geopolitics: 'World', defense: 'World', 'us-politics': 'United States',
  'uk-politics': 'United Kingdom', europe: 'Europe', africa: 'Africa', 'latin-america': 'Latin America', cricket: 'Cricket', football: 'Football', f1: 'Pit Lane',
  basketball: 'Sport', tennis: 'Sport', olympics: 'Sport', movies: 'Culture', music: 'Culture', celebrity: 'Culture', books: 'Culture', gaming: 'Culture',
  food: 'Life', travel: 'Life', education: 'Work & Learning', 'jobs-careers': 'Work & Learning', 'law-justice': 'Law & Order', religion: 'Faith', cars: 'Motoring',
  'real-estate': 'Property', agriculture: 'Agriculture', fashion: 'Life', 'social-media': 'Technology & Society', women: 'Life', 'positive-news': 'Good News',
};
export const FALLBACK_SECTION = 'Around the World';

const LABELS: Record<string, string> = {
  ai: 'AI', f1: 'Formula 1', 'us-politics': 'US politics', 'uk-politics': 'UK politics', 'law-justice': 'law and justice', 'pakistan-economy': "Pakistan's economy",
  'pakistan-politics': 'Pakistani politics', 'pakistan-society': 'Pakistani society', 'jobs-careers': 'jobs and careers', 'global-economy': 'the global economy',
  'russia-ukraine': 'the war in Ukraine', 'middle-east': 'the Middle East', 'south-asia': 'South Asia', 'latin-america': 'Latin America', 'consumer-tech': 'consumer tech',
  'positive-news': 'good news', 'mental-health': 'mental health', 'real-estate': 'real estate', 'social-media': 'social media', geopolitics: 'world affairs', crypto: 'crypto',
};
export const topicLabel = (slug: string) => LABELS[slug] ?? slug.replace(/-/g, ' ');
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function sectionOf(c: Cand, reader: ReaderModel): string {
  const ranked = [...c.topics].sort((a, b) => (reader.topicBeta[b]?.[0] ?? 1) / ((reader.topicBeta[b]?.[0] ?? 1) + (reader.topicBeta[b]?.[1] ?? 1)) - (reader.topicBeta[a]?.[0] ?? 1) / ((reader.topicBeta[a]?.[0] ?? 1) + (reader.topicBeta[a]?.[1] ?? 1)));
  for (const t of ranked) if (SECTION_BY_TOPIC[t]) return SECTION_BY_TOPIC[t];
  return FALLBACK_SECTION;
}

export const SLOT_COUNTS = {
  espresso: { sections: 4, briefs: 2, offBeat: 1, maxSections: 3, everyone: 1 },
  standard: { sections: 7, briefs: 4, offBeat: 2, maxSections: 4, everyone: 2 },
  long: { sections: 14, briefs: 8, offBeat: 2, maxSections: 6, everyone: 2 },
} as const;

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const roundHalf = (n: number) => Math.max(0.5, Math.round(n * 2) / 2);

export type SlotContext = {
  size: StorySlot['size'];
  kicker?: string;
  whyThis: string;
  forYou?: string;
  offBeat?: boolean;
};

// Sources are numbered 1..n per slot; sentences cite article ids, which we map to those numbers.
export function toSlot(c: Cand, ctx: SlotContext, parentHeadline?: string): StorySlot {
  const order: string[] = [];
  for (const s of c.sentences) for (const id of s.sourceIds) if (!order.includes(id)) order.push(id);
  const byId = new Map(c.articles.map((a) => [a.id, a]));
  const cited = order.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
  const seenOutlets = new Set(cited.map((a) => a.name));
  const extra = c.articles.filter((a) => !order.includes(a.id) && !seenOutlets.has(a.name) && seenOutlets.add(a.name)).slice(0, Math.max(0, 8 - cited.length));
  const sources = [...cited, ...extra].map((a) => ({ name: a.name, url: a.url }));
  const index = new Map([...cited, ...extra].map((a, i) => [a.id, i + 1]));

  const body = c.sentences.flatMap((s) => {
    const nums = [...new Set(s.sourceIds.map((id) => index.get(id)).filter((n): n is number => !!n))];
    return nums.length ? [{ text: s.text, sources: nums }] : []; // an uncited sentence never prints
  });
  const developing = c.dayCount > 1 || c.parentId;
  const first = body[0]?.text ?? c.headline;
  return {
    storyId: c.id,
    size: ctx.size,
    kicker: ctx.kicker ?? `${!c.category || c.category === 'general' ? 'News' : capital(c.category)}${developing ? ' · Developing' : ''}`,
    headline: c.headline,
    dek: c.dek ?? (first.length > 180 ? `${first.slice(0, 177).trimEnd()}...` : first),
    body,
    whyThis: ctx.whyThis,
    whyItMatters: c.whyItMatters ?? `Reported by ${c.sourceCount} ${c.sourceCount === 1 ? 'outlet' : 'outlets'} today.`,
    ...(ctx.forYou ? { forYou: ctx.forYou } : {}),
    trust: { outlets: Math.max(1, c.sourceCount), label: developing ? 'developing' : c.sourceCount >= 2 ? 'confirmed' : 'single-source', ...(c.unknowns ? { unknowns: c.unknowns } : {}) },
    distress: Math.min(3, Math.max(0, c.distress)) as 0 | 1 | 2 | 3,
    sources: sources.length ? sources : [{ name: 'Source', url: c.articles[0]?.url ?? 'https://example.com' }],
    ...(c.isPrimary ? { primary: true } : {}),
    ...(c.imageUrl ? { imageUrl: c.imageUrl } : {}),
    ...(developing ? { developing: { sinceLastRead: parentHeadline ? `Earlier: ${parentHeadline}` : 'This story is developing.', dayCount: Math.max(1, c.dayCount) } } : {}),
    topics: c.topics,
    readMinutes: roundHalf(words(body.map((b) => b.text).join(' ')) / 220 + 0.25),
    ...(c.world?.length ? { world: c.world } : {}),
    ...(c.friend ? { fromFriend: `${c.friend} thinks you'd like this` } : {}),
  };
}

// "Why you're seeing this", written from the ranking signals alone.
export function templateWhy(c: Cand, reader: ReaderModel, kind: 'lead' | 'pick' | 'offBeat' | 'everyone'): string {
  if (c.friend) return `Sent to your paper by ${c.friend}.`;
  if (kind === 'everyone') return `One of today's shared front-page stories, shown to every reader.`;
  if (kind === 'offBeat') {
    const t = c.topics[0] ? topicLabel(c.topics[0]) : (c.category ?? 'this');
    return `Off your beat: you rarely read about ${t}, and ${c.sourceCount} ${c.sourceCount === 1 ? 'outlet is' : 'outlets are'} covering it.`;
  }
  const m = matchedTopics(c, reader).map(topicLabel);
  if (m.length) return `Matches your interest in ${m.slice(0, 2).join(' and ')}${c.sourceCount >= 3 ? `; ${c.sourceCount} outlets are covering it` : ''}.`;
  if (c.sourceCount >= 4) return `One of today's most-covered stories: ${c.sourceCount} outlets.`;
  return `Picked for you from today's ${c.category ?? 'news'}.`;
}

export function templateNote(name: string | null, lead: Cand, sectionNames: string[], count: number): string {
  const who = name ? `Good morning, ${name}.` : 'Good morning.';
  const names = sectionNames.slice(0, 3);
  const inside = names.length ? ` Inside: ${names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]}.` : '';
  return `${who} Today's paper has ${count} stories, and then it ends.${inside} The front page leads with: ${lead.headline}.`;
}

export const SENTENCE_QUIZ_LIMIT = 3;
export function pickQuiz(picks: Cand[]): QuizItem[] {
  const out: QuizItem[] = [];
  for (const c of picks) {
    const q = c.quiz;
    if (!q || q.options.length !== 4 || new Set(q.options).size !== 4 || q.answer < 0 || q.answer > 3) continue;
    out.push({ q: q.q, options: q.options, answer: q.answer, storyId: c.id });
    if (out.length === SENTENCE_QUIZ_LIMIT) break;
  }
  return out;
}

export function pickTomorrow(picks: Cand[]): string[] {
  return picks.filter((c) => c.unknowns).slice(0, 3).map((c) => `${c.headline}: ${c.unknowns}`);
}

// Top stories' first sentences, verbatim: "3 things you learned today" can never invent a fact.
export function templateThreeThings(picks: Cand[]): string[] {
  return picks.filter((c) => c.sentences.length).slice(0, 3).map((c) => c.sentences[0].text);
}
