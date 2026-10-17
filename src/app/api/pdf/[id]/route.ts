import { NextResponse } from 'next/server';
import { fail, rateLimit, requireUser, route } from '@/lib/http';
import { adminClient } from '@/lib/supabase';
import { pdfResponse, safeName } from '@/pdf/http';
import { getEditionPdf } from '@/pdf/service';

export const maxDuration = 60;

// GET /api/pdf/<editionId>   Authorization: Bearer <token>   (or ?access_token= so a plain <a href> can download)
// -> application/pdf (typeset with headless Chromium, cached 7 days). If rendering is unavailable the response is
// 503 { fallback: 'client-print', printUrl }: open printUrl and call window.print() (same page, same design).
export const GET = route(async (req, ctx) => {
  const user = await requireUser(req, { allowQueryToken: true });
  rateLimit(`pdf:user:${user.id}`, 8, 60_000);
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return fail(404, 'Edition not found.');
  const { data: ed } = await adminClient()!.from('editions').select('id,date,payload').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (!ed) return fail(404, 'Edition not found.');

  const out = await getEditionPdf(id);
  if (!out.ok) return NextResponse.json({ error: 'The PDF is not available right now.', fallback: out.fallback, printUrl: out.printUrl }, { status: 503 });
  const paper = (ed.payload as { paperName?: string }).paperName ?? 'paper';
  return pdfResponse(out.bytes, safeName(paper, ed.date as string), new URL(req.url).searchParams.get('inline') === '1');
});
