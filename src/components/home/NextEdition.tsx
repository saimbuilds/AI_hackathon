"use client";

import { useSyncExternalStore } from "react";

// Next 7:00 local time. Computed on the client (the server can't read the reader's clock during prerender).
function compute() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(7, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const mins = Math.round((next.getTime() - now.getTime()) / 60000);
  return `${Math.floor(mins / 60)} h ${String(mins % 60).padStart(2, "0")} min`;
}
let cache = "";
let stamp = -1;
const get = () => {
  const s = Math.floor(Date.now() / 30000);
  if (s !== stamp) {
    stamp = s;
    cache = compute();
  }
  return cache;
};
const sub = (cb: () => void) => {
  const id = setInterval(cb, 30000);
  return () => clearInterval(id);
};

export function useNextEdition() {
  return useSyncExternalStore(sub, get, () => null);
}

export function NextEdition() {
  const t = useNextEdition();
  return (
    <p className="t-body">
      <span className="block text-[color-mix(in_oklab,var(--ink)_70%,transparent)]">Next edition prints in</span>
      <span className="t-md t-num block">{t ?? " "}</span>
    </p>
  );
}
