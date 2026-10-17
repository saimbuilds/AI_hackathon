import { NextResponse } from 'next/server';
import { clientIp, fail, rateLimit, route } from '@/lib/http';
import { adminClient } from '@/lib/supabase';
import { pdfResponse, safeName } from '@/pdf/http';
import { getEditionPdf } from '@/pdf/service';

export const maxDuration = 60;

// GET /api/gift/<token>/pdf  (public)  ->  the gift paper's latest edition as a PDF ("Compiled for Abbu by Saim").
// Same 503 { fallback: 'client-print', printUrl } contract as /api/pdf/[id].
export const GET = route(async (req, ctx) => {
  const { token } = await ctx.params;
  rateLimit(`giftpdf:ip:${clientIp(req)}`, 10, 60_000);
  rateLimit(`giftpdf:token:${token}`, 20, 3_600_000);
  if (!/^[0-9a-f]{24}$/.test(token)) return fail(404, 'This paper link is not valid.');
  const db = adminClient()!;
  const { data: gift } = await db.from('gifts').select('recipient_user_id').eq('token', token).maybeSingle();
  if (!gift?.recipient_user_id) return fail(404, 'This paper link is not valid.');
  const { data: ed } = await db.from('editions').select('id,date,payload').eq('user_id', gift.recipient_user_id).order('number', { ascending: false }).limit(1).maybeSingle();
  if (!ed) return fail(404, 'No paper has been printed yet.');

  const out = await getEditionPdf(ed.id);
  if (!out.ok) return NextResponse.json({ error: 'The PDF is not available right now.', fallback: out.fallback, printUrl: out.printUrl }, { status: 503 });
  return pdfResponse(out.bytes, safeName((ed.payload as { paperName?: string }).paperName ?? 'paper', ed.date as string), false);
});
