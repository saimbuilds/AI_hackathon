// The Daily 3: three questions from today's top global stories, identical for every reader.
// One row per UTC date in daily_three; generated once, idempotent.
import { z } from 'zod';
import { adminClient } from '../lib/supabase';
import { llm, LLMUnavailableError, wrapUntrusted } from '../lib/llm';
import { QuizItemSchema, type QuizItem } from '../types/edition';

const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

const OutSchema = z.object({
  questions: z.array(z.object({ story: z.string(), q: z.string().min(10), options: z.array(z.string()).length(4), answer: z.number().int().min(0).max(3) })).min(3),
});

const SYSTEM = `You write the "Daily 3", a quick news quiz shared by every reader. From the STORIES below write exactly 3 multiple-choice questions.
Rules: each question about a different story; answerable from the story facts alone (who/what/where/how many), no trick questions, no opinion;
4 options, one correct, distractors plausible and of the same type (names with names, numbers with numbers); vary the correct index.
Return {"questions":[{"story":"S1","q":"...","options":["a","b","c","d"],"answer":0}]}.`;

export function isValidQuiz(q: { options: string[]; answer: number }): boolean {
  return q.options.length === 4 && new Set(q.options.map((o) => o.trim().toLowerCase())).size === 4 && q.answer >= 0 && q.answer < 4;
}

export async function runDaily3(opts: { force?: boolean; date?: string } = {}): Promise<{ date: string; source: 'llm' | 'stored' | 'exists' | 'none' }> {
  const db = adminClient();
  if (!db) throw new Error('Supabase env missing');
  const date = opts.date ?? new Date().toISOString().slice(0, 10);

  if (!opts.force) {
    const { data } = await db.from('daily_three').select('date').eq('date', date).maybeSingle();
    if (data) return { date, source: 'exists' };
  }

  const since = new Date(Date.now() - 30 * 3_600_000).toISOString();
  const { data: stories } = await db.from('stories').select('id,headline,quiz,importance,source_count,distress').gte('updated_at', since).not('enriched_at', 'is', null).lte('distress', 2).order('importance', { ascending: false }).order('source_count', { ascending: false }).limit(8);
  if (!stories || stories.length < 3) { log('daily3: not enough enriched stories yet'); return { date, source: 'none' }; }

  const { data: sents } = await db.from('story_sentences').select('story_id,position,text').in('story_id', stories.map((s) => s.id)).eq('verified', true).order('position');
  const brief = (id: string) => (sents ?? []).filter((x) => x.story_id === id).map((x) => x.text).join(' ');
  const keyed = stories.map((s, i) => ({ ...s, key: `S${i + 1}` }));

  let items: QuizItem[] = [];
  let source: 'llm' | 'stored' = 'llm';
  try {
    const user = keyed.map((s) => `=== STORY ${s.key}: ${s.headline} ===\n${wrapUntrusted(s.key, brief(s.id))}`).join('\n\n');
    const res = await llm({ task: 'daily3', system: SYSTEM, user, schema: OutSchema });
    const used = new Set<string>();
    for (const q of res.data.questions) {
      const story = keyed.find((s) => s.key === q.story);
      if (!story || used.has(story.id) || !isValidQuiz(q)) continue;
      used.add(story.id);
      items.push({ q: q.q.trim(), options: q.options.map((o) => o.trim()), answer: q.answer, storyId: story.id });
      if (items.length === 3) break;
    }
  } catch (e) {
    if (!(e instanceof LLMUnavailableError)) throw e;
  }

  if (items.length < 3) {
    // No LLM (or a bad answer): reuse the per-story quizzes written during enrichment.
    source = 'stored';
    items = keyed.flatMap((s) => {
      const parsed = QuizItemSchema.safeParse({ ...(s.quiz as object), storyId: s.id });
      return parsed.success && isValidQuiz(parsed.data) ? [parsed.data] : [];
    }).slice(0, 3);
  }
  if (items.length < 3) { log(`daily3: only ${items.length} valid questions, skipping`); return { date, source: 'none' }; }

  const { error } = await db.from('daily_three').upsert({ date, questions: items }, { onConflict: 'date' });
  if (error) throw new Error(`daily_three: ${error.message}`);
  log(`daily3: stored ${items.length} questions for ${date} (${source})`);
  return { date, source };
}
