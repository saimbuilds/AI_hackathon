"use client";

import { useEffect, useState } from "react";
import { EditionSchema, type Edition } from "@/types/edition";
import { api } from "@/components/session/client";
import { Reader } from "@/components/reader/Reader";
import { Nav } from "@/components/ui/Nav";
import { PillButton } from "@/components/ui/PillButton";

// One print per gift link per page load, even when an effect runs twice (dev) or the reader navigates back.
const printing = new Map<string, Promise<unknown>>();

type GiftInfo = { forName: string; fromName: string; relation: string; language: "en" | "ur"; largePrint: boolean };
type State = { kind: "loading" } | { kind: "printing"; gift: GiftInfo } | { kind: "ready"; edition: Edition } | { kind: "error"; message: string };

/** The recipient's paper: public, no account. Prints today's edition on first open if it isn't ready yet. */
export function GiftPaper({ token }: { token: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let live = true;
    const read = () => api<{ gift: GiftInfo; edition: unknown; needsBuild: boolean }>(`/api/gift/${token}`, { auth: false });
    (async () => {
      try {
        let r = await read();
        if (r.needsBuild || !r.edition) {
          if (live) setState({ kind: "printing", gift: r.gift });
          if (!printing.has(token)) printing.set(token, api(`/api/gift/${token}`, { method: "POST", auth: false, json: {} }));
          await printing.get(token);
          r = await read();
        }
        const parsed = EditionSchema.safeParse(r.edition);
        if (!live) return;
        setState(parsed.success ? { kind: "ready", edition: parsed.data } : { kind: "error", message: "This paper couldn’t be opened." });
      } catch (e) {
        if (live) setState({ kind: "error", message: e instanceof Error ? e.message : "This paper couldn’t be opened." });
      }
    })();
    return () => {
      live = false;
    };
  }, [token]);

  if (state.kind === "ready") return <Reader edition={state.edition} variant="gift" />;
  return (
    <>
      <Nav cta={null} />
      <main id="main" className="grid min-h-dvh place-items-center bg-sun px-[var(--gutter)] text-center" aria-live="polite">
        <div className="max-w-[640px]">
          {state.kind === "error" ? (
            <>
              <h1 className="t-xl">{state.message}</h1>
              <p className="t-body-lg mt-5 text-ink-2">Ask whoever sent it for a fresh link.</p>
              <div className="mt-8">
                <PillButton href="/" tone="press" look="solid">
                  What is Endpaper?
                </PillButton>
              </div>
            </>
          ) : (
            <>
              <h1 className="t-xl">{state.kind === "printing" ? `Printing ${state.gift.forName}’s paper` : "Opening your paper"}</h1>
              <p className="t-body-lg mt-5 text-ink-2">
                {state.kind === "printing" ? `${state.gift.fromName} made this for you. It takes about half a minute the first time.` : "One moment."}
              </p>
              <div className="mx-auto mt-10 h-2 w-48 overflow-hidden rounded-full bg-[rgb(28_29_26/0.12)]">
                <div className="h-full w-1/3 animate-[press-slide_1.2s_var(--ease-io)_infinite] rounded-full bg-ink" />
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
