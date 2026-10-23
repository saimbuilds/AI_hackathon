"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { EditionSchema, type Edition } from "@/types/edition";
import { PRESSES_STOPPED, STOPPED_MESSAGE } from "@/lib/frozen";

// Browser side of the backend contract (docs/API.md): an anonymous Supabase session, a bearer token on
// every /api call, and RLS-scoped reads of the reader's own editions.

let client: SupabaseClient | null | undefined;

export function browserClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce", storageKey: "ep-auth" } }) : null;
  return client;
}

/** True when this browser already holds a session (checked synchronously, for first paint decisions). */
export function hasStoredSession(): boolean {
  try {
    return !!localStorage.getItem("ep-auth");
  } catch {
    return false;
  }
}

let pending: Promise<string | null> | null = null;
let failedAt = 0; // a refused sign-in isn't retried by every call that follows it

/** The current access token, signing in anonymously the first time. Null when the backend isn't configured. */
export async function token(create = true): Promise<string | null> {
  const sb = browserClient();
  if (!sb || PRESSES_STOPPED) return null; // presses stopped: no new sessions, every page shows the sample
  const { data } = await sb.auth.getSession();
  if (data.session) return data.session.access_token;
  if (!create || Date.now() - failedAt < 30_000) return null;
  pending ??= sb.auth
    .signInAnonymously()
    .then(({ data: d, error }) => {
      if (error) {
        failedAt = Date.now();
        if (process.env.NODE_ENV !== "production") console.warn("[session] anonymous sign-in failed:", error.message);
        return null;
      }
      return d.session?.access_token ?? null;
    })
    .finally(() => (pending = null));
  return pending;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

/** fetch() against our API with the bearer token; JSON in, JSON out, errors as ApiError. */
export async function api<T>(path: string, init: RequestInit & { json?: unknown; auth?: boolean } = {}): Promise<T> {
  const { json, auth = true, headers, ...rest } = init;
  if (PRESSES_STOPPED && (auth || (rest.method ?? "GET") !== "GET")) throw new ApiError(503, STOPPED_MESSAGE, { stopped: true });
  const t = auth ? await token() : null;
  if (auth && !t) throw new ApiError(503, "Couldn’t start your session just now. Try again in a moment.");
  const res = await fetch(path, {
    ...rest,
    headers: {
      ...(json !== undefined ? { "content-type": "application/json" } : {}),
      ...(t ? { authorization: `Bearer ${t}` } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new ApiError(res.status, typeof body.error === "string" ? body.error : `Request failed (${res.status})`, body);
  return body as T;
}

/** The reader's edition by id, or their latest one. Validated against the contract. */
export async function loadEdition(id?: string | null): Promise<Edition | null> {
  const sb = browserClient();
  if (!sb || !(await token(false))) return null;
  const q = sb.from("editions").select("payload");
  const { data, error } = id ? await q.eq("id", id).maybeSingle() : await q.order("date", { ascending: false }).order("number", { ascending: false }).limit(1).maybeSingle();
  if (error || !data) return null;
  const parsed = EditionSchema.safeParse((data as { payload: unknown }).payload);
  return parsed.success ? parsed.data : null;
}

/** Full payloads of the reader’s recent editions, newest first (the archive). */
export async function listEditionPayloads(limit = 14): Promise<Edition[]> {
  const sb = browserClient();
  if (!sb || !(await token(false))) return [];
  const { data } = await sb.from("editions").select("payload").order("date", { ascending: false }).order("number", { ascending: false }).limit(limit);
  return (data ?? []).flatMap((r) => {
    const p = EditionSchema.safeParse((r as { payload: unknown }).payload);
    return p.success ? [p.data] : [];
  });
}
