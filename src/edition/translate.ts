// Translate a finished edition (gift papers, Urdu readers). The edition's facts are already fixed, so this is
// a pure language pass with guards: same number of strings back, figures preserved, otherwise keep the English.
import { z } from 'zod';
import { llm, LLMUnavailableError } from '../lib/llm';
import type { Edition, StorySlot } from '../types/edition';

export type Lang = 'ur';
const NAMES: Record<Lang, string> = { ur: 'Urdu' };

type Ref = { text: string; set: (v: string) => void };

function slotRefs(s: StorySlot, refs: Ref[]) {
  const add = (get: string | undefined, set: (v: string) => void) => { if (get && get.trim()) refs.push({ text: get, set }); };
  add(s.kicker, (v) => (s.kicker = v));
  add(s.headline, (v) => (s.headline = v));
  add(s.dek, (v) => (s.dek = v));
  s.body.forEach((b) => add(b.text, (v) => (b.text = v)));
  add(s.whyThis, (v) => (s.whyThis = v));
  add(s.whyItMatters, (v) => (s.whyItMatters = v));
  add(s.forYou, (v) => (s.forYou = v));
  add(s.trust.unknowns, (v) => (s.trust.unknowns = v));
  if (s.developing) { const d = s.developing; add(d.sinceLastRead, (v) => (d.sinceLastRead = v)); }
  if (s.fromFriend) add(s.fromFriend, (v) => (s.fromFriend = v));
  s.world?.forEach((w) => add(w.line, (v) => (w.line = v)));
}

export function collectRefs(e: Edition): Ref[] {
  const refs: Ref[] = [];
  const add = (text: string | undefined, set: (v: string) => void) => { if (text && text.trim()) refs.push({ text, set }); };
  add(e.editorNote, (v) => (e.editorNote = v));
  e.threeThings.forEach((t, i) => add(t, (v) => (e.threeThings[i] = v)));
  e.tomorrow.forEach((t, i) => add(t, (v) => (e.tomorrow[i] = v)));
  e.sections.forEach((s) => add(s.name, (v) => (s.name = v)));
  [e.lead, ...e.sections.flatMap((s) => s.slots), ...e.offYourBeat, ...e.briefs, ...e.everyonesFrontPage].forEach((s) => slotRefs(s, refs));
  for (const q of [...e.quiz, ...e.dailyThree]) { add(q.q, (v) => (q.q = v)); q.options.forEach((o, i) => add(o, (v) => (q.options[i] = v))); }
  if (e.weather) { const w = e.weather; add(w.summary, (v) => (w.summary = v)); }
  add(e.extras.onThisDay, (v) => (e.extras.onThisDay = v));
  return refs;
}

const digits = (s: string) => (s.match(/\d+/g) ?? []).map((d) => d.replace(/^0+(?=\d)/, ''));
// Every figure in the source must survive translation (Western or Arabic-Indic digits both count).
export function preservesFigures(src: string, out: string): boolean {
  const normalized = out.replace(/[۰-۹٠-٩]/g, (c) => String(c.charCodeAt(0) & 0xf)).replace(/,/g, '');
  return digits(src.replace(/,/g, '')).every((d) => normalized.includes(d));
}

const Out = z.object({ t: z.array(z.string()) });
const SYSTEM = (lang: Lang) => `You translate newspaper copy into ${NAMES[lang]} for a general reader (clear, standard, courteous; not literal word-for-word).
You get a JSON array of strings; return {"t":[...]} with EXACTLY the same number of strings, in the same order.
Rules: keep every number and date exactly (use Western digits 0-9); keep people, organisation and place names recognisable (transliterate into ${NAMES[lang]} script); do not add, remove or soften facts; do not add commentary; keep each string's tone. Strings starting with a quote or a dash keep it.`;

const CHUNK_STRINGS = 40;
const CHUNK_CHARS = 7000;

export async function translateEdition(edition: Edition, lang: Lang): Promise<{ edition: Edition; translated: number; total: number; failedChunks: number }> {
  const e: Edition = structuredClone(edition);
  const refs = collectRefs(e);
  const chunks: Ref[][] = [];
  let cur: Ref[] = [];
  let chars = 0;
  for (const r of refs) {
    if (cur.length && (cur.length >= CHUNK_STRINGS || chars + r.text.length > CHUNK_CHARS)) { chunks.push(cur); cur = []; chars = 0; }
    cur.push(r);
    chars += r.text.length;
  }
  if (cur.length) chunks.push(cur);

  let translated = 0;
  let failedChunks = 0;
  for (const chunk of chunks) {
    try {
      const res = await llm({ task: 'translate', system: SYSTEM(lang), user: JSON.stringify(chunk.map((r) => r.text)), schema: Out });
      if (res.data.t.length !== chunk.length) { failedChunks += 1; continue; } // misaligned: keep this chunk in English
      chunk.forEach((r, i) => {
        const out = res.data.t[i].trim();
        if (out && preservesFigures(r.text, out)) { r.set(out); translated += 1; }
      });
    } catch (err) {
      if (!(err instanceof LLMUnavailableError)) throw err;
      failedChunks += 1;
    }
  }
  return { edition: e, translated, total: refs.length, failedChunks };
}
