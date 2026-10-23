"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import type { Edition } from "@/types/edition";
import { useClientValue } from "@/components/ui/useStored";
import { hasStoredSession, loadEdition } from "./client";
import { PRESSES_STOPPED } from "@/lib/frozen";

type State = { kind: "loading" } | { kind: "real"; edition: Edition } | { kind: "sample" };

/** Shows the reader's own edition (?e=<id>, else their latest), or the sample paper with a label saying so. */
export function EditionLoader({ sample, children }: { sample: Edition; children: (edition: Edition, isSample: boolean) => ReactNode }) {
  const session = useClientValue(hasStoredSession, false) && !PRESSES_STOPPED;
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!session) return;
    let live = true;
    const id = new URLSearchParams(location.search).get("e");
    loadEdition(id).then((e) => live && setState(e ? { kind: "real", edition: e } : { kind: "sample" }));
    return () => {
      live = false;
    };
  }, [session]);

  // No session: the sample, straight away. With one: a paper-shaped placeholder until it loads.
  if (!session || state.kind === "sample") {
    return (
      <>
        {children(sample, true)}
        <SampleBadge />
      </>
    );
  }
  if (state.kind === "loading") return <PaperSkeleton />;
  return <>{children(state.edition, false)}</>;
}

function SampleBadge() {
  return (
    <Link
      href="/start"
      className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2 rounded-full bg-sun px-5 py-3 text-[0.95rem] font-medium whitespace-nowrap text-ink shadow-[0_12px_30px_-12px_rgb(0_0_0/0.5)] md:bottom-6"
    >
      {PRESSES_STOPPED ? (
        <>
          A real paper from 17 October. <span className="underline underline-offset-4">Try the onboarding</span>
        </>
      ) : (
        <>
          This is a sample paper. <span className="underline underline-offset-4">Print your own</span>
        </>
      )}
    </Link>
  );
}

function PaperSkeleton() {
  return (
    <div className="min-h-dvh bg-newsprint pt-[calc(var(--nav-h)+var(--nav-top)*2)]" aria-busy="true" aria-label="Opening your paper">
      <div className="container-page">
        <div className="animate-pulse rounded-[var(--r-lg)] bg-[var(--paper-bg)] p-10">
          <div className="mx-auto h-24 max-w-[760px] rounded bg-newsprint-2" />
          <div className="mt-6 h-3 rounded bg-newsprint-2" />
          <div className="mt-10 grid gap-8 lg:grid-cols-12">
            <div className="h-64 rounded bg-newsprint-2 lg:col-span-3" />
            <div className="h-96 rounded bg-newsprint-2 lg:col-span-6" />
            <div className="h-64 rounded bg-newsprint-2 lg:col-span-3" />
          </div>
        </div>
      </div>
    </div>
  );
}
