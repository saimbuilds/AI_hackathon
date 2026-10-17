// Local, instant read of the "one sentence about you". The server version (/api/onboarding/parse) refines it;
// this one makes the chips appear while the reader is still typing.

const TOPICS: [RegExp, string][] = [
  [/\bcricket|psl|babar\b/i, "Cricket"],
  [/\bf1|formula ?1|formula one|motorsport|grand prix\b/i, "Formula 1"],
  [/\bfootball|soccer|premier league\b/i, "Football"],
  [/\bai\b|artificial intelligence|machine learning|\bllms?\b/i, "AI"],
  [/startup|founder|venture|vc\b/i, "Startups"],
  [/\btech|technology|software|coding|developer|engineer/i, "Technology"],
  [/market|stocks?|psx|invest|finance|banking|banker/i, "Markets"],
  [/econom|inflation|imf|budget|rupee|interest rate/i, "Economy"],
  [/climate|environment|weather|energy/i, "Climate"],
  [/politic|election|government|parliament/i, "Politics"],
  [/pakistan|islamabad|lahore|karachi|rawalpindi|peshawar/i, "Pakistan"],
  [/gulf|middle east|dubai|saudi|qatar/i, "The Gulf"],
  [/health|medicine|fitness|doctor/i, "Health"],
  [/science|space|nasa|physics/i, "Science"],
  [/crypto|bitcoin|blockchain/i, "Crypto"],
  [/music|film|movies?|books?|culture|art\b/i, "Culture"],
  [/design|ux|ui\b/i, "Design"],
  [/education|university|student|exams?/i, "Education"],
  [/celebrit|gossip|showbiz|royals?\b/i, "Celebrity news"],
];

const CITIES = ["New York", "San Francisco", "Chicago", "London", "Toronto", "Dubai", "Singapore", "Sydney", "Manila", "Mexico City", "Lagos", "Delhi", "Dhaka", "Islamabad", "Rawalpindi", "Lahore", "Karachi", "Peshawar", "Quetta", "Multan"];

export type Parsed = { interests: string[]; negatives: string[]; role?: string; city?: string };

export function parseSentence(text: string): Parsed {
  const interests = new Set<string>();
  const negatives = new Set<string>();
  // Within each clause, words after "not", "no", "less", "hate", "skip", "without" are things to keep out.
  const parts = text.split(/(?:\bbut\b|[.;,])/i);
  for (const part of parts) {
    const at = part.search(/\b(not|no|never|less|hate|skip|without|avoid|don['’]?t)\b/i);
    const [yes, no] = at < 0 ? [part, ""] : [part.slice(0, at), part.slice(at)];
    for (const [re, topic] of TOPICS) {
      if (re.test(no)) negatives.add(topic);
      else if (re.test(yes)) interests.add(topic);
    }
  }
  for (const n of negatives) interests.delete(n);
  const role = text.match(/\b(?:i['’]?m|i am|work as|working as)\s+(?:an?\s+)?([a-z][a-z \-]{2,32}?)(?=\s+(?:in|at|from|who|and|,)|[,.]|$)/i)?.[1]?.trim();
  const city = CITIES.find((c) => new RegExp(`\\b${c}\\b`, "i").test(text));
  return { interests: [...interests], negatives: [...negatives], role, city };
}

export function guessCity(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    const map: Record<string, string> = { "Asia/Karachi": "Islamabad", "Europe/London": "London", "Asia/Dubai": "Dubai", "Asia/Kolkata": "Delhi", "Asia/Dhaka": "Dhaka", "America/New_York": "New York", "America/Toronto": "Toronto", "Asia/Manila": "Manila" };
    return map[zone] ?? (zone.split("/").pop() ?? "").replace(/_/g, " ");
  } catch {
    return "";
  }
}
