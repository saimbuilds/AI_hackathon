import { NextResponse } from 'next/server';
import { clientIp, fail, rateLimit, route } from '@/lib/http';
import { adminClient } from '@/lib/supabase';
import { verifyPrintToken } from '@/pdf/token';
import { EditionSchema } from '@/types/edition';

// GET /api/print/<editionId>?pt=<print token>  ->  Edition
// For the frontend's /print/[id] page only: the headless browser has no login, so it carries a short-lived
// signed token (minted by the server, valid for ~3 minutes and for this edition only).
export const GET = route(async (req, ctx) => {
  rateLimit(`print:ip:${clientIp(req)}`, 120, 60_000);
  const { id } = await ctx.params;
  const pt = new URL(req.url).searchParams.get('pt') ?? '';
  if (!/^[0-9a-f-]{36}$/.test(id) || !verifyPrintToken(id, pt)) return fail(403, 'This print link has expired.');
  const { data } = await adminClient()!.from('editions').select('payload').eq('id', id).maybeSingle();
  if (!data) return fail(404, 'Edition not found.');
  return NextResponse.json(EditionSchema.parse(data.payload), { headers: { 'cache-control': 'no-store' } });
});
