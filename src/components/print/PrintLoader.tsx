"use client";

import { useEffect, useState } from "react";
import type { Edition } from "@/types/edition";
import { loadEdition } from "@/components/session/client";
import { PillButton } from "@/components/ui/PillButton";
import { PrintSheets } from "./PrintSheets";
import { qrCodes } from "./qr";

type State = { edition: Edition; codes: Record<string, string> } | "loading" | "missing";

/** The reader's own edition, read under their session, typeset in the browser. */
export function PrintLoader({ id }: { id: string }) {
  const [state, setState] = useState<State>("loading");
  useEffect(() => {
    let live = true;
    loadEdition(id).then(async (e) => {
      if (!live) return;
      if (!e) return setState("missing");
      const codes = await qrCodes(e);
      if (live) setState({ edition: e, codes });
    });
    return () => {
      live = false;
    };
  }, [id]);

  if (state === "loading") {
    return (
      <div className="print-desk grid place-items-center text-[var(--on-dark)]" aria-busy="true">
        Setting your paper in type…
      </div>
    );
  }
  if (state === "missing") {
    return (
      <div className="print-desk grid place-items-center text-center text-[var(--on-dark)]">
        <div>
          <p className="t-lg text-[var(--on-dark)]">This edition isn’t on this browser’s account.</p>
          <p className="t-body mt-3 opacity-75">Open it from the browser you read it in, or print today’s paper.</p>
          <div className="mt-6">
            <PillButton href="/paper" tone="sun">
              Open my paper
            </PillButton>
          </div>
        </div>
      </div>
    );
  }
  return <PrintSheets edition={state.edition} codes={state.codes} />;
}
