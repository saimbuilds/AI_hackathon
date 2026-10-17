import { test } from 'node:test';
import assert from 'node:assert/strict';

delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
process.env.LLM_DISABLED = '1'; // force the heuristic path
const { heuristicParse, parseOnboarding, ParsedProfileSchema } = await import('../src/lib/onboarding');

test('heuristic separates interests from negatives and maps to the fixed topics', () => {
  const p = heuristicParse("CS grad, into AI startups, F1 and Pakistan's economy. Skip celebrity gossip.");
  assert.ok(p.topics.includes('ai'));
  assert.ok(p.topics.includes('f1'));
  assert.ok(p.topics.includes('pakistan-economy'));
  assert.ok(p.negativeTopics.includes('celebrity'));
  assert.ok(!p.topics.includes('celebrity'));
  assert.ok(p.negatives.length > 0);
});

test('heuristic output always satisfies the schema', () => {
  for (const t of ['', 'hello', 'I like cricket, football, crypto & space; avoid politics', 'x'.repeat(700)]) {
    assert.ok(ParsedProfileSchema.safeParse(heuristicParse(t)).success, t.slice(0, 30));
  }
});

test('parseOnboarding degrades to the heuristic when LLMs are disabled', async () => {
  const r = await parseOnboarding('I follow cricket and Formula 1');
  assert.equal(r.source, 'heuristic');
  assert.ok(r.parsed.topics.includes('cricket'));
});
