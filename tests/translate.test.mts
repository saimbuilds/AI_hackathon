import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

process.env.GROQ_API_KEY = 'x';
delete process.env.MISTRAL_API_KEY;
delete process.env.OPENROUTER_API_KEY;
delete process.env.GEMINI_API_KEY;
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.LLM_DISABLED;

const { collectRefs, preservesFigures, translateEdition } = await import('../src/edition/translate');
const { EditionSchema } = await import('../src/types/edition');
const fixture = () => EditionSchema.parse(JSON.parse(readFileSync('fixtures/edition.sample.json', 'utf8')));

let batches: string[][] = [];
// A fake Urdu translator: prefixes every string with a marker, keeps the figures.
const stub = (mode: 'ok' | 'misaligned' | 'drop-figures' | 'down') => {
  globalThis.fetch = (async (_u: string, init: RequestInit) => {
    if (mode === 'down') return new Response('x', { status: 503 });
    const body = JSON.parse(String(init.body));
    const strings = JSON.parse(body.messages[1].content) as string[];
    batches.push(strings);
    let out = strings.map((s) => `اردو: ${s}`);
    if (mode === 'misaligned') out = out.slice(1);
    if (mode === 'drop-figures') out = strings.map((s) => `اردو: ${s.replace(/\d+/g, 'کئی')}`);
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ t: out }) }, finish_reason: 'stop' }], usage: { prompt_tokens: 1, completion_tokens: 1 } }), { status: 200 });
  }) as typeof fetch;
};
beforeEach(() => { batches = []; });

test('preservesFigures accepts Arabic-Indic digits and commas, rejects lost or changed figures', () => {
  assert.ok(preservesFigures('Brazil cleared 3,335 square kilometers', 'برازیل نے 3335 مربع کلومیٹر'));
  assert.ok(preservesFigures('cleared 3,335 km', 'صاف ۳۳۳۵ کلومیٹر'));
  assert.ok(!preservesFigures('cleared 3,335 km', 'کئی کلومیٹر'));
  assert.ok(!preservesFigures('cleared 3,335 km', '3,999 کلومیٹر'));
  assert.ok(preservesFigures('no figures', 'کوئی ہندسہ نہیں'));
});

test('collectRefs reaches every reader-facing string and none of the URLs or ids', () => {
  const refs = collectRefs(fixture()).map((r) => r.text);
  assert.ok(refs.some((t) => t.startsWith('Good morning, Saim')));
  assert.ok(refs.some((t) => t.includes('Trump waives new Russia sanctions')));
  assert.ok(refs.some((t) => t === 'Pakistan & the Gulf')); // section names
  assert.ok(refs.some((t) => t.includes('Whose energy-revenue sanctions'))); // quiz
  assert.ok(!refs.some((t) => t.startsWith('http')));
  assert.ok(refs.length > 100);
});

test('translateEdition rewrites the strings, keeps the structure valid, and never touches sources or ids', async () => {
  stub('ok');
  const before = fixture();
  const { edition, translated, total, failedChunks } = await translateEdition(before, 'ur');
  assert.equal(failedChunks, 0);
  assert.equal(translated, total);
  assert.ok(edition.lead.headline.startsWith('اردو: '));
  assert.ok(edition.sections[0].name.startsWith('اردو: '));
  assert.deepEqual(edition.lead.sources, before.lead.sources);
  assert.equal(edition.lead.storyId, before.lead.storyId);
  assert.equal(edition.lead.body.length, before.lead.body.length);
  assert.ok(EditionSchema.safeParse(edition).success);
  assert.ok(before.lead.headline.startsWith('Trump'), 'input edition is not mutated');
  assert.ok(batches.length >= 3, 'work is split into chunks');
});

test('a chunk that comes back misaligned stays in English', async () => {
  stub('misaligned');
  const { edition, translated, failedChunks } = await translateEdition(fixture(), 'ur');
  assert.ok(failedChunks > 0);
  assert.equal(translated, 0);
  assert.ok(edition.lead.headline.startsWith('Trump'));
});

test('a translation that loses a figure is rejected string by string', async () => {
  stub('drop-figures');
  const { edition, translated, total } = await translateEdition(fixture(), 'ur');
  assert.ok(translated > 0 && translated < total);
  const withDigits = edition.threeThings.filter((t) => /\d/.test(t));
  assert.ok(withDigits.length > 0 && withDigits.every((t) => !t.startsWith('اردو')), 'strings with figures stay in English');
});

test('with every model down the paper stays English and nothing throws', async () => {
  stub('down');
  const { edition, translated } = await translateEdition(fixture(), 'ur');
  assert.equal(translated, 0);
  assert.ok(edition.editorNote.startsWith('Good morning'));
});
