"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/session/client";
import { writeStored } from "@/components/ui/useStored";
import { Nav } from "@/components/ui/Nav";
import { PillButton } from "@/components/ui/PillButton";

type Shared = { fromName: string; story: { storyId: string; headline: string; dek?: string | null; category?: string | null; outlets?: number } };

/** Where a shared story lands: who sent it, the story, and the way into a paper of your own. */
export function ShareLanding({ token }: { token: string }) {
  const [data, setData] = useState<Shared | null | "error">(null);
  useEffect(() => {
    let live = true;
    api<Shared>(`/api/share/${token}`, { auth: false })
      .then((d) => live && setData(d))
      .catch(() => live && setData("error"));
    return () => {
      live = false;
    };
  }, [token]);

  return (
    <>
      <Nav />
      <main id="main" className="min-h-dvh bg-sun px-[var(--gutter)] pt-[calc(var(--nav-h)+var(--nav-top)+10vh)] pb-20">
        <div className="mx-auto max-w-[760px]" aria-live="polite">
          {data === "error" ? (
            <>
              <h1 className="t-xl">That link has expired.</h1>
              <p className="t-body-lg mt-5 text-ink-2">The story may have rolled off the press. You can still get a paper of your own.</p>
            </>
          ) : !data ? (
            <div className="h-[360px] animate-pulse rounded-[var(--r-lg)] bg-[rgb(255_255_255/0.4)]" aria-busy="true" />
          ) : (
            <>
              <p className="t-md">{data.fromName} thinks you’d like this.</p>
              <article className="mt-6 rounded-[var(--r-lg)] bg-sheet p-8 md:p-10">
                <p className="t-sm text-[var(--kicker)]">{data.story.category ?? "Today"}</p>
                <h1 className="mt-3 font-serif text-[clamp(2rem,1.4rem+2.4vw,3.2rem)] leading-[1] font-medium tracking-[-0.03em] text-balance">{data.story.headline}</h1>
                {data.story.dek && <p className="mt-5 font-serif text-[1.25rem] leading-[1.4] text-ink-2 italic">{data.story.dek}</p>}
                {data.story.outlets ? (
                  <p className="t-sm mt-6 text-ink-3">
                    Reported by {data.story.outlets} {data.story.outlets === 1 ? "outlet" : "outlets"}
                  </p>
                ) : null}
              </article>
            </>
          )}
          <div className="mt-10">
            <p className="t-body-lg max-w-[40ch]">Get a morning paper of your own. It starts with this story, and ends after six minutes.</p>
            <div className="mt-6">
              <PillButton
                href="/start"
                tone="press"
                look="solid"
                size="lg"
                onClick={() => {
                  if (data && data !== "error") writeStored("ep-share-claim", token);
                }}
              >
                Print my paper
              </PillButton>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
