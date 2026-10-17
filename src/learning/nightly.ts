// Nightly: decay the fast signals, then rewrite each active reader's plain-English memo (<= 80 words).
// The reader can edit the memo; the previous text is fed back so their wording survives.
import { z } from 'zod';
import { adminClient } from '../lib/supabase';
import { llm, LLMUnavailableError, wrapUntrusted } from '../lib/llm';
import { fromPg, toPg } from '../lib/vec';
import { topicLabel } from '../edition/assemble';
import type { Profile } from '../edition/candidates';
import { dailyDecay } from './update';

const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);
const MemoSchema = z.object({ memo: z.string().min(20).max(700) });

const SYSTEM = `You write a short reading memo about ONE reader of a personal newspaper, in second person ("You follow...").
Use only the evidence given. Plain English, at most 80 words, no flattery, no advice. Say what they read more of, what they skip, and any recent shift.
The previous memo may have been edited by the reader: keep their wording wherever it is still consistent with the evidence. Never invent interests.
Return {"memo": "..."}.`;

type Evidence = { top: string[]; skips: string[]; liked: string[]; recentEvents: number };

export function evidenceFrom(beta: Record<string, [number, number]>, liked: string[], recentEvents: number): Evidence {
  const rows = Object.entries(beta).filter(([, [a, b]]) => a + b >= 3).map(([t, [a, b]]) => ({ t, m: a / (a + b) }));
  return {
    top: rows.filter((r) => r.m > 0.6).sort((x, y) => y.m - x.m).slice(0, 5).map((r) => topicLabel(r.t)),
    skips: rows.filter((r) => r.m < 0.35).sort((x, y) => x.m - y.m).slice(0, 3).map((r) => topicLabel(r.t)),
    liked: liked.slice(0, 8),
    recentEvents,
  };
}

const list = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : (xs[0] ?? ''));

export function templateMemo(e: Evidence): string | null {
  if (!e.top.length && !e.skips.length) return null;
  const follow = e.top.length ? `You follow ${list(e.top.slice(0, 3))} more than other subjects.` : '';
  const skip = e.skips.length ? ` You tend to skip ${list(e.skips)}.` : '';
  return `${follow}${skip}`.trim();
}

export async function runNightly(): Promise<{ readers: number; memos: number; llmMemos: number }> {
  const db = adminClient();
  if (!db) throw new Error('Supabase env missing');
  const { data: profiles, error } = await db.from('profiles').select('*').not('onboarded_at', 'is', null);
  if (error) throw new Error(error.message);
  const week = new Date(Date.now() - 7 * 86_400_000).toISOString();
  let memos = 0;
  let llmMemos = 0;

  for (const p of (profiles ?? []) as Profile[]) {
    const decayed = dailyDecay({
      vecLong: p.vec_long ? fromPg(p.vec_long) : null, vecShort: p.vec_short ? fromPg(p.vec_short) : null, topicBeta: p.topic_beta ?? {},
      muted: { topics: [], sources: [], stories: [] }, streak: p.streak, lastReadOn: null,
    });

    const { data: ev } = await db.from('events').select('type,story_id').eq('user_id', p.id).gte('created_at', week).limit(2000);
    const likedIds = [...new Set((ev ?? []).filter((e) => ['more', 'save', 'read_end'].includes(e.type) && e.story_id).map((e) => e.story_id as string))].slice(0, 12);
    const { data: liked } = likedIds.length ? await db.from('stories').select('headline').in('id', likedIds) : { data: [] };
    const evidence = evidenceFrom(decayed.topicBeta, (liked ?? []).flatMap((s) => (s.headline ? [s.headline as string] : [])), ev?.length ?? 0);

    let memo = p.memo;
    if ((ev?.length ?? 0) >= 3) {
      try {
        const user = `PREVIOUS MEMO: ${p.memo ?? 'none'}\nMOST-READ TOPICS: ${evidence.top.join(', ') || 'none yet'}\nSKIPPED TOPICS: ${evidence.skips.join(', ') || 'none'}\nSTORIES THEY RECENTLY LIKED OR FINISHED:\n${wrapUntrusted('headlines', evidence.liked.map((h) => `- ${h}`).join('\n') || '(none)')}\nSTATED INTERESTS: ${(p.interests.chips ?? []).join(', ')}`;
        const res = await llm({ task: 'memo', system: SYSTEM, user, schema: MemoSchema });
        if (res.data.memo.split(/\s+/).length <= 90) { memo = res.data.memo.trim(); llmMemos += 1; }
      } catch (e) {
        if (!(e instanceof LLMUnavailableError)) throw e;
        memo = templateMemo(evidence) ?? memo; // deterministic memo when no model is reachable
      }
      if (memo !== p.memo) memos += 1;
    }

    const { error: upErr } = await db.from('profiles').update({ topic_beta: decayed.topicBeta, vec_short: decayed.vecShort ? toPg(decayed.vecShort) : null, memo }).eq('id', p.id);
    if (upErr) log(`nightly: could not update ${p.id}: ${upErr.message}`);
  }
  log(`nightly: ${profiles?.length ?? 0} readers decayed, ${memos} memos updated (${llmMemos} by LLM)`);
  return { readers: profiles?.length ?? 0, memos, llmMemos };
}
