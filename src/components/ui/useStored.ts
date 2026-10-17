"use client";

import { useCallback, useSyncExternalStore } from "react";

// Browser storage as an external store: the server (and the first client render) sees `fallback`,
// then React re-renders with the stored value. Writers notify every hook reading the same key.
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  addEventListener("storage", l);
  return () => {
    listeners.delete(l);
    removeEventListener("storage", l);
  };
};

function read(area: "local" | "session", key: string): string | null {
  try {
    return (area === "local" ? localStorage : sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string | null, area: "local" | "session" = "local") {
  try {
    const s = area === "local" ? localStorage : sessionStorage;
    if (value === null) s.removeItem(key);
    else s.setItem(key, value);
  } catch {}
  notify();
}

/** A raw string from storage (null when missing). */
export function useStored(key: string, area: "local" | "session" = "local"): [string | null, (v: string | null) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(area, key),
    () => null,
  );
  const set = useCallback((v: string | null) => writeStored(key, v, area), [key, area]);
  return [value, set];
}

/** A value only the browser knows (time zone, document attributes). `fallback` on the server. */
export function useClientValue<T>(get: () => T, fallback: T, sub: (cb: () => void) => () => void = () => () => {}): T {
  return useSyncExternalStore(sub, get, () => fallback);
}
