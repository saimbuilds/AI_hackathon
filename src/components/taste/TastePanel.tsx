"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadTaste, type Taste, type TasteTopic } from "./taste";

export function useTaste(enabled = true): Taste | null | undefined {
  const [t, setT] = useState<Taste | null | undefined>(undefined);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    loadTaste()
      .then((x) => live && setT(x))
      .catch(() => live && setT(null));
    return () => {
      live = false;
    };
  }, [enabled]);
  return t;
}

const sure = (c: number) => (c >= 0.7 ? "sure" : c >= 0.35 ? "fairly sure" : "still learning");

function Bar({ t }: { t: TasteTopic }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1">
      <span className="t-body truncate">
        {t.label}
        {t.stated && <span className="t-xs ml-2 text-ink-3">you said so</span>}
      </span>
      <span className="t-xs text-ink-3">{sure(t.confidence)}</span>
      <span className="col-span-2 h-2 overflow-hidden rounded-full bg-newsprint" aria-hidden>
        {/* Width = how much you read it; opacity = how sure the paper is. */}
        <span className="block h-full rounded-full bg-[var(--press)]" style={{ width: `${Math.round(t.score * 100)}%`, opacity: 0.35 + 0.65 * t.confidence }} />
      </span>
    </li>
  );
}

/** The /me panel: learned topics with confidence, what moved since yesterday, the editor's memo. */
export function TastePanel() {
  const t = useTaste();
  if (t === undefined) return <div className="h-56 animate-pulse rounded-[var(--r-md)] bg-newsprint" aria-busy="true" />;
  if (!t || !t.topics.length) return <p className="t-body text-ink-2">Read a paper or two and this fills in: what you read, what you skip, and how sure your editor is.</p>;
  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div>
        <p className="t-sm font-semibold">What you read</p>
        <ul className="mt-3 space-y-3">
          {t.topics.slice(0, 7).map((x) => (
            <Bar key={x.slug} t={x} />
          ))}
        </ul>
        {t.avoided.length > 0 && (
          <p className="t-sm mt-5 text-ink-2">
            Less of: {t.avoided.slice(0, 4).map((x) => x.label).join(", ")}
          </p>
        )}
      </div>
      <div className="space-y-6">
        <div>
          <p className="t-sm font-semibold">Since yesterday</p>
          {t.changes.length ? (
            <ul className="mt-3 space-y-2">
              {t.changes.map((c) => (
                <li key={c.label} className="t-body flex items-baseline gap-2">
                  <span className={c.dir === "up" ? "text-[var(--press)]" : "text-ink-3"} aria-hidden>
                    {c.dir === "up" ? "▲" : "▼"}
                  </span>
                  <span>
                    {c.label} {c.dir === "up" ? "moves up" : "moves down"}
                    {c.why && <span className="text-ink-3">, {c.why}</span>}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="t-body mt-2 text-ink-2">Nothing moved yet today. Tap More or Less on a story and tomorrow’s paper changes.</p>
          )}
        </div>
        {t.memo && (
          <div>
            <p className="t-sm font-semibold">Your editor’s note on you</p>
            <p className="mt-2 font-serif text-[1.08rem] leading-[1.45] text-ink-2 italic">“{t.memo}”</p>
          </div>
        )}
        <Link href="/lab" className="tbtn">
          See how the paper learns
        </Link>
      </div>
    </div>
  );
}

/** One line near the top of the paper: what this edition was tuned on. */
export function TasteStrip() {
  const t = useTaste();
  if (!t || !t.topics.length) return null;
  const top = t.topics.slice(0, 3).map((x) => x.label);
  const change = t.changes[0];
  return (
    <div className="t-sm mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[var(--r-md)] bg-newsprint px-4 py-3">
      <span className="font-semibold">Your paper has learned</span>
      <span className="flex flex-wrap gap-1.5">
        {top.map((l) => (
          <span key={l} className="chip !h-7 !bg-[var(--paper-bg)] !px-3">
            {l}
          </span>
        ))}
      </span>
      {change && (
        <span className="text-ink-2">
          {change.dir === "up" ? "▲" : "▼"} {change.label} {change.dir === "up" ? "up" : "down"} since yesterday
        </span>
      )}
      <span className="ml-auto flex gap-4">
        <Link href="/me#learned" className="underline-offset-4 hover:underline">
          What it knows
        </Link>
        <Link href="/lab" className="text-ink-3 underline-offset-4 hover:underline">
          How it learns
        </Link>
      </span>
    </div>
  );
}
