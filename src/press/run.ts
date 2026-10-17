// The press: ingest -> dedupe -> fingerprint -> cluster -> thread -> importance -> extract.
// (Write-once enrichment + fact-check live in enrich.ts and run after this.)
// Local: `pnpm press` (flags: --dry  --sources=N  --no-extract  --extract-max=N)
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import pLimit from 'p-limit';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { adminClient } from '../lib/supabase';
import { SOURCE_KINDS } from '../lib/taxonomy';
import { embed, fromPg, toPg } from './embed';
import { fetchAll, type FetchResult, type SourceRow } from './fetch';
import { assignArticles, findParent, provisionalImportance, type EmbeddedArticle, type StoryState } from './cluster';
import { titleKey, type Article } from './normalize';
import { extractArticle } from './extract';

const CatalogSchema = z.object({
  sources: z.array(z.object({
    name: z.string(), feedUrl: z.url(), siteUrl: z.string().optional(), kind: z.enum(SOURCE_KINDS), category: z.string(),
    region: z.string(), language: z.string(), pack: z.string(),
  })),
});

export type PressOptions = { dry?: boolean; sources?: number; extract?: boolean; extractMax?: number };
export type PressStats = Record<string, number | string>;

const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);
const chunk = <T,>(xs: T[], n: number): T[][] => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, (i + 1) * n));

async function selectAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

function must(res: { error: { message: string } | null }, what: string) {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
}

export async function runPress(opts: PressOptions = {}): Promise<PressStats> {
  const t0 = Date.now();
  const db: SupabaseClient | null = opts.dry ? null : adminClient();
  if (!opts.dry && !db) throw new Error('Supabase env missing: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or pass --dry)');
  const errors: string[] = [];
  const stats: PressStats = {};

  let runId: string | null = null;
  if (db) {
    const { data, error } = await db.from('press_runs').insert({}).select('id').single();
    if (error) throw new Error(`press_runs: ${error.message}`);
    runId = data.id;
    stats.runId = data.id;
  }

  // 1. catalog -> sources table
  const catalog = CatalogSchema.parse(JSON.parse(readFileSync('worker/sources.json', 'utf8')));
  let catalogSources = catalog.sources;
  if (opts.sources) catalogSources = catalogSources.filter((_, i) => i % Math.ceil(catalogSources.length / opts.sources!) === 0).slice(0, opts.sources);
  let sources: SourceRow[];
  if (db) {
    for (const part of chunk(catalogSources, 200)) {
      must(await db.from('sources').upsert(part.map((s) => ({ name: s.name, feed_url: s.feedUrl, site_url: s.siteUrl ?? null, kind: s.kind, category: s.category, region: s.region, language: s.language })), { onConflict: 'feed_url', ignoreDuplicates: false }), 'sources upsert');
    }
    const urls = new Set(catalogSources.map((s) => s.feedUrl));
    const all = await selectAll<SourceRow & { status: string }>((f, t) => db.from('sources').select('id,name,feed_url,kind,language,status').neq('status', 'dead').range(f, t));
    sources = all.filter((s) => urls.has(s.feed_url));
  } else {
    sources = catalogSources.map((s) => ({ id: randomUUID(), name: s.name, feed_url: s.feedUrl, kind: s.kind, language: s.language }));
  }
  log(`sources: ${sources.length}`);

  // 2. fetch
  const results: FetchResult[] = await fetchAll(sources);
  const ok = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  failed.forEach((r) => errors.push(`${r.source.name}: ${r.error}`));
  stats.sourcesOk = ok.length;
  stats.sourcesFailed = failed.length;
  log(`fetched: ${ok.length} ok, ${failed.length} failed, ${ok.reduce((n, r) => n + r.articles.length, 0)} items`);
  if (db) {
    const meta = (r: FetchResult) => ({ feed_url: r.source.feed_url, name: r.source.name, kind: r.source.kind, language: r.source.language });
    const now = new Date().toISOString();
    for (const part of chunk(ok, 200)) must(await db.from('sources').upsert(part.map((r) => ({ ...meta(r), status: 'active', last_ok_at: now, last_error: null })), { onConflict: 'feed_url' }), 'source health');
    for (const part of chunk(failed, 200)) must(await db.from('sources').upsert(part.map((r) => ({ ...meta(r), status: 'failing', last_error: r.error ?? null })), { onConflict: 'feed_url' }), 'source health');
  }

  // 3. normalize / dedupe (URL against DB, titles within the batch)
  const existing = new Set<string>();
  const storyOutlets = new Map<string, { domains: Set<string>; n: number; recent: number }>();
  if (db) {
    const since = new Date(Date.now() - 72 * 3_600_000).toISOString();
    const rows = await selectAll<{ url: string; story_id: string | null; published_at: string | null }>((f, t) => db.from('articles').select('url,story_id,published_at').gte('created_at', since).range(f, t));
    for (const r of rows) {
      existing.add(r.url);
      if (!r.story_id) continue;
      const e = storyOutlets.get(r.story_id) ?? { domains: new Set<string>(), n: 0, recent: 0 };
      e.domains.add(new URL(r.url).hostname.replace(/^www\./, ''));
      e.n += 1;
      if (r.published_at && Date.now() - Date.parse(r.published_at) < 6 * 3_600_000) e.recent += 1;
      storyOutlets.set(r.story_id, e);
    }
  }
  const seenTitles = new Set<string>();
  const fresh: Article[] = [];
  for (const a of ok.flatMap((r) => r.articles)) {
    const key = titleKey(a.title);
    if (existing.has(a.url) || seenTitles.has(key)) continue;
    seenTitles.add(key);
    existing.add(a.url);
    fresh.push(a);
  }
  stats.newArticles = fresh.length;
  log(`new articles after dedupe: ${fresh.length}`);

  // 4. fingerprint (title + excerpt; multilingual so Urdu/Arabic/English cluster together)
  const t1 = Date.now();
  const vectors = await embed(fresh.map((a) => `${a.title}. ${a.excerpt.slice(0, 400)}`));
  const embedded: EmbeddedArticle[] = fresh.map((a, i) => ({ ...a, id: randomUUID(), embedding: vectors[i] }));
  log(`embedded ${embedded.length} in ${((Date.now() - t1) / 1000).toFixed(1)}s`);

  // 5. cluster against stories from the last 48h
  const stories = new Map<string, StoryState>();
  if (db) {
    const since = new Date(Date.now() - 48 * 3_600_000).toISOString();
    const rows = await selectAll<{ id: string; embedding: string | null; is_primary: boolean; first_seen_at: string; updated_at: string; headline: string | null; image_url: string | null }>((f, t) =>
      db.from('stories').select('id,embedding,is_primary,first_seen_at,updated_at,headline,image_url').gte('updated_at', since).not('embedding', 'is', null).range(f, t));
    for (const r of rows) {
      const o = storyOutlets.get(r.id);
      stories.set(r.id, { id: r.id, centroid: fromPg(r.embedding!), n: Math.max(1, o?.n ?? 1), outlets: new Set(o?.domains), primary: r.is_primary, firstSeen: new Date(r.first_seen_at), updatedAt: new Date(r.updated_at), headline: r.headline ?? '', imageUrl: r.image_url ?? undefined, recent: o?.recent ?? 0, isNew: false, dirty: false });
    }
  }
  log(`clustering ${embedded.length} articles against ${stories.size} open stories`);
  const assignments = assignArticles(stories, embedded, randomUUID);
  const touched = [...stories.values()].filter((s) => s.dirty);
  const created = touched.filter((s) => s.isNew);
  stats.storiesTouched = touched.length;
  stats.storiesCreated = created.length;
  stats.storiesOpen = stories.size;
  log(`stories: ${created.length} new, ${touched.length - created.length} grown, ${stories.size} open`);

  // 6. thread new stories onto 2-7 day old ones ("Developing · Day N")
  const parents = new Map<string, { parentId: string; dayCount: number }>();
  if (db && created.length) {
    const from = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const to = new Date(Date.now() - 48 * 3_600_000).toISOString();
    const older = (await selectAll<{ id: string; embedding: string | null; day_count: number }>((f, t) =>
      db.from('stories').select('id,embedding,day_count').gte('updated_at', from).lt('updated_at', to).not('embedding', 'is', null).range(f, t)))
      .map((o) => ({ id: o.id, centroid: fromPg(o.embedding!), dayCount: o.day_count }));
    for (const s of created) {
      const p = findParent(s.centroid, older);
      if (p) parents.set(s.id, p);
    }
  }
  stats.threaded = parents.size;

  // 7. importance + write
  const importance = (s: StoryState) => provisionalImportance(s.outlets.size, s.primary, s.recent, s.n);
  if (db) {
    for (const part of chunk(created, 100)) {
      must(await db.from('stories').insert(part.map((s) => ({
        id: s.id, headline: s.headline, embedding: toPg(s.centroid), source_count: s.outlets.size, is_primary: s.primary, importance: importance(s),
        first_seen_at: s.firstSeen.toISOString(), updated_at: s.updatedAt.toISOString(), image_url: s.imageUrl ?? null,
        parent_story_id: parents.get(s.id)?.parentId ?? null, day_count: parents.get(s.id)?.dayCount ?? 1,
      }))), 'stories insert');
    }
    const byId = new Map(assignments.map((a) => [a.article.id, a.storyId]));
    for (const part of chunk(embedded, 100)) {
      must(await db.from('articles').upsert(part.map((a) => ({
        id: a.id, source_id: a.sourceId, story_id: byId.get(a.id), url: a.url, title: a.title, excerpt: a.excerpt || null, image_url: a.imageUrl ?? null,
        language: a.language, published_at: a.publishedAt.toISOString(), embedding: toPg(a.embedding),
      })), { onConflict: 'url', ignoreDuplicates: true }), 'articles insert');
    }
    for (const part of chunk(touched.filter((s) => !s.isNew), 100)) {
      must(await db.from('stories').upsert(part.map((s) => ({
        id: s.id, embedding: toPg(s.centroid), source_count: s.outlets.size, is_primary: s.primary, importance: importance(s), updated_at: s.updatedAt.toISOString(), image_url: s.imageUrl ?? null,
      })), { onConflict: 'id' }), 'stories update');
    }
  }

  // 8. extract full text for the stories that matter (top by importance), 2 articles each
  if (db && opts.extract !== false) {
    const t2 = Date.now();
    const top = touched.filter((s) => importance(s) >= 3).sort((a, b) => importance(b) - importance(a)).slice(0, opts.extractMax ?? 250);
    const byStory = new Map<string, EmbeddedArticle[]>();
    for (const a of assignments) byStory.set(a.storyId, [...(byStory.get(a.storyId) ?? []), a.article]);
    const jobs = top.flatMap((s) => (byStory.get(s.id) ?? []).slice(0, 2));
    const lim = pLimit(8);
    let got = 0;
    await Promise.all(jobs.map((a) => lim(async () => {
      const ex = await extractArticle(a.url);
      if (!ex) return;
      got += 1;
      await db.from('articles').update({ content_text: ex.text, ...(a.imageUrl ? {} : { image_url: ex.imageUrl ?? null }) }).eq('url', a.url);
    })));
    stats.extracted = got;
    log(`extracted ${got}/${jobs.length} article bodies in ${((Date.now() - t2) / 1000).toFixed(1)}s`);
  }

  stats.ms = Date.now() - t0;
  if (db && runId) {
    must(await db.from('press_runs').update({ finished_at: new Date().toISOString(), stats, errors: errors.slice(0, 200) }).eq('id', runId), 'press_runs update');
  }

  if (opts.dry && process.env.DUMP_EMB) {
    writeFileSync(process.env.DUMP_EMB, JSON.stringify(embedded.map((a) => ({ t: a.title, d: a.domain, l: a.language, k: a.sourceKind, at: a.publishedAt, e: Array.from(a.embedding, (x) => Math.round(x * 1e4) / 1e4) }))));
  }
  if (opts.dry) {
    const titles = new Map(embedded.map((a) => [a.id, a]));
    const groups = new Map<string, EmbeddedArticle[]>();
    for (const a of assignments) groups.set(a.storyId, [...(groups.get(a.storyId) ?? []), titles.get(a.article.id)!]);
    const top = [...groups.values()].sort((a, b) => b.length - a.length).slice(0, 12);
    console.log('\nLargest clusters (check they are one event each):');
    for (const g of top) {
      console.log(`\n[${g.length} articles, ${new Set(g.map((x) => x.domain)).size} outlets]`);
      g.slice(0, 7).forEach((x) => console.log(`  - (${x.language}) ${x.title.slice(0, 110)}  <${x.domain}>`));
    }
  }
  log('done', stats);
  return stats;
}
