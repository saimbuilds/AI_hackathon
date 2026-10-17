// Interest-parsing check on varied global inputs: tsx --env-file=.env.local scripts/parse-eval.mts
import { parseOnboarding } from '../src/lib/onboarding';

const inputs = [
  "I'm a product manager in Austin. Into AI, the NBA, and the Fed. Skip celebrity gossip and crypto.",
  'London-based nurse, love Premier League, UK politics and climate. No true crime.',
  'Toronto dev, startups, Maple Leafs, housing market. Hate clickbait.',
  'College student in Chicago studying finance, follow the S&P, NFL and AI news',
  'Retired teacher in Manila, news about family, health and the Philippines',
  'I want tech, space and cricket. Not politics.',
  'Berlin founder: climate tech, EU regulation, football',
];

for (const text of inputs) {
  const t = Date.now();
  const r = await parseOnboarding(text);
  console.log(`\n"${text}"\n  ${r.source} ${Date.now() - t}ms | chips: ${r.parsed.interests.join(', ')} | topics: ${r.parsed.topics.join(', ')} | neg: ${r.parsed.negatives.join(', ')} -> ${r.parsed.negativeTopics.join(', ')} | city: ${r.parsed.city ?? '-'} | role: ${r.parsed.role ?? '-'} | niche: ${r.niche.join(', ') || '-'}`);
}
