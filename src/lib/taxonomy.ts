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

// Fixed topic vocabulary for onboarding. The parse LLM maps a reader's free text onto these slugs;
// the worker embeds each description once into `topic_vectors`, so the web app never embeds.
export const TOPICS: Record<string, string> = {
  'ai': 'artificial intelligence, machine learning, large language models, AI companies and research',
  'startups': 'startups, venture capital, founders, funding rounds, product launches',
  'software': 'software engineering, programming, developer tools, open source',
  'cybersecurity': 'cybersecurity, hacking, data breaches, privacy and surveillance',
  'consumer-tech': 'consumer technology, smartphones, gadgets, apps, big tech companies',
  'semiconductors': 'chips, semiconductors, GPUs, hardware, data centers',
  'crypto': 'cryptocurrency, bitcoin, blockchain, digital assets',
  'space': 'space exploration, NASA, rockets, satellites, astronomy',
  'science': 'scientific discoveries, research, physics, biology, chemistry',
  'health': 'health, medicine, public health, diseases, clinical research',
  'mental-health': 'mental health, psychology, wellbeing, mindfulness',
  'climate': 'climate change, global warming, emissions, climate policy',
  'environment': 'environment, wildlife, conservation, pollution, biodiversity',
  'energy': 'energy, oil, gas, electricity, renewables, power markets',
  'global-economy': 'global economy, inflation, interest rates, central banks, trade and tariffs',
  'markets': 'stock markets, investing, companies earnings, commodities, currencies',
  'business': 'business news, corporate strategy, mergers, industry, retail',
  'pakistan-economy': 'Pakistan economy, rupee, IMF programme, State Bank of Pakistan, budget, power tariffs',
  'pakistan-politics': 'Pakistan politics, government, parliament, courts, political parties, elections',
  'pakistan-society': 'Pakistan society, education, crime, infrastructure, local news',
  'india': 'India news, politics, economy, society',
  'south-asia': 'South Asia, Afghanistan, Bangladesh, Sri Lanka, Nepal, regional relations',
  'middle-east': 'Middle East, Gulf states, Saudi Arabia, Iran, Israel, Gaza, Yemen',
  'china': 'China, Taiwan, Hong Kong, US-China relations',
  'russia-ukraine': 'war in Ukraine, Russia, NATO, sanctions, European security',
  'us-politics': 'US politics, White House, Congress, elections, Supreme Court',
  'uk-politics': 'UK politics, government, parliament, Brexit aftermath',
  'europe': 'European Union, European politics and economies',
  'africa': 'Africa, African politics, economies and societies',
  'latin-america': 'Latin America, Brazil, Mexico, Argentina, regional politics',
  'canada': 'Canada, Canadian politics, Ottawa, Toronto, Vancouver, Bank of Canada, provinces',
  'southeast-asia': 'Southeast Asia, Philippines, Indonesia, Vietnam, Thailand, Singapore, Malaysia, ASEAN',
  'australia-nz': 'Australia, New Zealand, Canberra, Sydney, Melbourne, Pacific region',
  'geopolitics': 'geopolitics, diplomacy, international relations, United Nations, conflicts',
  'defense': 'military, defence, weapons, armed forces, security policy',
  'cricket': 'cricket, Test matches, T20, ODI, PSL, IPL, ICC, cricketers',
  'football': 'football, soccer, Premier League, Champions League, transfers, World Cup',
  'f1': 'Formula 1, Grand Prix, drivers, teams, motorsport, racing',
  'basketball': 'basketball, NBA, WNBA, March Madness, players, playoffs',
  'hockey': 'ice hockey, NHL, Stanley Cup, Maple Leafs, Canadian hockey, players',
  'american-football': 'American football, NFL, Super Bowl, quarterbacks, college football, draft',
  'baseball': 'baseball, MLB, World Series, pitchers, home runs, Dodgers, Yankees',
  'tennis': 'tennis, Grand Slams, ATP, WTA',
  'olympics': 'Olympics, athletics, multi-sport events, other sports',
  'movies': 'movies, cinema, film industry, box office, streaming shows',
  'music': 'music, artists, albums, concerts, music industry',
  'celebrity': 'celebrity news, gossip, entertainment personalities',
  'books': 'books, literature, authors, publishing, arts and culture',
  'gaming': 'video games, gaming industry, consoles, esports',
  'food': 'food, restaurants, cooking, nutrition',
  'travel': 'travel, tourism, airlines, destinations, aviation',
  'education': 'education, universities, students, exams, schools, careers',
  'jobs-careers': 'jobs, careers, workplace, labour market, hiring, remote work',
  'law-justice': 'courts, law, crime, justice system, human rights',
  'religion': 'religion, faith, Islam, Christianity, spiritual life',
  'cars': 'cars, electric vehicles, automotive industry, Tesla',
  'real-estate': 'real estate, housing, property markets, construction',
  'agriculture': 'agriculture, farming, food security, commodities',
  'fashion': 'fashion, retail, lifestyle, design',
  'social-media': 'social media, platforms, creators, online culture, misinformation',
  'women': 'women, gender, equality, family and society',
  'positive-news': 'good news, positive stories, human interest, innovation for good',
};
export type TopicSlug = keyof typeof TOPICS;
