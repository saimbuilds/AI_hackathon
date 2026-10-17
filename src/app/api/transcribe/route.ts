import { NextResponse } from 'next/server';
import { clientIp, fail, rateLimit, requireUser, route } from '@/lib/http';
import { TRANSCRIBE } from '@/lib/models';
import { adminClient } from '@/lib/supabase';

export const maxDuration = 30;

const MAX_BYTES = 4_000_000; // Vercel request bodies cap at ~4.5 MB

// POST /api/transcribe  (multipart: file=<audio>, language?=<iso code>)  ->  { text }
// Whisper large-v3-turbo on Groq. If it is unavailable the response says so and the
// frontend falls back to the browser's Web Speech API.
export const POST = route(async (req) => {
  const user = await requireUser(req);
  rateLimit(`stt:ip:${clientIp(req)}`, 60, 60_000);
  rateLimit(`stt:user:${user.id}`, 6, 60_000);

  const key = process.env.GROQ_API_KEY;
  if (!key) return fail(503, 'Transcription unavailable', { useBrowserSpeech: true });

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return fail(400, 'Send the audio as multipart field "file"');
  if (file.size > MAX_BYTES) return fail(413, 'Audio too large (max 4 MB)');
  if (file.size < 1000) return fail(400, 'Audio too short');

  const out = new FormData();
  out.set('file', file, file.name || 'speech.webm');
  out.set('model', TRANSCRIBE.id);
  out.set('response_format', 'json');
  out.set('temperature', '0');
  const lang = form?.get('language');
  if (typeof lang === 'string' && /^[a-z]{2,3}$/.test(lang)) out.set('language', lang);

  const started = Date.now();
  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', headers: { authorization: `Bearer ${key}` }, body: out, signal: AbortSignal.timeout(20_000) }).catch(() => null);
  const ok = !!res?.ok;
  await adminClient()?.from('llm_usage').insert({ provider: TRANSCRIBE.provider, model: TRANSCRIBE.id, task: 'transcribe', ok, latency_ms: Date.now() - started, error: ok ? null : `HTTP ${res?.status ?? 'network'}` });
  if (!res || !ok) return fail(503, 'Transcription unavailable', { useBrowserSpeech: true });

  const { text } = (await res.json()) as { text?: string };
  return NextResponse.json({ text: (text ?? '').trim().slice(0, 800) });
});
