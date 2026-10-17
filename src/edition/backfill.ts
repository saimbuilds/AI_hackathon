// Backfill: give an account a real archive. For each past day, build the edition the reader WOULD have got that
// morning (07:00 local), from stories that existed then, oldest day first so "already seen" works chronologically.
// Honest by construction: real stories, real dates, labelled in editions.stats.backfill.
import { adminClient } from '../lib/supabase';
import { buildEdition, localDate } from './build';
import { loadProfile } from './candidates';

const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

// The UTC instant at which the wall clock in `tz` reads `date` at `hhmm`.
export function localInstant(date: string, hhmm: string, tz: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = hhmm.split(':').map(Number);
  const wall = Date.UTC(y, m - 1, d, h, min);
  const offsetAt = (t: number) => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(t);
    const g = (k: string) => Number(parts.find((p) => p.type === k)!.value);
    return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second')) - t;
  };
  let t = wall - offsetAt(wall);
  t = wall - offsetAt(t); // second pass settles DST edges
  return t;
}

export async function backfillEditions(userId: string, opts: { days?: number; hhmm?: string; now?: number } = {}): Promise<{ built: number; skipped: number; fallback: number }> {
  const db = adminClient();
  if (!db) throw new Error('Supabase env missing');
  const profile = await loadProfile(db, userId);
  if (!profile) throw new Error('No such profile');
  const days = opts.days ?? 7;
  const now = opts.now ?? Date.now();
  const today = localDate(profile.tz, now);
  const out = { built: 0, skipped: 0, fallback: 0 };

  for (let back = days; back >= 1; back--) {
    const date = new Date(Date.parse(`${today}T00:00:00Z`) - back * 86_400_000).toISOString().slice(0, 10);
    const at = localInstant(date, opts.hhmm ?? '07:00', profile.tz);
    try {
      const r = await buildEdition(userId, { now: at, historical: true });
      if (r.reused) { out.skipped += 1; log(`backfill ${date}: already has an edition`); continue; }
      const { data } = await db.from('editions').select('stats').eq('id', r.editionId).single();
      await db.from('editions').update({ stats: { ...((data?.stats as object) ?? {}), backfill: true } }).eq('id', r.editionId);
      out.built += 1;
      if (r.fallback) out.fallback += 1;
      log(`backfill ${date}: edition No. ${r.number} in ${(r.ms / 1000).toFixed(1)}s${r.fallback ? ' (fallback copy)' : ''}`);
    } catch (e) {
      log(`backfill ${date}: ${e instanceof Error ? e.message : e}`);
    }
  }
  return out;
}
