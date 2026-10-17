// Run the Learning Lab on the real story pool and store the result for GET /api/lab.
// `pnpm lab` (flags: --judge=auto|llm|keywords  --days=7  --size=14  --seed=42  --no-save)
import { z } from 'zod';
import { adminClient } from '../lib/supabase';
import { llm, LLMUnavailableError, wrapUntrusted } from '../lib/llm';
import { dot, fromPg } from '../lib/vec';
import type { Cand } from '../edition/rank';
import { PERSONAS, type Persona } from './personas';
import { DEFAULT_CONFIG, keywordJudge, simulatePersona, summarize, type Judge, type Label, type LabConfig, type PersonaResult } from './sim';

const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

export type LabResults = {
  generatedAt: string;
  mode: 'llm' | 'keywords' | 'mixed';
  config: LabConfig;
  pool: { stories: number; hoursCovered: number; perDay: number; note: string };
  personas: PersonaResult[];
  summary: ReturnType<typeof summarize>;
};

async function loadPool(): Promise<{ cands: Cand[]; topicVecs: Map<string, Float32Array> }> {
  const db = adminClient();
  if (!db) throw new Error('Supabase env missing');
  const { data: tv } = await db.from('topic_vectors').select('topic,embedding');
  const topicVecs = new Map((tv ?? []).map((r) => [r.topic as string, fromPg(r.embedding as string)]));
  if (!topicVecs.size) throw new Error('topic_vectors is empty: run `pnpm press --skip-press` once to seed it');

  const since = new Date(Date.now() - 120 * 3_600_000).toISOString();
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('stories').select('id,headline,dek,category,topics,importance,source_count,is_primary,first_seen_at,updated_at,embedding').gte('updated_at', since).not('headline', 'is', null).not('embedding', 'is', null).range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const nearest = (e: Float32Array): string[] => {
    const ranked = [...topicVecs].map(([topic, v]) => ({ topic, sim: dot(e, v) })).sort((a, b) => b.sim - a.sim);
    return ranked.filter((r, i) => i === 0 || (i < 2 && r.sim >= ranked[0].sim - 0.02)).map((r) => r.topic);
  };
  const cands = rows.map((s): Cand => {
    const emb = fromPg(s.embedding as string);
    const real = ((s.topics as string[]) ?? []).filter((t) => topicVecs.has(t));
    return {
      id: s.id as string, headline: s.headline as string, dek: (s.dek as string | null) ?? null, whyItMatters: null, category: (s.category as string | null) ?? null, topics: real.length ? real : nearest(emb),
      entities: [], importance: s.importance as number, distress: 0, sourceCount: s.source_count as number, isPrimary: s.is_primary as boolean, updatedAt: new Date(s.updated_at as string), firstSeen: new Date(s.first_seen_at as string),
      dayCount: 1, parentId: null, unknowns: null, quiz: null, world: null, imageUrl: null, embedding: emb, region: '', sentences: [], articles: [],
    };
  });
  return { cands, topicVecs };
}

// Equal-size chronological slices stand in for "days" (the real pool spans only a couple of days until backfill exists).
function slice(cands: Cand[], days: number): Cand[][] {
  const sorted = [...cands].sort((a, b) => a.firstSeen.getTime() - b.firstSeen.getTime());
  const per = Math.ceil(sorted.length / days);
  return Array.from({ length: days }, (_, d) => sorted.slice(d * per, (d + 1) * per));
}

const LabelsSchema = z.object({ labels: z.array(z.object({ i: z.number().int(), label: z.enum(['love', 'open', 'skip', 'less']) })) });

function llmJudge(fallback: Judge, used: { llm: number; kw: number }): Judge {
  const cache = new Map<string, Label>();
  return async (persona: Persona, stories: Cand[]) => {
    const out = new Map<string, Label>();
    const todo = stories.filter((c) => !cache.has(`${persona.id}:${c.id}`));
    for (let i = 0; i < todo.length; i += 20) {
      const batch = todo.slice(i, i + 20);
      try {
        const system = `You are role-playing a real reader of a morning newspaper. Stay strictly in character.\nWHO YOU ARE: ${persona.name}. ${persona.bio}\nFor each headline decide your reaction: "love" (you'd read it at once and want more like it), "open" (you'd read it), "skip" (not for you), "less" (you actively don't want this kind of story).\nBe realistic: most headlines are skips. Return {"labels":[{"i":0,"label":"skip"}, ...]} with one entry per headline index.`;
        const user = wrapUntrusted('headlines', batch.map((c, k) => `${k}. ${c.headline}`).join('\n'));
        const res = await llm({ task: 'sim', system, user, schema: LabelsSchema });
        const byI = new Map(res.data.labels.map((l) => [l.i, l.label]));
        batch.forEach((c, k) => { cache.set(`${persona.id}:${c.id}`, byI.get(k) ?? 'skip'); });
        used.llm += batch.length;
      } catch (e) {
        if (!(e instanceof LLMUnavailableError)) throw e;
        const kw = await fallback(persona, batch);
        batch.forEach((c) => cache.set(`${persona.id}:${c.id}`, kw.get(c.id) ?? 'skip'));
        used.kw += batch.length;
      }
    }
    for (const c of stories) out.set(c.id, cache.get(`${persona.id}:${c.id}`) ?? 'skip');
    return out;
  };
}

export async function runLab(opts: { judge?: 'auto' | 'llm' | 'keywords'; config?: Partial<LabConfig>; save?: boolean } = {}): Promise<LabResults> {
  const config: LabConfig = { ...DEFAULT_CONFIG, ...opts.config };
  const { cands, topicVecs } = await loadPool();
  if (cands.length < config.days * config.editionSize * 3) throw new Error(`Not enough stories for a ${config.days}-day lab: ${cands.length}. Run the press first.`);
  const slices = slice(cands, config.days);
  const span = (Math.max(...cands.map((c) => c.firstSeen.getTime())) - Math.min(...cands.map((c) => c.firstSeen.getTime()))) / 3_600_000;
  log(`lab: ${cands.length} stories over ${span.toFixed(0)} h -> ${config.days} simulated days of ~${slices[0].length}`);

  const keyword = keywordJudge();
  const want = opts.judge ?? 'auto';
  const haveLlm = process.env.LLM_DISABLED !== '1' && ['GROQ_API_KEY', 'MISTRAL_API_KEY', 'OPENROUTER_API_KEY', 'GEMINI_API_KEY'].some((k) => process.env[k]);
  const used = { llm: 0, kw: 0 };
  const judge: Judge = want === 'keywords' || (want === 'auto' && !haveLlm) ? async (p, s) => { used.kw += s.length; return keyword(p, s); } : llmJudge(keyword, used);

  const personas: PersonaResult[] = [];
  for (const p of PERSONAS) {
    log(`lab: simulating ${p.name}`);
    personas.push(await simulatePersona(p, slices, topicVecs, judge, config));
  }
  const summary = summarize(personas);
  const mode: LabResults['mode'] = used.llm && used.kw ? 'mixed' : used.llm ? 'llm' : 'keywords';
  const results: LabResults = {
    generatedAt: new Date().toISOString(), mode, config,
    pool: { stories: cands.length, hoursCovered: Math.round(span), perDay: slices[0].length, note: 'Real stories from the press, sliced chronologically into simulated days. Readers are simulated; ground truth is hidden from the system.' },
    personas, summary,
  };

  const pct = (x: number) => `${(100 * x).toFixed(0)}%`;
  log(`lab (${mode} reader): relevance by day`);
  for (const pol of ['fold', 'onboarding', 'random'] as const) log(`  ${pol.padEnd(10)}`, summary.byDay[pol].map((d) => pct(d.relevance).padStart(4)).join(' '));
  log(`  ${'gap'.padEnd(10)}`, summary.gapVsOnboarding.map((d) => `${d.points >= 0 ? '+' : ''}${(100 * d.points).toFixed(0)}`.padStart(4)).join(' '), '(fold minus onboarding-only, points)');
  log(`lab: fold ${pct(summary.fold.first2)} (first 2 days) -> ${pct(summary.fold.last3)} (last 3); +${(100 * summary.baselines.foldVsOnboarding).toFixed(0)} pts vs onboarding-only, +${(100 * summary.baselines.foldVsRandom).toFixed(0)} pts vs random; diversity ${summary.diversity.fold.toFixed(2)} (floor ${summary.diversity.floor}, ${summary.diversity.ok ? 'ok' : 'BELOW FLOOR'})`);

  if (opts.save !== false) {
    const { error } = await adminClient()!.from('lab_runs').insert({ mode, results });
    if (error) throw new Error(`lab_runs: ${error.message}`);
    log('lab: saved (served by GET /api/lab)');
  }
  return results;
}
