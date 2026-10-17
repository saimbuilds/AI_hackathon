// Get an edition's PDF: cached copy from Storage (7 days), else render it with headless Chromium and cache it.
// If rendering is impossible the caller gets a client-print fallback (same /print page, window.print()).
import { adminClient } from '../lib/supabase';
import { captureError } from '../lib/monitor';
import { appUrl } from '../email/render';
import { renderPdf } from './render';
import { signPrintToken } from './token';

const CACHE_DAYS = 7;
const MAX_CONCURRENT_RENDERS = 2; // a Chromium page is ~300-500 MB
const WAIT_FOR_SLOT_MS = 25_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const printBase = () => (process.env.PRINT_BASE_URL ?? appUrl()).replace(/\/$/, '');
export const printUrl = (editionId: string, ttl = 180) => `${printBase()}/print/${editionId}?pt=${signPrintToken(editionId, ttl)}`;

export type PdfResult = { ok: true; bytes: Buffer; cached: boolean } | { ok: false; fallback: 'client-print'; printUrl: string; reason: string };

export async function getEditionPdf(editionId: string): Promise<PdfResult> {
  const db = adminClient();
  if (!db) throw new Error('Supabase env missing');
  const path = `${editionId}.pdf`;
  const storage = db.storage.from('pdfs');

  const { data: files } = await storage.list('', { search: path, limit: 1 });
  const hit = files?.find((f) => f.name === path);
  if (hit && Date.now() - Date.parse(hit.created_at ?? hit.updated_at ?? '') < CACHE_DAYS * 86_400_000) {
    const { data } = await storage.download(path);
    if (data) return { ok: true, bytes: Buffer.from(await data.arrayBuffer()), cached: true };
  }

  // Wait for a render slot (the jobs table doubles as the semaphore, like edition builds).
  const { data: job } = await db.from('jobs').insert({ kind: 'pdf', payload: { editionId } }).select('id').single();
  const started = Date.now();
  try {
    for (;;) {
      const { data: claimed } = await db.rpc('claim_job_slot', { p_job: job!.id, p_kind: 'pdf', p_max: MAX_CONCURRENT_RENDERS });
      if (claimed) break;
      if (Date.now() - started > WAIT_FOR_SLOT_MS) return { ok: false, fallback: 'client-print', printUrl: printUrl(editionId, 900), reason: 'renderer busy' };
      await sleep(600);
    }
    const bytes = await renderPdf(printUrl(editionId));
    if (bytes.length < 2000 || bytes.subarray(0, 4).toString() !== '%PDF') throw new Error('renderer returned an invalid PDF');
    await storage.upload(path, bytes, { contentType: 'application/pdf', upsert: true });
    await db.from('editions').update({ pdf_path: path }).eq('id', editionId);
    await db.from('jobs').update({ status: 'done', finished_at: new Date().toISOString() }).eq('id', job!.id);
    return { ok: true, bytes, cached: false };
  } catch (e) {
    await captureError(e, { task: 'pdf', editionId });
    await db.from('jobs').update({ status: 'failed', error: e instanceof Error ? e.message.slice(0, 300) : String(e), finished_at: new Date().toISOString() }).eq('id', job!.id);
    return { ok: false, fallback: 'client-print', printUrl: printUrl(editionId, 900), reason: e instanceof Error ? e.message.slice(0, 120) : 'render failed' };
  }
}
