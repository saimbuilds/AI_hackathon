"use client";

import { useEffect, useState } from "react";
import { listFollows, unfollow, type Follow } from "./api";
import { AskBox } from "./AskBox";
import { useClientValue } from "@/components/ui/useStored";
import { hasStoredSession } from "@/components/session/client";
import { PillButton } from "@/components/ui/PillButton";

/** Everything the reader follows, with the latest change for each. */
export function FollowingList() {
  const session = useClientValue(hasStoredSession, false);
  const [items, setItems] = useState<Follow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let live = true;
    listFollows()
      .then((f) => live && setItems(f))
      .catch((e) => live && setError(e instanceof Error ? e.message : "Couldn’t load what you follow."));
    return () => {
      live = false;
    };
  }, [session]);

  return (
    <div className="container-page mt-16 grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-7">
        {!session ? (
          <div className="rounded-[var(--r-lg)] bg-sheet p-8">
            <p className="t-md">Nothing followed yet.</p>
            <p className="t-body mt-2 text-ink-2">Ask a question or follow a story in your paper, and updates show up here and at the top of tomorrow’s paper.</p>
            <div className="mt-6">
              <PillButton href="/start" tone="press" look="solid">
                Print my paper
              </PillButton>
            </div>
          </div>
        ) : error ? (
          <p className="t-body rounded-[var(--r-sm)] bg-sheet p-4" role="alert">
            {error}
          </p>
        ) : !items ? (
          <div className="h-64 animate-pulse rounded-[var(--r-lg)] bg-sheet" aria-busy="true" />
        ) : items.length === 0 ? (
          <div className="rounded-[var(--r-lg)] bg-sheet p-8">
            <p className="t-md">Nothing followed yet.</p>
            <p className="t-body mt-2 text-ink-2">Ask a question on the right, or tap “Follow this story” on any story in your paper.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((f) => (
              <li key={f.id} className="rounded-[var(--r-lg)] bg-sheet p-6 md:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="t-sm text-ink-3">{f.kind === "story" ? "Story you follow" : "Your question"}</p>
                    <h2 className="mt-1 font-serif text-[1.45rem] leading-[1.15] font-medium tracking-[-0.015em] text-balance">{f.question}</h2>
                  </div>
                  <button
                    type="button"
                    className="tbtn !min-h-0 flex-none text-[0.9rem]"
                    onClick={async () => {
                      setItems((x) => x?.filter((y) => y.id !== f.id) ?? null);
                      await unfollow(f.id).catch(() => {});
                    }}
                  >
                    Unfollow
                  </button>
                </div>
                {f.latestUpdate ? (
                  <p className="t-body mt-4 rounded-[var(--r-sm)] bg-sun p-4">
                    <b className="font-semibold">Update.</b> {f.latestUpdate.summary}
                  </p>
                ) : f.answer ? (
                  <p className="t-body mt-4 text-ink-2">{f.answer}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="lg:col-span-5">
        <AskBox />
      </div>
    </div>
  );
}
