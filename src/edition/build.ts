// Build one reader's edition: candidates -> score -> MMR -> explore -> everyone's front page ->
// editor (one LLM call, optional) -> validated immutable snapshot. With every LLM down it still
// prints, from ranking + stored briefs + template copy.
import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { adminClient } from '../lib/supabase';
import { BRAND } from '../lib/brand';
import { dot } from '../lib/vec';
import { matchWatches, takeUpdatesForEdition } from '../follow/watch';
import { EditionSchema, type Edition, type StorySlot } from '../types/edition';
import type { BuildProgress } from '../types/events';
import { loadCandidates, loadProfile, readerModel, type Profile } from './candidates';
import { exploreTopics, mmr, score, type Cand, type ReaderModel, type Scored } from './rank';
import { FALLBACK_SECTION, SLOT_COUNTS, pickQuiz, pickTomorrow, sectionOf, templateNote, templateThreeThings, templateWhy, toSlot } from './assemble';
import { runEditor, type Entry, type EditorPlan } from './editor';
import { loadExtras } from './extras';
import { translateEdition } from './translate';

export class BuildError extends Error {
  constructor(public status: number, message: string, public retryable = false) { super(message); }
}

export type BuildOptions = { historical?: boolean; rebuild?: boolean; onProgress?: (p: BuildProgress) => void; rand?: () => number; now?: number };
export type BuildResult = { editionId: string; number: number; fallback: boolean; reused: boolean; ms: number };

export const MAX_EDITIONS_PER_DAY = 3;

export const localDate = (tz: string, now = Date.now()): string => {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(now); } catch { return new Date(now).toISOString().slice(0, 10); }
};

const log2 = (n: number) => Math.log2(Math.max(1, n));

// 1-2 shared top stories shown to every reader (common ground), chosen without regard to taste.
export function pickEveryones(cands: Cand[], n: number): Cand[] {
  const ranked = [...cands].filter((c) => c.sourceCount >= 2 && c.category !== 'opinion').sort((a, b) => (0.6 * b.importance) / 10 + 0.4 * Math.min(1, log2(b.sourceCount) / 4) - ((0.6 * a.importance) / 10 + 0.4 * Math.min(1, log2(a.sourceCount) / 4)));
  const out: Cand[] = [];
  for (const c of ranked) {
    if (out.some((o) => dot(o.embedding, c.embedding) > 0.9)) continue;
    out.push(c);
    if (out.length === n) break;
  }
  return out;
}

// Today's edition for this reader, if one exists (lets the API skip the queue for a reprint of the same paper).
export async function existingToday(userId: string, now = Date.now()): Promise<{ editionId: string; number: number } | null> {
  const db = adminClient();
  if (!db) return null;
  const profile = await loadProfile(db, userId);
  if (!profile) return null;
  const { data } = await db.from('editions').select('id,number').eq('user_id', userId).eq('date', localDate(profile.tz, now)).order('number', { ascending: false }).limit(1);
  return data?.[0] ? { editionId: data[0].id, number: data[0].number } : null;
}

export async function buildEdition(userId: string, opts: BuildOptions = {}): Promise<BuildResult> {
  const t0 = Date.now();
  const now = opts.now ?? t0;
  const emit = (p: BuildProgress) => opts.onProgress?.(p);
  const db = adminClient();
  if (!db) throw new BuildError(503, 'Server not configured');

  const profile = await loadProfile(db, userId);
  if (!profile) throw new BuildError(404, 'No profile for this user');
  const date = localDate(profile.tz, now);

  // One paper per day unless the reader asks to reprint; reprints are capped.
  const { data: today } = await db.from('editions').select('id,number').eq('user_id', userId).eq('date', date).order('number', { ascending: false });
  if (today?.length && !opts.rebuild) return { editionId: today[0].id, number: today[0].number, fallback: false, reused: true, ms: Date.now() - t0 };
  if ((today?.length ?? 0) >= MAX_EDITIONS_PER_DAY) throw new BuildError(429, `You've already printed ${MAX_EDITIONS_PER_DAY} editions today. Tomorrow's paper arrives in the morning.`);

  // Printing-press narration: real numbers from the real pipeline.
  const since = new Date(now - 36 * 3_600_000).toISOString();
  const head = (table: string) => db.from(table).select('id', { count: 'exact', head: true });
  const [articlesQ, sourcesQ, storiesQ] = await Promise.all([head('articles').gte('created_at', since), head('sources').eq('status', 'active'), head('stories').gte('updated_at', since)]);
  const articles = articlesQ.count ?? 0, sources = sourcesQ.count ?? 0, stories = storiesQ.count ?? 0;
  emit({ step: 'reading', articles, sources });
  emit({ step: 'clustering', stories });

  const reader = readerModel(profile);
  const extrasP = loadExtras(profile, date, { weather: !opts.historical });
  // "Since you asked": check this reader's follows against new stories while the paper is picked (bounded wait).
  const isGift = !!(profile.extras as { gift?: unknown }).gift;
  const followsP = isGift || opts.historical ? Promise.resolve(null) : Promise.race([
    matchWatches(db, { userId, max: 5 }).catch(() => null),
    new Promise<null>((r) => setTimeout(() => r(null), 8_000)),
  ]);
  const cands = await loadCandidates(db, userId, profile, reader, now);
  if (!cands.length) throw new BuildError(503, "The press hasn't printed any stories yet. Try again in a few minutes.", true);

  const size = profile.large_print ? SLOT_COUNTS.espresso : (SLOT_COUNTS[profile.size] ?? SLOT_COUNTS.standard); // large print = fewer, bigger stories
  const everyone = pickEveryones(cands, size.everyone);
  const everyoneIds = new Set(everyone.map((c) => c.id));
  const pool = cands.filter((c) => !everyoneIds.has(c.id));

  const { data: co } = await db.rpc('coread_boost', { p_user: userId, p_story_ids: pool.map((c) => c.id) });
  const coRead = new Map(((co ?? []) as { story_id: string; score: number }[]).map((r) => [r.story_id, r.score]));
  const scored = score(pool, reader, now, coRead);
  const nMain = 1 + size.sections + size.briefs;
  const picks = mmr(scored, nMain);
  // A friend's pick is guaranteed a place: it replaces the lowest-ranked pick if the ranking left it out.
  for (const f of scored.filter((s) => s.cand.friend).slice(0, 2)) {
    if (!picks.some((p) => p.cand.id === f.cand.id)) picks.splice(Math.max(1, picks.length - 1), 1, f);
  }
  const pickedIds = new Set(picks.map((p) => p.cand.id));
  const offBeat = exploreTopics(scored.filter((s) => !pickedIds.has(s.cand.id)), reader, size.offBeat, opts.rand ?? Math.random);
  if (!picks.length) throw new BuildError(503, 'Not enough stories to print a paper yet.', true);
  emit({ step: 'picking', picked: picks.length + offBeat.length + everyone.length, forName: profile.name ?? 'you' });

  // Editor sees the lead, the main stories and the off-beat picks (briefs are template-framed).
  const briefCount = Math.min(size.briefs, Math.max(0, picks.length - 3));
  const mainPicks = picks.slice(0, picks.length - briefCount);
  const briefPicks = picks.slice(picks.length - briefCount);
  const entries: Entry[] = [
    ...mainPicks.map((p, i): Entry => ({ key: `A${i + 1}`, cand: p.cand, kind: i === 0 ? 'lead' : 'pick' })),
    ...offBeat.map((p, i): Entry => ({ key: `O${i + 1}`, cand: p.cand, kind: 'offBeat' })),
  ];

  emit({ step: 'layout' });
  emit({ step: 'note' });
  const editor = await runEditor(profile, entries);
  const plan: EditorPlan | null = editor.plan;

  const edition = await assemble({ db, userId, profile, reader, date, entries, briefPicks, everyone, plan, now, extrasP });
  const fallback = !plan;

  // Persist the immutable snapshot.
  const { data: last } = await db.from('editions').select('number').eq('user_id', userId).order('number', { ascending: false }).limit(1);
  const number = (last?.[0]?.number ?? 0) + 1;
  const editionId = randomUUID();
  const giftMeta = (profile.extras as { gift?: { fromName: string; relation: string } }).gift;
  await followsP;
  const updates = isGift || opts.historical ? [] : await takeUpdatesForEdition(db, userId).catch(() => []);
  let built: Edition = EditionSchema.parse({
    ...edition, id: editionId, number, meta: { ...edition.meta, fallback },
    ...(updates.length ? { updates } : {}),
    language: 'en', largePrint: profile.large_print,
    ...(giftMeta ? { gift: { forName: profile.name ?? 'you', fromName: giftMeta.fromName, relation: giftMeta.relation, language: 'en', largePrint: profile.large_print } } : {}), // 'ur' only once the translation really succeeded
  });
  let translation: { translated: number; total: number; failedChunks: number } | null = null;
  if (profile.language === 'ur') {
    const t = await translateEdition(built, 'ur');
    translation = { translated: t.translated, total: t.total, failedChunks: t.failedChunks };
    // Honest labelling: only call it Urdu if most of the paper actually translated; otherwise it stays English.
    if (t.translated / Math.max(1, t.total) >= 0.8) built = EditionSchema.parse({ ...t.edition, language: 'ur', ...(giftMeta ? { gift: { ...t.edition.gift!, language: 'ur' } } : {}) });
  }
  const payload: Edition = built;

  const stats = {
    translation, candidates: cands.length, picks: picks.length, offBeat: offBeat.length, fallback, ms: Date.now() - t0,
    llm: 'model' in editor ? { model: editor.model, tokensIn: editor.tokensIn, tokensOut: editor.tokensOut, costUsd: editor.costUsd, attempts: editor.attempts } : { attempts: editor.attempts, reason: editor.reason },
  };
  const { error } = await db.from('editions').insert({ id: editionId, user_id: userId, date, number, payload, stats });
  if (error) throw new BuildError(500, `Could not save the edition: ${error.message}`);

  const slots: { slot: StorySlot; kind: string }[] = [
    { slot: payload.lead, kind: 'lead' },
    ...payload.sections.flatMap((s) => s.slots.map((slot) => ({ slot, kind: 'section' }))),
    ...payload.offYourBeat.map((slot) => ({ slot, kind: 'offBeat' })),
    ...payload.briefs.map((slot) => ({ slot, kind: 'brief' })),
    ...payload.everyonesFrontPage.map((slot) => ({ slot, kind: 'everyone' })),
  ];
  await db.from('edition_stories').insert(slots.map(({ slot, kind }, position) => ({ edition_id: editionId, user_id: userId, story_id: slot.storyId, slot: kind, position })));

  // Friends' picks that made the paper are delivered: stop offering them.
  const shownIds = slots.map((x) => x.slot.storyId);
  const { data: myClaims } = await db.from('share_claims').select('share_id').eq('recipient_id', userId).is('consumed_at', null);
  if (myClaims?.length) {
    const { data: delivered } = await db.from('shares').select('id').in('id', myClaims.map((c) => c.share_id)).in('story_id', shownIds);
    if (delivered?.length) await db.from('share_claims').update({ consumed_at: new Date().toISOString() }).eq('recipient_id', userId).in('share_id', delivered.map((d) => d.id));
  }

  emit({ step: 'done', editionId });
  return { editionId, number, fallback, reused: false, ms: Date.now() - t0 };
}

async function assemble(a: {
  db: SupabaseClient; userId: string; profile: Profile; reader: ReaderModel; date: string; entries: Entry[]; briefPicks: Scored[]; everyone: Cand[]; plan: EditorPlan | null; now: number; extrasP: ReturnType<typeof loadExtras>;
}): Promise<Omit<Edition, 'id' | 'number' | 'language' | 'largePrint' | 'gift'> & { id: string; number: number }> {
  const { db, profile, reader, entries, briefPicks, everyone, plan } = a;
  const byKey = new Map(entries.map((e) => [e.key, e]));
  const main = entries.filter((e) => e.kind !== 'offBeat');
  const leadKey = plan?.lead && byKey.get(plan.lead)?.kind !== 'offBeat' ? plan.lead : main[0].key;

  // Sections: the editor's grouping when valid, else by topic. Anything unplaced is grouped by topic.
  const counts = profile.large_print ? SLOT_COUNTS.espresso : (SLOT_COUNTS[profile.size] ?? SLOT_COUNTS.standard);
  const rest = main.filter((e) => e.key !== leadKey);
  const placed = new Set<string>();
  const sections: { name: string; keys: string[] }[] = [];
  for (const s of plan?.sections ?? []) {
    const keys = s.keys.filter((k) => rest.some((e) => e.key === k) && !placed.has(k));
    keys.forEach((k) => placed.add(k));
    if (keys.length) sections.push({ name: s.name, keys });
  }
  const orderOf = new Map(entries.map((e, i) => [e.key, i]));
  for (const e of rest.filter((e) => !placed.has(e.key))) {
    const name = sectionOf(e.cand, reader);
    const hit = sections.find((s) => s.name === name);
    if (hit) hit.keys.push(e.key); else sections.push({ name, keys: [e.key] });
  }
  // Order sections by their best-ranked story; overflow beyond the section budget becomes briefs.
  sections.forEach((s) => s.keys.sort((x, y) => orderOf.get(x)! - orderOf.get(y)!));
  sections.sort((x, y) => orderOf.get(x.keys[0])! - orderOf.get(y.keys[0])!);
  const kept = sections.slice(0, counts.maxSections);
  const overflow = sections.slice(counts.maxSections).flatMap((s) => s.keys);

  const parentIds = [...new Set([...entries.map((e) => e.cand), ...briefPicks.map((b) => b.cand), ...everyone].map((c) => c.parentId).filter((x): x is string => !!x))];
  const parents = new Map<string, string>();
  if (parentIds.length) {
    const { data } = await db.from('stories').select('id,headline').in('id', parentIds);
    for (const p of data ?? []) if (p.headline) parents.set(p.id, p.headline);
  }

  const slotFor = (e: Entry, size: StorySlot['size'], kind: 'lead' | 'pick' | 'offBeat'): StorySlot => {
    const note = plan?.notes.get(e.key);
    const cat = e.cand.category ? e.cand.category.charAt(0).toUpperCase() + e.cand.category.slice(1) : 'News';
    return toSlot(e.cand, {
      size, whyThis: note?.whyThis ?? templateWhy(e.cand, reader, kind), ...(note?.forYou ? { forYou: note.forYou } : {}),
      ...(kind === 'offBeat' ? { kicker: `Off Your Beat · ${cat}` } : {}),
    }, e.cand.parentId ? parents.get(e.cand.parentId) : undefined);
  };

  const lead = slotFor(byKey.get(leadKey)!, 'lead', 'lead');
  const sectioned = kept.flatMap((s) => s.keys);
  const majorN = Math.max(1, Math.ceil(sectioned.length * 0.3));
  const sectionSlots = kept.map((s) => ({
    name: s.name,
    slots: s.keys.map((k) => slotFor(byKey.get(k)!, sectioned.indexOf(k) < majorN ? 'major' : 'minor', 'pick')),
  }));
  const briefs: StorySlot[] = [
    ...overflow.map((k) => toSlot(byKey.get(k)!.cand, { size: 'brief', whyThis: plan?.notes.get(k)?.whyThis ?? templateWhy(byKey.get(k)!.cand, reader, 'pick') }, undefined)),
    ...briefPicks.map((b) => toSlot(b.cand, { size: 'brief', whyThis: templateWhy(b.cand, reader, 'pick') }, b.cand.parentId ? parents.get(b.cand.parentId) : undefined)),
  ];
  const offBeat = entries.filter((e) => e.kind === 'offBeat').map((e, i) => slotFor(e, i === 0 ? 'major' : 'minor', 'offBeat'));
  const everyonesFrontPage = everyone.map((c, i) => toSlot(c, {
    size: i === 0 ? 'major' : 'minor', whyThis: templateWhy(c, reader, 'everyone'),
    kicker: `Everyone's Front Page · ${c.category ? c.category.charAt(0).toUpperCase() + c.category.slice(1) : 'News'}`,
  }, c.parentId ? parents.get(c.parentId) : undefined));

  const ordered: Cand[] = [byKey.get(leadKey)!.cand, ...sectioned.map((k) => byKey.get(k)!.cand), ...entries.filter((e) => e.kind === 'offBeat').map((e) => e.cand), ...briefPicks.map((b) => b.cand)];

  const { weather, extras } = await a.extrasP;
  const { data: daily } = await db.from('daily_three').select('questions').lte('date', a.date).order('date', { ascending: false }).limit(1).maybeSingle();
  const { data: run } = await db.from('press_runs').select('stats').not('finished_at', 'is', null).order('started_at', { ascending: false }).limit(1).maybeSingle();
  let grounding = (run?.stats as { enrich?: { grounding?: number | null } } | null)?.enrich?.grounding;
  if (typeof grounding !== 'number') {
    // Enrichment can run without a press run (backfills, re-enrich): average what was written in the last 2 days.
    const { data: g } = await db.from('stories').select('grounding').not('grounding', 'is', null).gte('enriched_at', new Date(a.now - 48 * 3_600_000).toISOString()).limit(2000);
    if (g?.length) grounding = Math.round((g.reduce((t, r) => t + Math.min(1, Number(r.grounding)), 0) / g.length) * 1000) / 1000;
  }

  return {
    id: randomUUID(), userId: a.userId, date: a.date, number: 1,
    paperName: profile.paper_name ?? BRAND.defaultPaperName(profile.name), city: profile.city ?? '', tone: profile.tone,
    ...(weather ? { weather } : {}),
    editorNote: plan?.editorNote ?? templateNote(profile.name, byKey.get(leadKey)!.cand, kept.map((s) => s.name), ordered.length + everyone.length),
    lead, sections: sectionSlots, offYourBeat: offBeat, briefs,
    threeThings: plan?.threeThings.length === 3 ? plan.threeThings : templateThreeThings(ordered),
    quiz: pickQuiz(ordered), dailyThree: (daily?.questions as Edition['dailyThree'] | undefined) ?? [],
    tomorrow: pickTomorrow(ordered), everyonesFrontPage, calm: profile.calm, extras,
    meta: { builtAt: new Date(a.now).toISOString(), fallback: !plan, ...(typeof grounding === 'number' ? { grounding } : {}) },
  };
}

export { FALLBACK_SECTION };
