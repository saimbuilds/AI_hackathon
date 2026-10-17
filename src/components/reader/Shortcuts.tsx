"use client";

import { useEffect, useRef } from "react";
import { Close } from "@/components/ui/icons";

const KEYS: [string, string][] = [
  ["J / K", "Next / previous story"],
  ["Enter", "Open the story"],
  ["Esc", "Close the story"],
  ["← / →", "Back / next in Stories mode"],
  ["↑", "Open the story in Stories mode"],
  ["?", "Show this list"],
];

/** The keyboard sheet, opened with "?". */
export function Shortcuts({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => (e.key === "Escape" || e.key === "?") && onClose();
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[85] grid place-items-center bg-[rgb(28_29_26/0.32)] p-4" onClick={onClose} role="presentation">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="keys-title"
        tabIndex={-1}
        className="w-full max-w-[440px] rounded-[var(--r-md)] bg-sheet p-6 outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id="keys-title" className="t-md">
            Keyboard
          </h2>
          <button type="button" className="menu-disc !h-10 !w-10 !bg-newsprint" onClick={onClose} aria-label="Close">
            <Close />
          </button>
        </div>
        <dl className="mt-4 divide-y divide-line">
          {KEYS.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 py-2.5">
              <dt>
                <kbd className="rounded-[var(--r-xs)] bg-newsprint px-2 py-1 text-[0.85rem] font-semibold">{k}</kbd>
              </dt>
              <dd className="t-body text-ink-2">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
