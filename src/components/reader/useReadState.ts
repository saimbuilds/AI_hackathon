"use client";

import { useCallback, useMemo } from "react";
import { useStored, writeStored } from "@/components/ui/useStored";

type Saved = { read?: string[]; saved?: string[] };

const parse = (raw: string | null): Saved => {
  try {
    return raw ? (JSON.parse(raw) as Saved) : {};
  } catch {
    return {};
  }
};

/** Which stories this reader has opened in this edition, plus saved ones. Kept per edition in localStorage. */
export function useReadState(editionId: string) {
  const key = `ep-read-${editionId}`;
  const [raw] = useStored(key);
  const data = useMemo(() => parse(raw), [raw]);
  const read = useMemo(() => new Set(data.read ?? []), [data]);
  const saved = useMemo(() => new Set(data.saved ?? []), [data]);

  // Writes start from what's stored right now, so two quick updates never overwrite each other.
  const update = useCallback(
    (fn: (d: Required<Saved>) => Required<Saved>) => {
      let cur: Saved = {};
      try {
        cur = parse(localStorage.getItem(key));
      } catch {}
      writeStored(key, JSON.stringify(fn({ read: cur.read ?? [], saved: cur.saved ?? [] })));
    },
    [key],
  );

  const markRead = useCallback(
    (id: string) => update((d) => (d.read.includes(id) ? d : { ...d, read: [...d.read, id] })),
    [update],
  );
  const toggleSave = useCallback(
    (id: string) => update((d) => ({ ...d, saved: d.saved.includes(id) ? d.saved.filter((x) => x !== id) : [...d.saved, id] })),
    [update],
  );

  return { read, saved, markRead, toggleSave };
}
