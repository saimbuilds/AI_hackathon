import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, diversity, keywordJudge, rng, simulatePersona, summarize } from '../src/lab/sim';
import type { Persona } from '../src/lab/personas';
import type { Cand } from '../src/edition/rank';
import { normalize } from '../src/lib/vec';

// A synthetic world with a known answer: 8 topics = 8 axes. The persona truly likes t1, t2, t3 but only STATES t1.
const DIM = 8;
const axis = (k: number, noise: () => number) => normalize(Float32Array.from({ length: DIM }, (_, i) => (i === k ? 1 : 0) + (noise() - 0.5) * 0.25));
const TOPICS = Array.from({ length: DIM }, (_, i) => `t${i}`);
const topicVecs = new Map(TOPICS.map((t, i) => [t, axis(i, () => 0.5)] as const));

const persona: Persona = {
  id: 'test', name: 'Test reader', bio: 'synthetic', hidden: ['t1', 't2', 't3'], stated: ['t1'], statedText: '', dislikes: ['t7'], keywords: ['zorble'],
};

function world(days: number, perDay: number, seed = 5): Cand[][] {
  const r = rng(seed);
  return Array.from({ length: days }, (_, d) => Array.from({ length: perDay }, (_, i) => {
    const k = Math.floor(r() * DIM);
    const relevant = persona.hidden.includes(`t${k}`);
    return {
      id: `d${d}s${i}`, headline: `${relevant ? 'zorble ' : ''}story ${d}-${i} about ${TOPICS[k]}`, dek: null, whyItMatters: null, category: null, topics: [TOPICS[k]], entities: [],
      importance: 3 + Math.floor(r() * 6), distress: 0, sourceCount: 2 + Math.floor(r() * 5), isPrimary: false, updatedAt: new Date(Date.UTC(2026, 9, 10 + d, 12)), firstSeen: new Date(Date.UTC(2026, 9, 10 + d, 6)),
      dayCount: 1, parentId: null, unknowns: null, quiz: null, world: null, imageUrl: null, embedding: axis(k, r), region: 'global', sentences: [], articles: [],
    } satisfies Cand;
  }));
}

test('rng is deterministic and uniform-ish', () => {
  const a = rng(1), b = rng(1);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
  const xs = Array.from({ length: 2000 }, rng(9));
  assert.ok(Math.abs(xs.reduce((s, x) => s + x, 0) / xs.length - 0.5) < 0.03);
});

test('diversity: one topic = 0, evenly spread = 1', () => {
  assert.equal(diversity(Array.from({ length: 10 }, () => ({ topics: ['a'] }))), 0);
  assert.ok(Math.abs(diversity(Array.from({ length: 8 }, (_, i) => ({ topics: [`t${i}`] }))) - 1) < 1e-9);
  assert.equal(diversity([{ topics: ['a'] }]), 0);
});

test('keyword reader is deterministic, independent of embeddings, and sensible', async () => {
  const [day] = world(1, 60);
  const j = keywordJudge(7, 0);
  const a = await j(persona, day), b = await j(persona, day);
  assert.deepEqual([...a], [...b]);
  for (const c of day) assert.equal(a.get(c.id), c.headline.includes('zorble') ? 'open' : c.topics.includes('t7') ? (a.get(c.id) === 'less' ? 'less' : 'skip') : 'skip');
});

test('the system learns: fold beats onboarding-only and random, without collapsing into a bubble', async () => {
  const slices = world(7, 140);
  const res = await simulatePersona(persona, slices, topicVecs, keywordJudge(7, 0.05), { ...DEFAULT_CONFIG, days: 7 });
  const s = summarize([res]);
  const f = s.byDay.fold.map((d) => d.relevance.toFixed(2)).join(' ');
  const o = s.byDay.onboarding.map((d) => d.relevance.toFixed(2)).join(' ');
  const r = s.byDay.random.map((d) => d.relevance.toFixed(2)).join(' ');
  console.log(`  fold ${f}\n  onb  ${o}\n  rand ${r}\n  diversity fold ${s.diversity.fold.toFixed(2)} floor ${s.diversity.floor}`);
  assert.equal(res.policies.fold.length, 7);
  assert.ok(s.baselines.foldVsRandom > 0.25, `fold should clearly beat random: ${s.baselines.foldVsRandom}`);
  assert.ok(s.baselines.foldVsOnboarding > 0.08, `learning should beat onboarding-only: ${s.baselines.foldVsOnboarding}`);
  assert.ok(s.fold.liftPoints > 0.05, `relevance should climb over the week: ${s.fold.liftPoints}`);
  assert.ok(s.diversity.ok, `diversity ${s.diversity.fold} fell below the floor`);
});

test('no story is shown twice to the same reader under any policy', async () => {
  const res = await simulatePersona(persona, world(5, 80), topicVecs, keywordJudge(), { ...DEFAULT_CONFIG, days: 5 });
  for (const p of ['fold', 'onboarding', 'random'] as const) {
    const ids = res.policies[p].flatMap((d) => d.stories.map((s) => s.id));
    assert.equal(new Set(ids).size, ids.length, p);
  }
});

test('same seed gives the same result', async () => {
  const run = () => simulatePersona(persona, world(4, 60), topicVecs, keywordJudge(), { ...DEFAULT_CONFIG, days: 4 });
  assert.deepEqual((await run()).policies.fold.map((d) => d.relevance), (await run()).policies.fold.map((d) => d.relevance));
});
