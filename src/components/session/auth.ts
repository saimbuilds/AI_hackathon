"use client";

import { useSyncExternalStore } from "react";
import type { User } from "@supabase/supabase-js";
import { browserClient } from "./client";

// Google on top of the anonymous session: "Save my paper" links Google to the current (anonymous) account so
// nothing is lost; returning readers on a new device sign in with Google directly.

const callback = (next: string) => `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

export async function saveWithGoogle(next = location.pathname + location.search): Promise<string | null> {
  const sb = browserClient();
  if (!sb) return "Sign-in isn’t configured here.";
  const { data } = await sb.auth.getSession();
  const user = data.session?.user;
  const { error } =
    user?.is_anonymous
      ? await sb.auth.linkIdentity({ provider: "google", options: { redirectTo: callback(next) } })
      : await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback(next) } });
  return error ? error.message : null; // on success the browser is already leaving for Google
}

export async function signInWithGoogle(next = "/paper"): Promise<string | null> {
  const sb = browserClient();
  if (!sb) return "Sign-in isn’t configured here.";
  const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback(next) } });
  return error ? error.message : null;
}

export async function signOut() {
  await browserClient()?.auth.signOut();
}

// The signed-in user as an external store (null on the server and while signed out).
let current: User | null = null;
let subscribed = false;
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  const sb = browserClient();
  if (sb && !subscribed) {
    subscribed = true;
    sb.auth.getSession().then(({ data }) => {
      current = data.session?.user ?? null;
      listeners.forEach((l) => l());
    });
    sb.auth.onAuthStateChange((_e, session) => {
      current = session?.user ?? null;
      listeners.forEach((l) => l());
    });
  }
  return () => listeners.delete(cb);
}

export function useUser(): User | null {
  return useSyncExternalStore(subscribe, () => current, () => null);
}

/** A Google (or other non-anonymous) account holds this paper. */
export const isSaved = (u: User | null) => !!u && !u.is_anonymous;
