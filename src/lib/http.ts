// Shared plumbing for API routes: auth, zod-validated input, JSON errors, rate limits.
//
// Auth contract for the frontend: sign in with supabase-js (anonymous first), then send
//   Authorization: Bearer <session.access_token>
// on every /api call. No cookies are involved.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminClient } from './supabase';
import { captureError } from './monitor';

export class HttpError extends Error {
  constructor(public status: number, message: string, public extra?: Record<string, unknown>) { super(message); }
}

export const fail = (status: number, message: string, extra?: Record<string, unknown>): never => { throw new HttpError(status, message, extra); };

export type AuthedUser = { id: string; isAnonymous: boolean; email: string | null };

export async function requireUser(req: Request): Promise<AuthedUser> {
  const token = req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return fail(401, 'Missing bearer token');
  const db = adminClient();
  if (!db) return fail(503, 'Server not configured');
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return fail(401, 'Invalid or expired session');
  return { id: data.user.id, isAnonymous: !!data.user.is_anonymous, email: data.user.email ?? null };
}

// When TURNSTILE_SECRET is set, expensive routes need a reader who passed the Turnstile check (POST /api/turnstile).
export async function requireHuman(user: AuthedUser): Promise<void> {
  if (!process.env.TURNSTILE_SECRET) return;
  const { data } = await adminClient()!.from('profiles').select('extras').eq('id', user.id).single();
  if (!(data?.extras as { human?: boolean } | null)?.human) fail(403, 'Please complete the human check first', { needsTurnstile: true });
}

export function isAdmin(req: Request): boolean {
  const key = process.env.ADMIN_KEY;
  return !!key && req.headers.get('x-admin-key') === key;
}

export async function parseJson<T>(req: Request, schema: z.ZodType<T>, maxBytes = 64_000): Promise<T> {
  const raw = await req.text();
  if (raw.length > maxBytes) return fail(413, 'Body too large');
  let json: unknown;
  try { json = raw ? JSON.parse(raw) : {}; } catch { return fail(400, 'Body is not valid JSON'); }
  const parsed = schema.safeParse(json);
  if (!parsed.success) return fail(400, 'Invalid input', { issues: parsed.error.issues.slice(0, 5).map((i) => ({ path: i.path.join('.'), message: i.message })) });
  return parsed.data;
}

// In-memory sliding window: per serverless instance, so it is a speed bump, not a vault.
// Durable per-user caps (rebuilds/day) are enforced against the database where they matter.
const hits = new Map<string, number[]>();
export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    fail(429, 'Too many requests, slow down', { retryAfterSeconds: Math.ceil((windowMs - (now - recent[0])) / 1000) });
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
}

export const clientIp = (req: Request): string => req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

// Wrap a route handler: HttpError -> JSON error, anything else -> 500 (message hidden from the client).
export function route(handler: (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>) {
  return async (req: Request, ctx: { params: Promise<Record<string, string>> }): Promise<Response> => {
    try {
      return await handler(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) {
        return NextResponse.json({ error: e.message, ...e.extra }, { status: e.status, headers: e.status === 429 && e.extra?.retryAfterSeconds ? { 'retry-after': String(e.extra.retryAfterSeconds) } : undefined });
      }
      console.error('route error', e);
      await captureError(e, { url: req.url });
      return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
  };
}
