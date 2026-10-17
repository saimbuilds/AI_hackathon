// Write once per story: headline, dek, a brief made of CITED sentences, why-it-matters, taxonomy,
// quiz, per-country lines. Then a fact-check pass drops every sentence the sources don't support.
// The editor LLM later only selects and frames this material; it never changes facts.
import { z } from 'zod';
import pLimit from 'p-limit';
import type { SupabaseClient } from '@supabase/supabase-js';
import { adminClient } from '../lib/supabase';
import { llm, LLMUnavailableError, wrapUntrusted, type Attempt } from '../lib/llm';
import { CATEGORIES, COUNTRY_NAMES, TOPICS } from '../lib/taxonomy';
import { domainOf } from './normalize';
import { dot, fromPg } from '../lib/vec';

const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

// ------------------------------------------------------------------ prompt inputs ----

export type SrcArticle = { n: number; id: string; url: string; title: string; text: string; outlet: string; country: string; language: string; domain: string; kind: string; category: string };
export type StoryInput = { id: string; key: string; provisional: number; sourceCount: number; articles: SrcArticle[] };

const PER_ARTICLE_CHARS = 1500;
const MAX_ARTICLES = 6;

// Prefer distinct outlets and primary sources; give each the fullest text we have.
export function pickArticles(
  rows: { id: string; url: string; title: string; excerpt: string | null; content_text: string | null; source_id: string | null; published_at: string | null }[],
  sources: Map<string, { name: string; region: string; language: string; kind: string; category: string }>,
): SrcArticle[] {
  const scored = rows.map((r) => {
    const s = r.source_id ? sources.get(r.source_id) : undefined;
    return { r, s, domain: domainOf(r.url), rank: (s?.kind === 'primary' ? 2 : 0) + (r.content_text ? 1 : 0) + (s?.language === 'en' ? 0.5 : 0) };
  }).sort((a, b) => b.rank - a.rank);
  const seen = new Set<string>();
  const picked: typeof scored = [];
  for (const x of scored) { if (!seen.has(x.domain)) { seen.add(x.domain); picked.push(x); } }
  for (const x of scored) if (picked.length < MAX_ARTICLES && !picked.includes(x)) picked.push(x);
  return picked.slice(0, MAX_ARTICLES).map(({ r, s, domain }, i) => ({
    n: i + 1, id: r.id, url: r.url, title: r.title, domain, kind: s?.kind ?? 'rss', category: s?.category ?? 'general',
    text: (r.content_text ?? r.excerpt ?? '').slice(0, PER_ARTICLE_CHARS), outlet: s?.name.replace(/:.*$/, '') ?? domain,
    country: COUNTRY_NAMES[s?.region ?? ''] ?? '', language: s?.language ?? 'en',
  }));
}

export function renderStory(s: StoryInput): string {
  const body = s.articles.map((a) => `[${a.n}] ${a.outlet}${a.country ? `, ${a.country}` : ''} (${a.language}): ${a.title}\n${a.text}`).join('\n\n');
  return `=== STORY ${s.key} ===\n${wrapUntrusted(`articles for ${s.key}`, body)}`;
}

// ---------------------------------------------------------------------- schemas ----

const TOPIC_SLUGS = Object.keys(TOPICS) as [string, ...string[]];

export const EnrichedStorySchema = z.object({
  id: z.string(),
  headline: z.string().min(8).max(160),
  dek: z.string().min(8).max(300),
  brief: z.array(z.object({ text: z.string().min(15), sources: z.array(z.number().int()).min(1) })).min(1).max(6),
  whyItMatters: z.string().min(8).max(300),
  category: z.enum(CATEGORIES),
  topics: z.array(z.enum(TOPIC_SLUGS)).min(1).max(4),
  entities: z.array(z.object({ name: z.string(), type: z.enum(['person', 'org', 'place', 'product', 'event', 'other']) })).max(10),
  importance: z.number().int().min(1).max(10),
  distress: z.number().int().min(0).max(3),
  unknowns: z.string().max(300).nullish(),
  quiz: z.object({ q: z.string(), options: z.array(z.string()).length(4), answer: z.number().int().min(0).max(3) }).nullish(),
  world: z.array(z.object({ source: z.number().int(), line: z.string().max(200) })).max(6).nullish(),
});
export const EnrichBatchSchema = z.object({ stories: z.array(EnrichedStorySchema) });
export type EnrichedStory = z.infer<typeof EnrichedStorySchema>;

export const FactBatchSchema = z.object({ results: z.array(z.object({ k: z.string(), supported: z.boolean() })) });

const ENRICH_SYSTEM = `You are the copy desk of a careful, neutral newspaper. For each STORY you get numbered source articles [1], [2]...
Write ONLY from those articles. Output English even when sources are in other languages.
Rules:
- brief: 3 to 5 short sentences. Every sentence must be fully supported by the articles it cites (field "sources": the article numbers). Never add a fact, number, name, date or cause that the cited articles do not state. No opinion, no speculation, no advice. Attribute claims ("police say").
- headline: neutral, specific, at most 12 words, no clickbait. dek: one sentence that adds information beyond the headline.
- whyItMatters: one grounded sentence on why a general reader should care (no financial or medical advice).
- category: one of ${CATEGORIES.join(', ')}. topics: 1-4 slugs chosen ONLY from this list: ${TOPIC_SLUGS.join(', ')}. entities: main people/orgs/places.
- importance: 1-10 for global significance (a routine local item is 1-3; war, major markets, major disasters are 8-10).
- distress: 0 calm, 1 mild, 2 upsetting, 3 graphic or tragic (deaths, violence against children).
- unknowns: what the sources say is still unclear or unconfirmed (omit if nothing).
- quiz: one factual question answerable from the brief, with exactly 4 options and the index (0-3) of the correct one.
- world: up to 5 entries {source, line}: for articles from different countries, one plain-English line (<= 25 words) on that outlet's angle. Skip if all sources are the same country.
Return {"stories":[{"id":"S1", ...}]} with one entry per STORY, ids exactly as given.`;

const FACT_SYSTEM = `You are a strict fact-checker. For each item you get a SENTENCE and the EXCERPTS it cites.
supported = true only if every claim in the sentence (names, numbers, dates, who did what, causes) is stated in the excerpts. If any part is missing, contradicted or goes beyond the excerpts, supported = false.
Return {"results":[{"k":"<item key>","supported":true|false}]} for every item.`;

// ------------------------------------------------------------- deterministic checks ----

const numbersIn = (s: string) => (s.match(/\d[\d,.]*/g) ?? []).map((n) => n.replace(/[,.]+$/, '').replace(/,/g, ''));

// Cheap guard that runs before (and instead of, when no checker is available) the LLM pass:
// every figure in a sentence must appear in the text of the articles it cites.
export function numbersSupported(sentence: string, citedText: string): boolean {
  const haystack = citedText.replace(/,/g, '');
  return numbersIn(sentence).every((n) => haystack.includes(n));
}

export type DraftSentence = { text: string; sources: number[] };

export function validateSentences(brief: DraftSentence[], articles: SrcArticle[]): { kept: DraftSentence[]; dropped: number } {
  const byN = new Map(articles.map((a) => [a.n, a]));
  const kept: DraftSentence[] = [];
  for (const s of brief) {
    const cited = [...new Set(s.sources)].filter((n) => byN.has(n));
    if (!cited.length) continue; // unsupported sentences are dropped: no citation, no print
    const text = cited.map((n) => `${byN.get(n)!.title} ${byN.get(n)!.text}`).join(' ');
    if (!numbersSupported(s.text, text)) continue;
    kept.push({ text: s.text.trim(), sources: cited });
  }
  return { kept, dropped: brief.length - kept.length };
}

// Verbatim-from-source fallback so a story always has at least one verified, cited sentence.
export function fallbackSentences(articles: SrcArticle[]): DraftSentence[] {
  const lead = articles.find((a) => a.text.length > 40 && a.language === 'en') ?? articles.find((a) => a.text.length > 40);
  if (!lead) return [];
  const first = lead.text.match(/^.{40,300}?[.!?](\s|$)/)?.[0].trim() ?? lead.text.slice(0, 240).trim();
  return [{ text: first, sources: [lead.n] }];
}

// -------------------------------------------------------------------- runner ----

export type EnrichStats = { enriched: number; fallback: number; sentences: number; verified: number; grounding: number | null; llmCalls: number; models: Record<string, number>; failedBatches: number; costUsd: number };

type Candidate = { id: string; source_count: number; importance: number; updated_at: string; enriched_sources: number; enriched_at: string | null };

async function pickCandidates(db: SupabaseClient, max: number, perCategory: number, sinceHours: number): Promise<Candidate[]> {
  const since = new Date(Date.now() - sinceHours * 3_600_000).toISOString();
  const { data, error } = await db.from('stories').select('id,source_count,importance,updated_at,enriched_sources,enriched_at').gte('updated_at', since).order('importance', { ascending: false }).limit(4000);
  if (error) throw new Error(error.message);
  const need = (data as Candidate[]).filter((s) => !s.enriched_at || s.source_count >= s.enriched_sources + 2);
  if (!need.length) return [];
  // Category quota: keep niche beats (F1, cricket...) in the pool instead of only the loudest stories.
  const ids = need.map((s) => s.id);
  const cat = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data: arts } = await db.from('articles').select('story_id,source_id').in('story_id', ids.slice(i, i + 200));
    const srcIds = [...new Set((arts ?? []).map((a) => a.source_id).filter(Boolean))];
    const { data: srcs } = srcIds.length ? await db.from('sources').select('id,category').in('id', srcIds) : { data: [] };
    const sc = new Map((srcs ?? []).map((s) => [s.id, s.category as string]));
    for (const a of arts ?? []) if (!cat.has(a.story_id) && sc.get(a.source_id)) cat.set(a.story_id, sc.get(a.source_id)!);
  }
  const used = new Map<string, number>();
  const out: Candidate[] = [];
  for (const s of need) {
    const c = cat.get(s.id) ?? 'general';
    if ((used.get(c) ?? 0) >= perCategory) continue;
    used.set(c, (used.get(c) ?? 0) + 1);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

export async function runEnrich(opts: { max?: number; perCategory?: number; batchSize?: number; sinceHours?: number; concurrency?: number } = {}): Promise<EnrichStats> {
  const db = adminClient();
  if (!db) throw new Error('Supabase env missing');
  const max = opts.max ?? 160;
  const batchSize = opts.batchSize ?? 2; // 4 stories overflowed the output budget (~900 tokens per story with quiz + world lines)
  const stats: EnrichStats = { enriched: 0, fallback: 0, sentences: 0, verified: 0, grounding: null, llmCalls: 0, models: {}, failedBatches: 0, costUsd: 0 };

  const cands = await pickCandidates(db, max, opts.perCategory ?? 14, opts.sinceHours ?? 36);
  log(`enrich: ${cands.length} stories to write up`);
  if (!cands.length) return stats;

  const { data: srcRows } = await db.from('sources').select('id,name,region,language,kind,category');
  const sources = new Map((srcRows ?? []).map((s) => [s.id as string, s as { name: string; region: string; language: string; kind: string; category: string }]));

  const inputs: StoryInput[] = [];
  for (const c of cands) {
    const { data: arts } = await db.from('articles').select('id,url,title,excerpt,content_text,source_id,published_at').eq('story_id', c.id).order('published_at', { ascending: false }).limit(40);
    if (!arts?.length) continue;
    inputs.push({ id: c.id, key: '', provisional: c.importance, sourceCount: c.source_count, articles: pickArticles(arts, sources) });
  }

  const record = (attempts: Attempt[], model: string, cost: number) => { stats.llmCalls += 1; stats.models[model] = (stats.models[model] ?? 0) + 1; stats.costUsd += cost; void attempts; };
  let totalSentences = 0;
  let verifiedSentences = 0;

  const runBatch = async (i: number) => {
    const batch = inputs.slice(i, i + batchSize).map((s, j) => ({ ...s, key: `S${j + 1}` }));
    let written = new Map<string, EnrichedStory>();
    try {
      const res = await llm({ task: 'enrich', system: ENRICH_SYSTEM, user: batch.map(renderStory).join('\n\n'), schema: EnrichBatchSchema });
      record(res.attempts, res.model, res.costUsd);
      written = new Map(res.data.stories.map((s) => [s.id, s]));
    } catch (e) {
      if (!(e instanceof LLMUnavailableError)) throw e;
      stats.failedBatches += 1;
      log(`enrich batch ${i / batchSize + 1}: ${e.message}`);
    }

    // Deterministic guard per story, then ONE fact-check call for the whole batch.
    const drafts = batch.map((s) => {
      const w = written.get(s.key);
      return { s, w, generated: w?.brief.length ?? 0, sentences: w ? validateSentences(w.brief, s.articles).kept : [] };
    });
    const checked = await factCheck(drafts.filter((d) => d.sentences.length).map((d) => ({ s: d.s, sentences: d.sentences })), record);

    for (const d of drafts) {
      let sentences = checked.get(d.s.key) ?? [];
      const usedFallback = sentences.length === 0;
      if (usedFallback) sentences = fallbackSentences(d.s.articles);
      if (!sentences.length) continue; // nothing citable at all: leave the story out of editions

      if (d.w && !usedFallback) { totalSentences += d.generated; verifiedSentences += sentences.length; }
      await save(db, d.s, d.w ?? null, sentences, usedFallback, stats);
    }
    done += batch.length;
    if ((i / batchSize) % 10 === 0) log(`enrich: ${done}/${inputs.length} (${stats.enriched} written, $${stats.costUsd.toFixed(3)})`);
  };
  let done = 0;
  const limit = pLimit(opts.concurrency ?? 6);
  await Promise.all(Array.from({ length: Math.ceil(inputs.length / batchSize) }, (_, b) => limit(() => runBatch(b * batchSize))));

  stats.sentences = totalSentences;
  stats.verified = verifiedSentences;
  stats.grounding = totalSentences ? Math.round((verifiedSentences / totalSentences) * 1000) / 1000 : null;
  log(`enrich: ${stats.enriched} written, ${stats.fallback} fallback, grounding ${stats.grounding ?? 'n/a'} (${verifiedSentences}/${totalSentences})`);
  return stats;
}

async function factCheck(group: { s: StoryInput; sentences: DraftSentence[] }[], record: (a: Attempt[], m: string, c: number) => void): Promise<Map<string, DraftSentence[]>> {
  const out = new Map(group.map((g) => [g.s.key, g.sentences]));
  if (!group.length) return out;
  const items = group.flatMap(({ s, sentences }) => sentences.map((x, i) => ({ story: s, k: `${s.key}.${i + 1}`, x })));
  const user = items.map(({ story, k, x }) => {
    const excerpts = x.sources.map((n) => `[${n}] ${story.articles.find((a) => a.n === n)!.text.slice(0, 1200)}`).join('\n');
    return `ITEM ${k}\nSENTENCE: ${x.text}\nEXCERPTS:\n${wrapUntrusted(`excerpts for ${k}`, excerpts)}`;
  }).join('\n\n');
  try {
    const res = await llm({ task: 'factcheck', system: FACT_SYSTEM, user, schema: FactBatchSchema });
    record(res.attempts, res.model, res.costUsd);
    const verdict = new Map(res.data.results.map((r) => [r.k, r.supported]));
    for (const g of group) out.set(g.s.key, items.filter((it) => it.story === g.s && verdict.get(it.k) === true).map((it) => it.x));
    return out;
  } catch (e) {
    if (!(e instanceof LLMUnavailableError)) throw e;
    return out; // checker down: the deterministic number/citation guard already ran
  }
}

async function save(db: SupabaseClient, s: StoryInput, w: EnrichedStory | null, sentences: DraftSentence[], usedFallback: boolean, stats: EnrichStats) {
  const byN = new Map(s.articles.map((a) => [a.n, a]));
  await db.from('story_sentences').delete().eq('story_id', s.id);
  const { error: sErr } = await db.from('story_sentences').insert(sentences.map((x, i) => ({ story_id: s.id, position: i, text: x.text, source_ids: x.sources.map((n) => byN.get(n)!.id), verified: true })));
  if (sErr) throw new Error(`story_sentences: ${sErr.message}`);

  const world = (w?.world ?? []).flatMap((x) => {
    const a = byN.get(x.source);
    return a && a.country ? [{ country: a.country, outlet: a.outlet, line: x.line, url: a.url }] : [];
  });
  const quiz = w?.quiz && new Set(w.quiz.options).size === 4 ? w.quiz : null;
  const patch = usedFallback || !w
    ? { enriched_at: null, grounding: null, printable: true, category: await fallbackCategory(s), topics: await nearestTopics(db, s.id) }
    : {
        headline: w.headline, dek: w.dek, why_it_matters: w.whyItMatters, category: w.category, topics: w.topics, entities: w.entities,
        importance: Math.round((w.importance + s.provisional) / 2), distress: w.distress, unknowns: w.unknowns ?? null,
        quiz, world: world.length ? world : null, printable: true, enriched_at: new Date().toISOString(), enriched_sources: s.sourceCount, grounding: sentences.length / Math.max(1, w.brief.length),
      };
  if (Object.keys(patch).length) {
    const { error } = await db.from('stories').update(patch).eq('id', s.id);
    if (error) throw new Error(`stories update: ${error.message}`);
  }
  if (usedFallback || !w) stats.fallback += 1; else stats.enriched += 1;
}

// ---- fallback classification (no LLM): source category + nearest topic fingerprints ----------

const CATEGORY_SET = new Set<string>(CATEGORIES);
async function fallbackCategory(s: StoryInput): Promise<string> {
  const counts = new Map<string, number>();
  for (const a of s.articles) counts.set(a.category, (counts.get(a.category) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'general';
  return CATEGORY_SET.has(top) ? top : 'general';
}

let topicVecs: { topic: string; vec: Float32Array }[] | undefined;
async function nearestTopics(db: SupabaseClient, storyId: string): Promise<string[]> {
  if (!topicVecs) {
    const { data } = await db.from('topic_vectors').select('topic,embedding');
    topicVecs = (data ?? []).map((r) => ({ topic: r.topic as string, vec: fromPg(r.embedding as string) }));
  }
  if (!topicVecs.length) return [];
  const { data } = await db.from('stories').select('embedding').eq('id', storyId).single();
  if (!data?.embedding) return [];
  const e = fromPg(data.embedding as string);
  const ranked = topicVecs.map((t) => ({ topic: t.topic, sim: dot(e, t.vec) })).sort((a, b) => b.sim - a.sim);
  return ranked.filter((r, i) => i === 0 || (i < 2 && r.sim >= ranked[0].sim - 0.02)).map((r) => r.topic);
}
