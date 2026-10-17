// One-off repair: profiles saved with interest chips but no topic slugs (client sent topics: []) never got
// their stated interests into the taste vector. Map chips -> topics, blend the topic fingerprints into
// vec_long/vec_short, bump topic_beta, mute negative topics.  `tsx --env-file=.env.local scripts/repair-chip-topics.mts [--dry]`
import { adminClient } from '../src/lib/supabase';
import { chipTopics } from '../src/lib/onboarding';
import { fromPg, toPg } from '../src/lib/vec';

const db = adminClient()!;
const dry = process.argv.includes('--dry');
const { data: profiles } = await db.from('profiles').select('id,name,interests,topic_beta,muted,vec_long,vec_short').not('onboarded_at', 'is', null);
const { data: tv } = await db.from('topic_vectors').select('topic,embedding');
const vecs = new Map((tv ?? []).map((r) => [r.topic as string, fromPg(r.embedding as string)]));

const blend = (base: string | null, add: Float32Array[], sub: Float32Array[]) => {
  const dim = add[0]?.length ?? sub[0]?.length ?? 0;
  if (!dim) return base;
  const out = base ? fromPg(base) : new Float32Array(dim);
  for (const v of add) for (let i = 0; i < dim; i++) out[i] += 0.8 * v[i];
  for (const v of sub) for (let i = 0; i < dim; i++) out[i] -= 0.5 * v[i];
  const n = Math.hypot(...out) || 1;
  return toPg(out.map((x) => x / n));
};

for (const p of profiles ?? []) {
  const i = (p.interests ?? {}) as { chips?: string[]; topics?: string[]; negatives?: string[]; negativeTopics?: string[] };
  const negativeTopics = [...new Set([...(i.negativeTopics ?? []), ...chipTopics(i.negatives ?? [])])];
  const topics = [...new Set([...(i.topics ?? []), ...chipTopics(i.chips ?? [])])].filter((t) => !negativeTopics.includes(t));
  const newT = topics.filter((t) => !(i.topics ?? []).includes(t) && vecs.has(t));
  const newN = negativeTopics.filter((t) => !(i.negativeTopics ?? []).includes(t) && vecs.has(t));
  if (!newT.length && !newN.length) continue;
  console.log(`${p.name ?? p.id}: +topics ${newT.join(', ') || '-'} | +negative ${newN.join(', ') || '-'}`);
  if (dry) continue;
  const beta = { ...((p.topic_beta ?? {}) as Record<string, [number, number]>) };
  for (const t of newT) { const c = beta[t] ?? [1, 1]; beta[t] = [c[0] + 2, c[1]]; }
  for (const t of newN) { const c = beta[t] ?? [1, 1]; beta[t] = [c[0], c[1] + 2]; }
  const muted = (p.muted ?? { topics: [], sources: [], stories: [] }) as { topics: string[]; sources: string[]; stories: string[] };
  const add = newT.map((t) => vecs.get(t)!), sub = newN.map((t) => vecs.get(t)!);
  const { error } = await db.from('profiles').update({
    interests: { ...i, topics, negativeTopics }, topic_beta: beta, muted: { ...muted, topics: [...new Set([...muted.topics, ...newN])] },
    vec_long: blend(p.vec_long as string | null, add, sub), vec_short: blend(p.vec_short as string | null, add, sub),
  }).eq('id', p.id);
  if (error) console.log('  update failed:', error.message);
}
