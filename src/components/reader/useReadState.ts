"use client";

import { useCallback, useEffect, useState } from "react";

/** Which stories this reader has opened in this edition, plus saved ones. Kept per edition in localStorage. */
export function useReadState(editionId: string) {
  const key = `ep-read-${editionId}`;
  const [read, setRead] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(key) ?? "{}") as { read?: string[]; saved?: string[] };
      setRead(new Set(raw.read ?? []));
      setSaved(new Set(raw.saved ?? []));
    } catch {}
  }, [key]);

  const persist = useCallback(
    (r: Set<string>, s: Set<string>) => {
      try {
        localStorage.setItem(key, JSON.stringify({ read: [...r], saved: [...s] }));
      } catch {}
    },
    [key],
  );

  const markRead = useCallback(
    (id: string) =>
      setRead((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev).add(id);
        setSaved((s) => (persist(next, s), s));
        return next;
      }),
    [persist],
  );

  const toggleSave = useCallback(
    (id: string) =>
      setSaved((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setRead((r) => (persist(r, next), r));
        return next;
      }),
    [persist],
  );

  return { read, saved, markRead, toggleSave };
}
