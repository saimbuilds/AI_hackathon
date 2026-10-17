import { NextResponse } from 'next/server';
import { clientIp, fail, rateLimit, route } from '@/lib/http';
import { adminClient } from '@/lib/supabase';

// GET /api/lab  (public)  ->  the latest Learning Lab run:
// { generatedAt, mode, config, pool, personas: [{ id, name, bio, hidden, stated, policies: { fold|onboarding|random: DayResult[] } }], summary }
// `summary.byDay` is ready for the chart (relevance and diversity per day for each policy);
// `personas[i].policies.fold[d].stories` are the front pages for the Day 1 vs Day N time-travel slider.
export const GET = route(async (req) => {
  rateLimit(`lab:ip:${clientIp(req)}`, 120, 60_000);
  const { data } = await adminClient()!.from('lab_runs').select('created_at,results').order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!data) return fail(404, 'The Learning Lab has not run yet.');
  return NextResponse.json(data.results, { headers: { 'cache-control': 'public, s-maxage=300, stale-while-revalidate=3600' } });
});
