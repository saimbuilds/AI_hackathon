// Load one reader and their candidate stories (36 h, printable, unseen, unmuted).
import type { SupabaseClient } from '@supabase/supabase-js';
import { fromPg, toPg } from '../lib/vec';
import { COUNTRY_NAMES } from '../lib/taxonomy';
import { userVector, type Cand, type ReaderModel } from './rank';

export type Profile = {
  id: string; name: string | null; paper_name: string | null; city: string | null; lat: number | null; lon: number | null; tz: string;
  size: 'espresso' | 'standard' | 'long'; tone: 'straight' | 'new' | 'witty'; language: string; large_print: boolean; calm: boolean;
  role: string | null; goals: string | null; interests: { chips?: string[]; topics?: string[]; entities?: string[]; negatives?: string[]; negativeTopics?: string[] };
  extras: Record<string, boolean>; memo: string | null; streak: number; email: string | null;
  vec_long: string | null; vec_short: string | null; topic_beta: Record<string, [number, number]>; muted: { topics?: string[]; sources?: string[]; stories?: string[] };
};

const TZ_COUNTRY: Record<string, string> = {
  'Asia/Karachi': 'pk', 'Asia/Kolkata': 'in', 'Asia/Calcutta': 'in', 'Asia/Dhaka': 'bd', 'Asia/Kathmandu': 'np', 'Asia/Colombo': 'lk', 'Asia/Kabul': 'af',
  'Europe/London': 'uk', 'Europe/Dublin': 'ie', 'Asia/Dubai': 'ae', 'Asia/Riyadh': 'sa', 'Asia/Qatar': 'qa', 'Asia/Tehran': 'ir', 'Europe/Istanbul': 'tr',
  'Africa/Cairo': 'eg', 'Africa/Lagos': 'ng', 'Africa/Nairobi': 'ke', 'Africa/Johannesburg': 'za', 'Europe/Berlin': 'de', 'Europe/Paris': 'fr',
  'Asia/Tokyo': 'jp', 'Asia/Seoul': 'kr', 'Asia/Shanghai': 'cn', 'Asia/Singapore': 'sg', 'Australia/Sydney': 'au', 'America/Toronto': 'ca',
};
export const countryOfTz = (tz: string): string => TZ_COUNTRY[tz] ?? (tz.startsWith('America/') ? 'us' : '');

export function readerModel(p: Profile): ReaderModel {
  return {
    vecLong: p.vec_long ? fromPg(p.vec_long) : null,
    vecShort: p.vec_short ? fromPg(p.vec_short) : null,
    topicBeta: p.topic_beta ?? {},
    mutedTopics: p.muted?.topics ?? [],
    mutedStories: p.muted?.stories ?? [],
    mutedSources: p.muted?.sources ?? [],
    country: countryOfTz(p.tz),
    calm: p.calm,
  };
}

export async function loadProfile(db: SupabaseClient, userId: string): Promise<Profile | null> {
  const { data, error } = await db.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw new Error(`profile: ${error.message}`);
  return (data as Profile | null) ?? null;
}

const chunk = <T,>(xs: T[], n: number): T[][] => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, (i + 1) * n));
const cleanOutlet = (name: string) => name.replace(/:.*$/, '').trim();

type StoryRow = {
  id: string; headline: string | null; dek: string | null; why_it_matters: string | null; category: string | null; topics: string[]; entities: { name: string; type: string }[];
  importance: number; distress: number; source_count: number; is_primary: boolean; updated_at: string; first_seen_at: string; day_count: number; parent_story_id: string | null;
  unknowns: string | null; quiz: Cand['quiz']; world: Cand['world']; image_url: string | null; embedding: string | null;
};

export async function loadCandidates(db: SupabaseClient, userId: string, profile: Profile, reader: ReaderModel, now = Date.now()): Promise<Cand[]> {
  const user = userVector(reader);
  const since = new Date(now - 36 * 3_600_000).toISOString();
  const { data: ids, error: idErr } = await db.rpc('edition_candidate_ids', {
    p_user: userId, p_vec: user ? toPg(user) : null, p_since: since, p_by_sim: 220, p_by_importance: 120,
    p_muted_topics: reader.mutedTopics, p_muted_stories: reader.mutedStories, p_max_distress: profile.calm ? 1 : 3,
  });
  if (idErr) throw new Error(`candidates: ${idErr.message}`);
  const idList = (ids as { id: string }[]).map((r) => r.id);
  if (!idList.length) return [];

  const stories: StoryRow[] = [];
  for (const part of chunk(idList, 100)) {
    const { data, error } = await db.from('stories').select('id,headline,dek,why_it_matters,category,topics,entities,importance,distress,source_count,is_primary,updated_at,first_seen_at,day_count,parent_story_id,unknowns,quiz,world,image_url,embedding').in('id', part);
    if (error) throw new Error(`stories: ${error.message}`);
    stories.push(...((data ?? []) as StoryRow[]));
  }

  const sentences = new Map<string, { text: string; sourceIds: string[]; position: number }[]>();
  const articles = new Map<string, { id: string; url: string; source_id: string | null; published_at: string | null }[]>();
  for (const part of chunk(idList, 60)) {
    const [s, a] = await Promise.all([
      db.from('story_sentences').select('story_id,position,text,source_ids').in('story_id', part).eq('verified', true).order('position'),
      db.from('articles').select('id,url,source_id,story_id,published_at').in('story_id', part).order('published_at', { ascending: false }).limit(part.length * 14),
    ]);
    if (s.error) throw new Error(`sentences: ${s.error.message}`);
    if (a.error) throw new Error(`articles: ${a.error.message}`);
    for (const r of s.data ?? []) sentences.set(r.story_id, [...(sentences.get(r.story_id) ?? []), { text: r.text, sourceIds: r.source_ids ?? [], position: r.position }]);
    for (const r of a.data ?? []) articles.set(r.story_id, [...(articles.get(r.story_id) ?? []), r]);
  }

  const srcIds = [...new Set([...articles.values()].flat().map((a) => a.source_id).filter((x): x is string => !!x))];
  const sources = new Map<string, { name: string; region: string }>();
  for (const part of chunk(srcIds, 100)) {
    const { data } = await db.from('sources').select('id,name,region').in('id', part);
    for (const s of data ?? []) sources.set(s.id, { name: cleanOutlet(s.name), region: s.region ?? '' });
  }

  return stories.flatMap((s) => {
    const sents = sentences.get(s.id);
    if (!sents?.length || !s.embedding || !s.headline) return [];
    const arts = articles.get(s.id) ?? [];
    // A muted outlet only hides stories it is the sole source of.
    if (reader.mutedSources.length && arts.length && arts.every((a) => reader.mutedSources.includes(sources.get(a.source_id ?? '')?.name ?? ''))) return [];
    const regionCount = new Map<string, number>();
    for (const a of arts) { const r = sources.get(a.source_id ?? '')?.region; if (r) regionCount.set(r, (regionCount.get(r) ?? 0) + 1); }
    const region = [...regionCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
    return [{
      id: s.id, headline: s.headline, dek: s.dek, whyItMatters: s.why_it_matters, category: s.category, topics: s.topics ?? [], entities: s.entities ?? [],
      importance: s.importance, distress: s.distress, sourceCount: s.source_count, isPrimary: s.is_primary, updatedAt: new Date(s.updated_at), firstSeen: new Date(s.first_seen_at),
      dayCount: s.day_count, parentId: s.parent_story_id, unknowns: s.unknowns, quiz: s.quiz, world: s.world, imageUrl: s.image_url, embedding: fromPg(s.embedding), region,
      sentences: sents.sort((a, b) => a.position - b.position).map((x) => ({ text: x.text, sourceIds: x.sourceIds })),
      articles: arts.map((a) => ({ id: a.id, name: sources.get(a.source_id ?? '')?.name ?? new URL(a.url).hostname.replace(/^www\./, ''), url: a.url })),
    } satisfies Cand];
  });
}

export const countryName = (code: string) => COUNTRY_NAMES[code] ?? '';
