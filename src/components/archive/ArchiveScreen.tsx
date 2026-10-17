"use client";

import { useEffect, useState } from "react";
import type { Edition } from "@/types/edition";
import { useClientValue } from "@/components/ui/useStored";
import { browserClient, hasStoredSession, listEditionPayloads } from "@/components/session/client";
import { Shelf, type EditionDay } from "./Shelf";

/** The reader's own editions when they have any; otherwise the sample, so the page is never empty. */
export function ArchiveScreen({ sample }: { sample: Edition }) {
  const session = useClientValue(hasStoredSession, false);
  const [editions, setEditions] = useState<Edition[] | null>(null);
  const [days, setDays] = useState<EditionDay[]>([]);
  useEffect(() => {
    if (!session) return;
    let live = true;
    listEditionPayloads().then((rows) => live && setEditions(rows));
    browserClient()
      ?.from("editions")
      .select("id,date,number")
      .order("date", { ascending: false })
      .order("number", { ascending: false })
      .limit(200)
      .then(({ data }) => live && setDays((data as EditionDay[] | null) ?? []));
    return () => {
      live = false;
    };
  }, [session]);
  const own = editions && editions.length > 0;
  return <Shelf editions={own ? editions : [sample]} days={own && days.length ? days : undefined} sample={!own} />;
}
