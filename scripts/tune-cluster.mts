// Offline threshold tuning on embeddings dumped by `DUMP_EMB=file pnpm press --dry`.
// Usage: tsx scripts/tune-cluster.mts <dump.json> [threshold ...]
import { readFileSync } from 'node:fs';
import { assignArticles, type EmbeddedArticle, type StoryState } from '../src/press/cluster';

const [file, ...ths] = process.argv.slice(2);
const raw = JSON.parse(readFileSync(file, 'utf8')) as { t: string; d: string; l: string; k: string; at: string; e: number[] }[];
const items: EmbeddedArticle[] = raw.map((r, i) => ({
  id: String(i), sourceId: 's', sourceKind: r.k, url: `https://${r.d}/${i}`, title: r.t, excerpt: '', language: r.l,
  publishedAt: new Date(r.at), domain: r.d, embedding: Float32Array.from(r.e),
}));
const show = Number(process.env.SHOW ?? 6);

for (const th of (ths.length ? ths : ['0.88']).map(Number)) {
  const stories = new Map<string, StoryState>();
  let n = 0;
  const out = assignArticles(stories, items, () => `s${n++}`, th);
  const groups = new Map<string, EmbeddedArticle[]>();
  for (const a of out) groups.set(a.storyId, [...(groups.get(a.storyId) ?? []), a.article]);
  const sizes = [...groups.values()].map((g) => g.length);
  const multi = sizes.filter((s) => s > 1).length;
  console.log(`\n===== threshold ${th}: ${items.length} articles -> ${groups.size} stories, ${multi} multi-article, largest ${Math.max(...sizes)}, multi-outlet ${[...groups.values()].filter((g) => new Set(g.map((x) => x.domain)).size > 1).length}`);
  const big = [...groups.values()].filter((g) => new Set(g.map((x) => x.domain)).size > 1).sort((a, b) => b.length - a.length).slice(0, show);
  for (const g of big) {
    console.log(`\n[${g.length} articles, ${new Set(g.map((x) => x.domain)).size} outlets]`);
    g.slice(0, 8).forEach((x) => console.log(`  - ${x.title.slice(0, 100)}  <${x.domain}>`));
  }
}
