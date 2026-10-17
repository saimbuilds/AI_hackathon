"use client";

import { useEffect, useState } from "react";

type Ed = "morning" | "evening";

/** Morning Edition (light) / Evening Edition (dark). Follows the clock until the reader picks one. */
export function EditionToggle() {
  const [ed, setEd] = useState<Ed | null>(null);
  useEffect(() => setEd((document.documentElement.dataset.edition as Ed) ?? "morning"), []);
  const pick = (v: Ed) => {
    document.documentElement.dataset.edition = v;
    try {
      localStorage.setItem("ep-edition", v);
    } catch {}
    setEd(v);
  };
  return (
    <div className="inline-flex rounded-full bg-newsprint p-1" role="group" aria-label="Edition theme">
      {(["morning", "evening"] as const).map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={ed === v}
          onClick={() => pick(v)}
          className={`t-xs h-8 rounded-full px-3 capitalize transition-colors ${ed === v ? "bg-ink text-newsprint" : "text-ink-2 hover:text-ink"}`}
        >
          {v} edition
        </button>
      ))}
    </div>
  );
}
