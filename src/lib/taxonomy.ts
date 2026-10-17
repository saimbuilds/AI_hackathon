// Fixed taxonomies shared by the source catalog, the press (enrichment) and the editor.

export const CATEGORIES = [
  'world', 'politics', 'business', 'economy', 'technology', 'ai', 'security', 'science', 'space',
  'health', 'climate', 'energy', 'sports', 'cricket', 'football', 'f1', 'culture', 'entertainment',
  'crypto', 'defense', 'auto', 'opinion', 'local', 'general',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const SOURCE_KINDS = ['rss', 'primary', 'world', 'gnews', 'hn', 'arxiv', 'reddit', 'scrape'] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

// Where the outlet is based: ISO 3166 alpha-2 for a country, or a macro-region when the
// outlet covers one ('global' = international wire/broadcaster, 'mena', 'eu', 'africa', 'asia', 'latam').
export const COUNTRY_NAMES: Record<string, string> = {
  pk: 'Pakistan', in: 'India', bd: 'Bangladesh', np: 'Nepal', lk: 'Sri Lanka', af: 'Afghanistan',
  us: 'United States', uk: 'United Kingdom', ie: 'Ireland', ca: 'Canada', au: 'Australia', nz: 'New Zealand',
  ae: 'UAE', sa: 'Saudi Arabia', qa: 'Qatar', il: 'Israel', ps: 'Palestine', ir: 'Iran', tr: 'Turkey',
  eg: 'Egypt', ma: 'Morocco', dz: 'Algeria', ng: 'Nigeria', ke: 'Kenya', za: 'South Africa', gh: 'Ghana',
  et: 'Ethiopia', tz: 'Tanzania', de: 'Germany', fr: 'France', es: 'Spain', it: 'Italy', nl: 'Netherlands',
  pl: 'Poland', gr: 'Greece', se: 'Sweden', ru: 'Russia', ua: 'Ukraine', cn: 'China', hk: 'Hong Kong',
  tw: 'Taiwan', jp: 'Japan', kr: 'South Korea', sg: 'Singapore', my: 'Malaysia', id: 'Indonesia',
  ph: 'Philippines', vn: 'Vietnam', th: 'Thailand', br: 'Brazil', mx: 'Mexico', ar: 'Argentina',
  cl: 'Chile', co: 'Colombia', global: 'International', mena: 'Middle East', eu: 'Europe', africa: 'Africa',
  asia: 'Asia', latam: 'Latin America',
};

// Regional depth packs (BACKEND.md item 1).
export const PACKS = ['core', 'south-asia', 'us-uk', 'middle-east', 'world', 'primary', 'tech', 'sports'] as const;
export type Pack = (typeof PACKS)[number];
