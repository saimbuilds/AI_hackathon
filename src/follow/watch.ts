// Follow: a reader follows a question (Ask) or a story. After each press run (and before each of their
// builds) new stories since `last_checked_at` are matched by keywords (and, for a story, by thread);
// a small LLM call decides whether they change the answer and writes one sentence on what changed.
// That becomes a "Since you asked" update at the top of the next paper.
import { z } from 'zod';
import pLimit from 'p-limit';
import type { SupabaseClient } from '@supabase/supabase-js';
import { llm, LLMUnavailableError, wrapUntrusted } from '../lib/llm';
import { numbersSupported } from '../press/enrich';
import { heuristicKeywords, loadStoryDocs, renderStories, searchStories, type AskAnswer, type StoryDoc } from './ask';

export const FREE_FOLLOW_LIMIT = 3;

export type WatchRow = {
  id: string; user_id: string; kind: 'ask' | 'story'; question: string; story_id: string | null; thread_id: string | null;
  keywords: string[]; topic: string | null; answer: string | null; sources: unknown; last_checked_at: string; created_at: string;
};

export type EditionUpdate = { watchId: string; question: string; summary: string; sources: { name: string; url: string }[]; storyId?: string };

// ------------------------------------------------------------------- create ----

export async function assertCanFollow(db: SupabaseClient, userId: string): Promise<{ ok: true } | { ok: false; limit: number }> {
  const [{ count }, { data: profile }] = await Promise.all([
    db.from('watches').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    db.from('profiles').select('plan').eq('id', userId).maybeSingle(),
  ]);
  if (profile?.plan === 'plus') return { ok: true };
  return (count ?? 0) >= FREE_FOLLOW_LIMIT ? { ok: false, limit: FREE_FOLLOW_LIMIT } : { ok: true };
}

export async function createAskWatch(db: SupabaseClient, userId: string, question: string, a: AskAnswer): Promise<string> {
  const { data, error } = await db.from('watches').insert({
    user_id: userId, kind: 'ask', question, keywords: a.keywords, topic: a.topic, answer: a.answer, sources: a.sources,
  }).select('id').single();
  if (error) throw new Error(`watches insert: ${error.message}`);
  return data.id as string;
}

// Story follow: keywords from the story's own entities and headline, thread = its parent story (or itself).
export async function createStoryWatch(db: SupabaseClient, userId: string, storyId: string): Promise<{ id: string; question: string } | null> {
  const { data: s } = await db.from('stories').select('id,headline,entities,topics,parent_story_id,printable').eq('id', storyId).maybeSingle();
  if (!s?.printable || !s.headline) return null;
  const { data: existing } = await db.from('watches').select('id,question').eq('user_id', userId).eq('story_id', storyId).maybeSingle();
  if (existing) return existing as { id: string; question: string };
  const entities = ((s.entities as { name: string; type: string }[] | null) ?? []).filter((e) => e.type !== 'other').map((e) => e.name.toLowerCase());
  const keywords = [...new Set([...entities.slice(0, 5), ...heuristicKeywords(s.headline).slice(0, 4)])];
  const [doc] = await loadStoryDocs(db, [s.id]);
  const { data, error } = await db.from('watches').insert({
    user_id: userId, kind: 'story', question: s.headline.slice(0, 300), story_id: s.id, thread_id: s.parent_story_id ?? s.id,
    keywords, topic: (s.topics as string[] | null)?.[0] ?? null, answer: doc?.text.slice(0, 600) ?? null,
    sources: doc ? [{ storyId: doc.id, headline: doc.headline, name: doc.source?.name ?? 'Source', url: doc.source?.url ?? '' }] : [],
  }).select('id,question').single();
  if (error) throw new Error(`watches insert: ${error.message}`);
  return data as { id: string; question: string };
}

// --------------------------------------------------------------------- list ----

export async function listWatches(db: SupabaseClient, userId: string) {
  const { data: watches } = await db.from('watches').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  const ids = (watches ?? []).map((w) => w.id);
  const { data: updates } = ids.length
    ? await db.from('watch_updates').select('id,watch_id,summary,sources,story_ids,created_at,seen_at').in('watch_id', ids).order('created_at', { ascending: false })
    : { data: [] };
  return (watches as WatchRow[] ?? []).map((w) => {
    const mine = (updates ?? []).filter((u) => u.watch_id === w.id);
    const u = mine[0];
    return {
      id: w.id, kind: w.kind, question: w.question, storyId: w.story_id, topic: w.topic, answer: w.answer, sources: w.sources,
      createdAt: w.created_at, lastCheckedAt: w.last_checked_at,
      unseen: mine.filter((x) => !x.seen_at).length,
      latestUpdate: u ? { id: u.id, summary: u.summary, sources: u.sources, storyIds: u.story_ids, createdAt: u.created_at, seenAt: u.seen_at } : null,
    };
  });
}

// ------------------------------------------------------------------- matching ----

const UpdateSchema = z.object({
  changes: z.boolean(),
  summary: z.string().max(300).nullish(),
  stories: z.array(z.number().int()).max(4).nullish(),
});

const WATCH_SYSTEM = `A reader follows a question. You get the QUESTION, what we told them before (PREVIOUS), and NEW numbered news STORIES.
changes=true only if a new story adds a concrete new fact that answers or changes the answer to the question (new price, decision, result, date, figure). Mere mentions, opinion or repetition of PREVIOUS = false.
If true: summary = ONE plain sentence on what changed, using only facts from the cited new stories, and "stories" = their numbers. Neutral, no advice.`;

async function newStoriesFor(db: SupabaseClient, w: WatchRow): Promise<StoryDoc[]> {
  const since = new Date(w.last_checked_at);
  const seen = new Set(((w.sources as { storyId?: string }[] | null) ?? []).map((s) => s.storyId));
  const found = w.keywords.length ? await searchStories(db, w.keywords, since, 6) : [];
  if (w.thread_id) {
    const { data } = await db.from('stories').select('id').or(`id.eq.${w.thread_id},parent_story_id.eq.${w.thread_id}`).gt('updated_at', since.toISOString()).eq('printable', true).limit(4);
    const extra = await loadStoryDocs(db, (data ?? []).map((r) => r.id as string).filter((id) => !found.some((f) => f.id === id)));
    found.unshift(...extra);
  }
  return found.filter((d) => !seen.has(d.id) || d.id === w.thread_id).slice(0, 6);
}

export async function checkWatch(db: SupabaseClient, w: WatchRow): Promise<'updated' | 'nothing' | 'no-llm'> {
  const checkedAt = new Date().toISOString();
  const docs = await newStoriesFor(db, w);
  if (!docs.length) {
    await db.from('watches').update({ last_checked_at: checkedAt }).eq('id', w.id);
    return 'nothing';
  }
  let out: z.infer<typeof UpdateSchema>;
  try {
    const res = await llm({
      task: 'watch', system: WATCH_SYSTEM, schema: UpdateSchema,
      user: `${wrapUntrusted('reader question', w.question)}\n\nPREVIOUS:\n${wrapUntrusted('previous answer', w.answer ?? '(nothing yet)')}\n\nSTORIES:\n${wrapUntrusted('new stories', renderStories(docs))}`,
    });
    out = res.data;
  } catch (e) {
    if (!(e instanceof LLMUnavailableError)) throw e;
    return 'no-llm'; // leave last_checked_at so the next run retries these stories
  }
  const cited = [...new Set(out.stories ?? [])].filter((n) => n >= 1 && n <= docs.length).map((n) => docs[n - 1]);
  const summary = out.summary?.trim();
  const grounded = !!summary && cited.length > 0 && numbersSupported(summary, cited.map((d) => `${d.headline} ${d.dek} ${d.text} ${d.updatedAt.slice(0, 10)}`).join(' '));
  if (out.changes && grounded) {
    const sources = cited.filter((d) => d.source).map((d) => ({ name: d.source!.name, url: d.source!.url }));
    await db.from('watch_updates').insert({ watch_id: w.id, user_id: w.user_id, summary, story_ids: cited.map((d) => d.id), sources });
    const prev = (w.sources as unknown[] | null) ?? [];
    await db.from('watches').update({
      last_checked_at: checkedAt, answer: `${w.answer ?? ''} Update: ${summary}`.trim().slice(-1500),
      sources: [...prev, ...cited.map((d) => ({ storyId: d.id, headline: d.headline, name: d.source?.name ?? 'Source', url: d.source?.url ?? '' }))].slice(-12),
    }).eq('id', w.id);
    return 'updated';
  }
  await db.from('watches').update({ last_checked_at: checkedAt }).eq('id', w.id);
  return 'nothing';
}

// After a press run: every watch whose last check is older than the newest story. Optionally one reader only.
export async function matchWatches(db: SupabaseClient, opts: { userId?: string; max?: number; concurrency?: number } = {}) {
  let q = db.from('watches').select('*').order('last_checked_at', { ascending: true }).limit(opts.max ?? 500);
  if (opts.userId) q = q.eq('user_id', opts.userId);
  const { data } = await q;
  const stats = { checked: 0, updated: 0, noLlm: 0 };
  const limit = pLimit(opts.concurrency ?? 4);
  await Promise.all(((data ?? []) as WatchRow[]).map((w) => limit(async () => {
    const r = await checkWatch(db, w).catch(() => 'nothing' as const);
    stats.checked += 1;
    if (r === 'updated') stats.updated += 1;
    if (r === 'no-llm') stats.noLlm += 1;
  })));
  return stats;
}

// For the edition builder: unseen updates become Edition.updates and are marked seen.
export async function takeUpdatesForEdition(db: SupabaseClient, userId: string, max = 3): Promise<EditionUpdate[]> {
  const { data: ups } = await db.from('watch_updates').select('id,watch_id,summary,sources,story_ids').eq('user_id', userId).is('seen_at', null).order('created_at', { ascending: false }).limit(max);
  if (!ups?.length) return [];
  const { data: ws } = await db.from('watches').select('id,question').in('id', [...new Set(ups.map((u) => u.watch_id))]);
  const question = new Map((ws ?? []).map((w) => [w.id as string, w.question as string]));
  await db.from('watch_updates').update({ seen_at: new Date().toISOString() }).in('id', ups.map((u) => u.id));
  return ups.flatMap((u) => {
    const q = question.get(u.watch_id);
    const sources = ((u.sources as { name: string; url: string }[]) ?? []).filter((s) => /^https?:\/\//.test(s.url));
    if (!q || !sources.length) return [];
    return [{ watchId: u.watch_id, question: q, summary: u.summary, sources, ...((u.story_ids as string[])[0] ? { storyId: (u.story_ids as string[])[0] } : {}) }];
  });
}
