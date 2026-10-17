"use client";

import { useClientValue, writeStored } from "@/components/ui/useStored";

type Ed = "morning" | "evening";

// The edition lives on <html data-edition> (set before paint); watch it like any external store.
const subscribe = (cb: () => void) => {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-edition"] });
  return () => mo.disconnect();
};
const current = () => (document.documentElement.getAttribute("data-edition") as Ed | null) ?? "morning";

/** Morning Edition (light) / Evening Edition (dark). Follows the clock until the reader picks one. */
export function EditionToggle() {
  const ed = useClientValue<Ed | null>(current, null, subscribe);
  const pick = (v: Ed) => {
    document.documentElement.setAttribute("data-edition", v);
    writeStored("ep-edition", v);
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
