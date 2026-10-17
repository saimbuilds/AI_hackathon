// Adaptive onboarding deck: 12 real headlines chosen by farthest-point sampling over story
// fingerprints, weighted by importance, so 12 swipes cover the reader's interest space
// instead of 12 tech stories.
import { isMostlyLatin } from './lang';
import { adminClient } from './supabase';
import { dot, fromPg } from './vec';

export type DeckCard = { storyId: string; headline: string; dek: string | null; category: string | null; outlets: number; imageUrl: string | null };
type Candidate = { card: DeckCard; emb: Float32Array; weight: number };

// Greedy farthest-point sampling. weight in [0,1] tilts picks toward important stories;
// jitter makes each reader's deck a little different.
export function farthestPoint(cands: { emb: Float32Array; weight: number }[], n: number, rand: () => number = Math.random, jitter = 0.08): number[] {
  if (!cands.length) return [];
  const order = cands.map((c, i) => [i, c.weight] as const).sort((a, b) => b[1] - a[1]);
  const first = order[Math.floor(rand() * Math.min(5, order.length))][0];
  const chosen = [first];
  const maxSim = cands.map((c) => dot(c.emb, cands[first].emb));
  const taken = new Set(chosen);
  while (chosen.length < Math.min(n, cands.length)) {
    let best = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < cands.length; i++) {
      if (taken.has(i)) continue;
      const score = (1 - maxSim[i]) * (0.4 + 0.6 * cands[i].weight) * (1 + (rand() - 0.5) * 2 * jitter);
      if (score > bestScore) { bestScore = score; best = i; }
    }
    chosen.push(best);
    taken.add(best);
    for (let i = 0; i < cands.length; i++) maxSim[i] = Math.max(maxSim[i], dot(cands[i].emb, cands[best].emb));
  }
  return chosen;
}

let pool: { at: number; items: Candidate[] } | undefined;
const POOL_TTL_MS = 5 * 60_000;

async function loadPool(): Promise<Candidate[]> {
  if (pool && Date.now() - pool.at < POOL_TTL_MS) return pool.items;
  const db = adminClient();
  if (!db) return [];
  const since = new Date(Date.now() - 30 * 3_600_000).toISOString();
  const { data, error } = await db.from('stories').select('id,headline,dek,category,source_count,importance,image_url,embedding').gte('updated_at', since).not('headline', 'is', null).not('embedding', 'is', null).lte('distress', 2).order('importance', { ascending: false }).order('source_count', { ascending: false }).limit(250);
  if (error) throw new Error(error.message);
  // English headlines with a dek only (enriched stories); fall back to any English-script headline if that is too few.
  const english = (data ?? []).filter((s) => isMostlyLatin(`${s.headline} ${s.dek ?? ''}`));
  const withDek = english.filter((s) => s.dek);
  const rows = withDek.length >= 30 ? withDek : english;
  const items = rows.map((s) => ({
    card: { storyId: s.id as string, headline: s.headline as string, dek: (s.dek as string | null) ?? null, category: (s.category as string | null) ?? null, outlets: s.source_count as number, imageUrl: (s.image_url as string | null) ?? null },
    emb: fromPg(s.embedding as string),
    weight: Math.min(1, ((s.importance as number) + Math.min(5, s.source_count as number)) / 15),
  }));
  pool = { at: Date.now(), items };
  return items;
}

export async function buildDeck(n = 12): Promise<DeckCard[]> {
  const items = await loadPool();
  return farthestPoint(items, n).map((i) => items[i].card);
}
