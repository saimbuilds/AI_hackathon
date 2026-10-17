// "What your paper has learned about you": a readable view of the learned state (no raw vectors).
import type { SupabaseClient } from '@supabase/supabase-js';
import { TOPICS } from '../lib/taxonomy';

export const topicLabel = (slug: string): string => slug.replace(/-/g, ' ').replace(/\bai\b/i, 'AI').replace(/\bf1\b/i, 'Formula 1').replace(/\bus\b/i, 'US').replace(/\buk\b/i, 'UK').replace(/^./, (c) => c.toUpperCase());

export type TasteTopic = { topic: string; label: string; score: number; strength: 'new' | 'growing' | 'strong'; origin: 'you said' | 'learned'; last24h: number; last7d: number };
export type Taste = {
  headline: string;
  likes: TasteTopic[];
  avoids: { topic: string; label: string; muted: boolean }[];
  signals: { last7d: { reads: number; saves: number; lessLikeThis: number }; total: number };
  streak: number;
  memo: string | null;
  firstPaperDate: string | null;
};

type Beta = Record<string, [number, number]>;

export function summariseTaste(input: { beta: Beta; stated: string[]; muted: string[]; deltas: Map<string, { d1: number; d7: number }>; memo: string | null; streak: number; signals: Taste['signals']; firstPaperDate: string | null }): Taste {
  const rows = Object.entries(input.beta).filter(([t]) => t in TOPICS).map(([topic, [a, b]]) => {
    const evidence = a + b - 2;
    const d = input.deltas.get(topic) ?? { d1: 0, d7: 0 };
    return {
      topic, label: topicLabel(topic), score: Math.round((a / (a + b)) * 100) / 100,
      strength: (evidence >= 6 ? 'strong' : evidence >= 2.5 ? 'growing' : 'new') as TasteTopic['strength'],
      origin: (input.stated.includes(topic) && evidence < 6 ? 'you said' : 'learned') as TasteTopic['origin'],
      last24h: Math.round(d.d1 * 10) / 10, last7d: Math.round(d.d7 * 10) / 10,
    };
  });
  const likes = rows.filter((r) => r.score > 0.55 && !input.muted.includes(r.topic)).sort((x, y) => (y.score - x.score) || (y.last7d - x.last7d)).slice(0, 8);
  const avoids = [...new Set([...input.muted, ...rows.filter((r) => r.score < 0.4).map((r) => r.topic)])].slice(0, 6).map((t) => ({ topic: t, label: topicLabel(t), muted: input.muted.includes(t) }));

  const rising = rows.filter((r) => r.last24h > 0.3).sort((a, b) => b.last24h - a.last24h)[0];
  const falling = rows.filter((r) => r.last24h < -0.3).sort((a, b) => a.last24h - b.last24h)[0];
  const parts: string[] = [];
  if (rising) parts.push(`you leaned into ${rising.label}`);
  if (falling) parts.push(`you pulled back from ${falling.label}`);
  const headline = parts.length ? `Since yesterday ${parts.join(' and ')}. Tomorrow's paper reflects it.`
    : input.signals.total === 0 ? 'No reading signals yet. Open stories, tap "less like this", save the ones you like, and your next paper changes.'
    : likes.length ? `Your paper is tuned to ${likes.slice(0, 3).map((l) => l.label).join(', ')}.` : 'Still learning what you like.';
  return { headline, likes, avoids, signals: input.signals, streak: input.streak, memo: input.memo, firstPaperDate: input.firstPaperDate };
}

export async function loadTaste(db: SupabaseClient, userId: string): Promise<Taste> {
  const now = Date.now();
  const since7 = new Date(now - 7 * 86_400_000).toISOString();
  const since1 = now - 86_400_000;
  const [{ data: p }, { data: ev }, { count: total }, { data: first }] = await Promise.all([
    db.from('profiles').select('topic_beta,muted,interests,memo,streak').eq('id', userId).maybeSingle(),
    db.from('events').select('type,weight,story_id,created_at,meta').eq('user_id', userId).gte('created_at', since7).not('story_id', 'is', null).limit(5000),
    db.from('events').select('id', { count: 'exact', head: true }).eq('user_id', userId).in('type', ['open', 'dwell', 'save', 'more', 'less', 'click_original', 'read_end', 'mute']),
    db.from('editions').select('date').eq('user_id', userId).order('date').limit(1),
  ]);
  const ids = [...new Set((ev ?? []).map((e) => e.story_id as string))];
  const topicsOf = new Map<string, string[]>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await db.from('stories').select('id,topics').in('id', ids.slice(i, i + 200));
    for (const s of data ?? []) topicsOf.set(s.id as string, (s.topics as string[]) ?? []);
  }
  const deltas = new Map<string, { d1: number; d7: number }>();
  const sig = { reads: 0, saves: 0, lessLikeThis: 0 };
  for (const e of ev ?? []) {
    if (e.type === 'open' || e.type === 'read_end') sig.reads += 1;
    if (e.type === 'save') sig.saves += 1;
    if (e.type === 'less') sig.lessLikeThis += 1;
    const w = Number(e.weight) || 0;
    if (!w) continue;
    for (const t of topicsOf.get(e.story_id as string) ?? []) {
      const d = deltas.get(t) ?? { d1: 0, d7: 0 };
      d.d7 += w;
      if (Date.parse(e.created_at as string) >= since1) d.d1 += w;
      deltas.set(t, d);
    }
  }
  const interests = (p?.interests ?? {}) as { topics?: string[] };
  const muted = (p?.muted ?? { topics: [] }) as { topics?: string[] };
  return summariseTaste({
    beta: (p?.topic_beta ?? {}) as Beta, stated: interests.topics ?? [], muted: muted.topics ?? [], deltas, memo: (p?.memo as string | null) ?? null,
    streak: (p?.streak as number) ?? 0, signals: { last7d: sig, total: total ?? 0 }, firstPaperDate: (first?.[0]?.date as string | undefined) ?? null,
  });
}
