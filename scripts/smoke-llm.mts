import { parseOnboarding } from '../src/lib/onboarding';
import { llm } from '../src/lib/llm';
import { z } from 'zod';
const t = Date.now();
const r = await parseOnboarding("CS grad in Islamabad, into AI startups, F1 and Pakistan's economy. Skip celebrity gossip.");
console.log(`parse via ${r.source} in ${Date.now() - t}ms:`, JSON.stringify(r.parsed));
for (const task of ['editor', 'enrich', 'factcheck', 'translate', 'memo'] as const) {
  const t0 = Date.now();
  try {
    const x = await llm({ task, system: 'Reply with JSON {"ok":true,"word":"<one short English word>"}', user: 'ping', schema: z.object({ ok: z.boolean(), word: z.string() }), maxTokens: 200 });
    console.log(`${task.padEnd(9)} -> ${x.model} in ${Date.now() - t0}ms, ${x.tokensIn}+${x.tokensOut} tokens, $${x.costUsd.toFixed(5)}, attempts: ${x.attempts.map((a) => `${a.model}:${a.outcome}${a.detail ? `(${a.detail.slice(0, 60)})` : ''}`).join(' > ')}`);
  } catch (e) { console.log(`${task.padEnd(9)} FAILED: ${(e as Error).message.slice(0, 300)}`); }
}
