"use client";

import { useState } from "react";
import Link from "next/link";

/** Screen-only controls: large print and print/save as PDF. */
export function PrintToolbar() {
  const [large, setLarge] = useState(false);
  return (
    <div className="no-print fixed inset-x-[var(--gutter)] top-[var(--nav-top)] z-50 flex items-center justify-between gap-3">
      <Link href="/paper" className="nav-box px-5 text-[1.0625rem] font-medium tracking-[-0.025em]">
        Back to the paper
      </Link>
      <div className="nav-box gap-2 pl-3">
        <button
          type="button"
          aria-pressed={large}
          onClick={() => {
            setLarge((v) => !v);
            document.querySelector(".print-root")?.setAttribute("data-large", String(!large));
          }}
          className={`chip !h-11 !px-4 text-[0.95rem] ${large ? "!bg-ink !text-[var(--on-dark)]" : "!bg-newsprint"}`}
        >
          Large print
        </button>
        <button type="button" onClick={() => window.print()} className="pbtn" data-size="sm" data-tone="press" data-look="solid">
          <span className="pbtn__label">Print or save PDF</span>
          <span className="pbtn__disc" aria-hidden>
            ↓
          </span>
        </button>
      </div>
    </div>
  );
}
