// Simulated readers with HIDDEN ground-truth interests. At onboarding they state only part of what they like
// (as real people do), so the system has to discover the rest from behaviour.
export type Persona = {
  id: string;
  name: string;
  bio: string;
  hidden: string[]; // topic slugs they truly care about (never shown to the system)
  stated: string[]; // what they type at onboarding (a subset, plus the odd miss)
  statedText: string;
  dislikes: string[]; // topic slugs they actively dislike
  // Independent ground truth for the keyword reader: matched against headline text, not embeddings.
  keywords: string[];
};

export const PERSONAS: Persona[] = [
  {
    id: 'ayesha',
    name: 'Ayesha, Lahore fintech founder',
    bio: '29, runs a payments startup in Lahore. Follows Pakistan\'s economy, funding and startups closely; keeps an eye on AI. Not interested in sport or celebrity news.',
    hidden: ['startups', 'markets', 'pakistan-economy', 'ai', 'global-economy'],
    stated: ['startups', 'pakistan-economy'],
    statedText: 'I run a fintech startup in Lahore and follow the economy. Skip celebrity gossip.',
    dislikes: ['celebrity', 'football', 'cricket'],
    keywords: ['fintech', 'startup', 'funding', 'venture', 'investor', 'payments', 'bank', 'rupee', 'state bank', 'sbp', 'imf', 'inflation', 'interest rate', 'economy', 'economic', 'budget', 'tax', 'ai ', 'artificial intelligence', 'openai', 'anthropic', 'stock', 'market', 'oil price', 'petrol', 'tariff', 'trade', 'ipo', 'crypto', 'gdp', 'exports', 'remittance'],
  },
  {
    id: 'hamza',
    name: 'Hamza, Islamabad med student',
    bio: '21, medical student in Islamabad who lives for cricket. Interested in health and medical research; casual on politics. Dislikes finance and tech-company news.',
    hidden: ['health', 'cricket', 'science', 'mental-health', 'pakistan-society'],
    stated: ['health', 'cricket'],
    statedText: 'Med student in Islamabad, love cricket. Not into finance.',
    dislikes: ['markets', 'crypto', 'startups'],
    keywords: ['cricket', 'test match', 't20', 'odi', 'babar', 'psl', 'pcb', 'wicket', 'batting', 'bowler', 'icc', 'medical', 'doctor', 'hospital', 'health', 'vaccine', 'disease', 'outbreak', 'ebola', 'cancer', 'surgery', 'patients', 'study finds', 'research', 'mental health', 'nurse', 'drug', 'medicine', 'virus', 'clinical', 'school', 'students', 'university', 'exam'],
  },
  {
    id: 'sana',
    name: 'Sana, Karachi designer',
    bio: '26, graphic designer in Karachi. Cares about climate, the environment, film, music and books. Avoids politics and war news when possible.',
    hidden: ['climate', 'environment', 'music', 'movies', 'books', 'fashion'],
    stated: ['climate', 'music'],
    statedText: 'Designer in Karachi. I care about climate, art and music. Tired of political news.',
    dislikes: ['us-politics', 'defense', 'russia-ukraine'],
    keywords: ['climate', 'emissions', 'carbon', 'flood', 'heatwave', 'heat wave', 'wildfire', 'deforestation', 'amazon', 'rainforest', 'biodiversity', 'wildlife', 'environment', 'renewable', 'solar', 'film', 'movie', 'cinema', 'festival', 'album', 'singer', 'music', 'concert', 'artist', 'exhibition', 'museum', 'design', 'book', 'novel', 'author', 'fashion', 'theatre', 'art '],
  },
];
