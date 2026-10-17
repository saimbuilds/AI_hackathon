// Onboarding sentence -> structured interests. LLM first; a keyword heuristic when no LLM is available.
import { z } from 'zod';
import { llm, LLMUnavailableError, wrapUntrusted } from './llm';
import { TOPICS } from './taxonomy';

const slugs = Object.keys(TOPICS) as [string, ...string[]];

export const ParsedProfileSchema = z.object({
  interests: z.array(z.string().max(60)).max(12), // editable chips, free-form ("Kenyan fintech")
  topics: z.array(z.enum(slugs)).max(8), // mapped onto the fixed vocabulary (has precomputed fingerprints)
  entities: z.array(z.string().max(60)).max(10), // people, teams, companies, places
  negatives: z.array(z.string().max(60)).max(8), // things to skip, free-form
  negativeTopics: z.array(z.enum(slugs)).max(6),
  role: z.string().max(80).nullish(),
  city: z.string().max(60).nullish(),
  goals: z.string().max(160).nullish(),
  depth: z.enum(['espresso', 'standard', 'long']).nullish(),
});
export type ParsedProfile = z.infer<typeof ParsedProfileSchema>;

const SYSTEM = `You turn one sentence a person writes about their mornings and interests into a structured reading profile for a personal newspaper.
- interests: short chips (1-4 words) naming what they want to read about, in their own words ("AI startups", "Formula 1", "US politics", "the NBA", "UK property market").
- topics: map ONLY the interests the person actually wants onto this fixed list of slugs (use only these): ${slugs.join(', ')}. Never put a skipped topic here. Use a country or region slug only if they name that place. Pick the sport of the named team (Maple Leafs = hockey, Lakers = basketball, Cowboys = american-football, Yankees = baseball).
- entities: specific people, teams, companies or places they mention.
- negatives: things they want to skip, as short chips; negativeTopics: the closest slugs from the list.
- role: their job or study if stated; city: only if stated (any city worldwide is equally valid: New York, Austin, Toronto, London, Berlin, Dubai, Lahore, Manila); goals: why they read, if stated; depth: espresso (very short) / standard / long only if they say so.
Never invent anything that is not in the text. Return {"interests":[],"topics":[],"entities":[],"negatives":[],"negativeTopics":[],"role":null,"city":null,"goals":null,"depth":null}.`;

const NEG_CUE = /\b(skip|avoid|no|not interested in|without|hate|sick of|tired of|don'?t (?:want|care about|like))\b/i;

// Keyword fallback: match words from each topic's description against the text.
export function heuristicParse(text: string): ParsedProfile {
  const lower = text.toLowerCase();
  const sentences = lower.split(/(?<=[.!?])\s+|\n+/);
  const negText: string[] = [];
  const posText: string[] = [];
  for (const s of sentences) {
    const m = s.match(NEG_CUE);
    if (m && m.index !== undefined) { posText.push(s.slice(0, m.index)); negText.push(s.slice(m.index + m[0].length)); } else posText.push(s);
  }
  const pos = posText.join(' ');
  const neg = negText.join(' ');
  // Normalise: lowercase, drop possessives, punctuation -> spaces.
  const norm = (s: string) => ` ${s.replace(/'s\b/g, "").replace(/[^a-z0-9]+/g, " ").trim()} `;
  // A topic matches on its slug, its lead term, or any multi-word phrase of its description:
  // generic single words ("economy", "politics") would otherwise fire on unrelated topics.
  const keysOf = (slug: string) => {
    const parts = TOPICS[slug].toLowerCase().split(/,\s*/);
    return [slug.replace(/-/g, " "), parts[0], ...parts.filter((p) => p.includes(" "))].map((k) => ` ${norm(k).trim()} `);
  };
  const score = (haystack: string, slug: string) => keysOf(slug).some((k) => haystack.includes(k));
  const posN = norm(pos);
  const negN = norm(neg);
  const topics = slugs.filter((s) => score(posN, s)).slice(0, 8);
  const negativeTopics = slugs.filter((s) => score(negN, s) && !topics.includes(s)).slice(0, 6);
  const chips = (s: string) => s.split(/,|;|\band\b|&|\//).map((c) => c.replace(/\b(i'?m|i am|into|love|like|follow|read about|interested in|care about)\b/g, '').replace(/[^\p{L}\p{N}' -]/gu, '').trim()).filter((c) => c.length > 2 && c.length < 40);
  return { interests: chips(pos).slice(0, 12), topics, entities: [], negatives: chips(neg).slice(0, 8), negativeTopics, role: null, city: null, goals: null, depth: null };
}

// Chips that map onto none of the fixed topics are niche interests: the frontend can ask the source scout about them.
export const nicheChips = (chips: string[]): string[] => chips.filter((c) => c.trim().length > 2 && heuristicParse(c).topics.length === 0 && chipTopics([c]).length === 0).slice(0, 4);

// Models sometimes (a) list a skipped topic as liked and (b) reach for a country topic the reader never mentioned.
// Country/region topics must be backed by words in what the reader wrote (or their city); the rest is deterministic cleanup.
const GEO_EVIDENCE: Record<string, RegExp> = {
  'pakistan-economy': /pakistan|karachi|lahore|islamabad|rupee|psx|psl/i, 'pakistan-politics': /pakistan|karachi|lahore|islamabad|pti|psl/i,
  'pakistan-society': /pakistan|karachi|lahore|islamabad/i, india: /india|delhi|mumbai|bangalore|bollywood|ipl/i,
  'south-asia': /south asia|pakistan|india|bangladesh|sri lanka|nepal|afghan|karachi|lahore|delhi|dhaka/i,
  africa: /africa|nigeria|kenya|egypt|ghana|ethiopia|south africa|lagos|nairobi|cairo/i, 'latin-america': /latin|brazil|mexico|argentina|colombia|chile|peru|são paulo|bogot/i,
  'middle-east': /middle east|gulf|israel|gaza|iran|saudi|uae|dubai|qatar|syria|lebanon|iraq|riyadh/i, china: /china|chinese|beijing|shanghai|hong kong/i,
  'russia-ukraine': /russia|ukrain|putin|kyiv|moscow/i, canada: /canad|toronto|vancouver|ottawa|montreal|calgary/i, 'southeast-asia': /philippines|manila|indonesia|jakarta|vietnam|thailand|bangkok|singapore|malaysia|asean/i,
};
export function cleanParsed(p: ParsedProfile, text: string): ParsedProfile {
  const evidence = `${text} ${p.city ?? ''}`;
  const negatives = new Set(p.negativeTopics);
  const topics = p.topics.filter((t) => !negatives.has(t) && (!(t in GEO_EVIDENCE) || GEO_EVIDENCE[t].test(evidence)));
  return { ...p, topics };
}

export async function parseOnboarding(text: string): Promise<{ parsed: ParsedProfile; source: 'llm' | 'heuristic'; niche: string[] }> {
  try {
    const res = await llm({ task: 'parse', system: SYSTEM, user: wrapUntrusted('reader text', text), schema: ParsedProfileSchema });
    const parsed = cleanParsed(res.data, text);
    return { parsed, source: 'llm', niche: nicheChips(parsed.interests) };
  } catch (e) {
    if (!(e instanceof LLMUnavailableError)) throw e;
    const parsed = heuristicParse(text);
    return { parsed, source: 'heuristic', niche: nicheChips(parsed.interests) };
  }
}

// Generic one-word chips the phrase heuristic deliberately ignores. "economy"/"politics" resolve to the
// Pakistan topic when the reader also picked Pakistan (most of our readers), else the global one.
const CHIP_ALIASES: Record<string, (all: Set<string>) => string[]> = {
  technology: () => ['consumer-tech', 'software'], tech: () => ['consumer-tech', 'software'],
  ai: () => ['ai'], 'artificial intelligence': () => ['ai'], startups: () => ['startups'], startup: () => ['startups'],
  economy: (all) => (all.has('pakistan') ? ['pakistan-economy'] : ['global-economy']),
  business: (all) => (all.has('pakistan') ? ['pakistan-economy', 'business'] : ['business']),
  politics: (all) => (all.has('pakistan') ? ['pakistan-politics'] : ['geopolitics']),
  pakistan: () => ['pakistan-politics', 'pakistan-economy'], cricket: () => ['cricket'], football: () => ['football', 'american-football'], soccer: () => ['football'], nfl: () => ['american-football'], mlb: () => ['baseball'], baseball: () => ['baseball'], nba: () => ['basketball'], basketball: () => ['basketball'], tennis: () => ['tennis'],
  f1: () => ['cars'], 'formula 1': () => ['cars'], science: () => ['science'], health: () => ['health'], climate: () => ['climate'],
  crypto: () => ['crypto'], markets: () => ['markets'], space: () => ['space'], gaming: () => ['gaming'], movies: () => ['movies'],
  music: () => ['music'], books: () => ['books'], education: () => ['education'], jobs: () => ['jobs-careers'], careers: () => ['jobs-careers'],
  celebrity: () => ['celebrity'], 'celebrity news': () => ['celebrity'], 'celebrity gossip': () => ['celebrity'], gossip: () => ['celebrity'],
  hockey: () => ['hockey'], nhl: () => ['hockey'], 'maple leafs': () => ['hockey', 'canada'], canada: () => ['canada'], philippines: () => ['southeast-asia'], 'housing market': () => ['real-estate'],
  's p': () => ['markets'], 's p 500': () => ['markets'], 'stock market': () => ['markets'], stocks: () => ['markets'], fed: () => ['global-economy', 'markets'], 'federal reserve': () => ['global-economy', 'markets'], inflation: () => ['global-economy'], 'eu regulation': () => ['europe'], 'uk politics': () => ['uk-politics'], 'us politics': () => ['us-politics'], 'climate tech': () => ['climate', 'startups'],
  sports: () => ['cricket', 'football', 'american-football', 'basketball', 'baseball'], world: () => ['geopolitics'], 'world news': () => ['geopolitics'],
};

// Onboarding chips -> topic slugs (server-side safety net when the client sends chips but no topics).
export function chipTopics(chips: string[]): string[] {
  const norm = chips.map((c) => c.toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim().replace(/^(the|a|an) /, '')).filter(Boolean);
  const all = new Set(norm);
  const out = new Set<string>();
  for (const c of norm) {
    for (const t of CHIP_ALIASES[c]?.(all) ?? []) out.add(t);
    for (const t of heuristicParse(c).topics) out.add(t);
  }
  return [...out].filter((t) => t in TOPICS).slice(0, 10);
}
