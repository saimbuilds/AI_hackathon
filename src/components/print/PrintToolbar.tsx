"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { token } from "@/components/session/client";
import { SAMPLE_EDITION_ID } from "@/components/reader/track";
import { fitSheets } from "./fit";

/** Screen-only controls: large print, and a real PDF (server-rendered) with the browser's print as the fallback.
    Also tells the PDF renderer when the page is ready (fonts loaded). */
export function PrintToolbar({ editionId, largeDefault = false }: { editionId: string; largeDefault?: boolean }) {
  const [large, setLarge] = useState(largeDefault);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.fonts.ready.then(() => {
      fitSheets();
      requestAnimationFrame(() => {
        fitSheets();
        document.documentElement.dataset.printReady = "true";
      });
    });
  }, []);

  const download = async () => {
    if (editionId === SAMPLE_EDITION_ID) return window.print();
    setBusy(true);
    try {
      const t = await token(false);
      if (!t) return window.print();
      const res = await fetch(`/api/pdf/${editionId}`, { headers: { authorization: `Bearer ${t}` } });
      if (!res.ok || !res.headers.get("content-type")?.includes("pdf")) return window.print();
      const url = URL.createObjectURL(await res.blob());
      Object.assign(document.createElement("a"), { href: url, download: `endpaper-${editionId.slice(0, 8)}.pdf` }).click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch {
      window.print();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="no-print fixed inset-x-[var(--gutter)] top-[var(--nav-top)] z-50 flex items-center justify-between gap-3">
      <Link href={`/paper?e=${editionId}`} className="nav-box px-5 text-[1.0625rem] font-medium tracking-[-0.025em]">
        Back to the paper
      </Link>
      <div className="nav-box gap-2 pl-3">
        <button
          type="button"
          aria-pressed={large}
          onClick={() => {
            setLarge((v) => !v);
            document.querySelector(".print-root")?.setAttribute("data-large", String(!large));
            fitSheets();
            requestAnimationFrame(() => fitSheets());
          }}
          className={`chip !h-11 !px-4 text-[0.95rem] ${large ? "!bg-ink !text-[var(--on-dark)]" : "!bg-newsprint"}`}
        >
          Large print
        </button>
        <button type="button" onClick={download} disabled={busy} className="pbtn" data-size="sm" data-tone="press" data-look="solid">
          <span className="pbtn__label">{busy ? "Setting the PDF…" : "Download PDF"}</span>
          <span className="pbtn__disc" aria-hidden>
            ↓
          </span>
        </button>
      </div>
    </div>
  );
}
