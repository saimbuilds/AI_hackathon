"use client";

import { useEffect, useState } from "react";
import type { Edition } from "@/types/edition";
import { useClientValue } from "@/components/ui/useStored";
import { hasStoredSession, listEditionPayloads } from "@/components/session/client";
import { Shelf } from "./Shelf";

/** The reader's own editions when they have any; otherwise the sample, so the page is never empty. */
export function ArchiveScreen({ sample }: { sample: Edition }) {
  const session = useClientValue(hasStoredSession, false);
  const [editions, setEditions] = useState<Edition[] | null>(null);
  useEffect(() => {
    if (!session) return;
    let live = true;
    listEditionPayloads().then((rows) => live && setEditions(rows));
    return () => {
      live = false;
    };
  }, [session]);
  const own = editions && editions.length > 0;
  return <Shelf editions={own ? editions : [sample]} sample={!own} />;
}
