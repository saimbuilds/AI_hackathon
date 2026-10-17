import { Nav } from "@/components/ui/Nav";
import type { Metadata } from "next";
import { PillButton } from "@/components/ui/PillButton";

export const metadata: Metadata = { title: "Not in this edition · Endpaper" };

export default function NotFound() {
  return (
    <>
      <Nav />
      <main id="main" className="grid min-h-dvh place-items-center bg-sun px-[var(--gutter)] text-center">
        <div>
          <p className="text-[clamp(2rem,1.4rem+2.6vw,3.4rem)] font-semibold tracking-[-0.04em] text-[#c2321a]">— 404 —</p>
          <h1 className="t-mega mx-auto mt-6 max-w-[11ch]">This page didn’t make the edition.</h1>
          <p className="t-body-lg mx-auto mt-6 max-w-[34ch] text-ink-2">The link may be old, or the story was cut before print.</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <PillButton href="/paper" tone="press" look="solid">
              Read today’s paper
            </PillButton>
            <PillButton href="/" tone="sun">
              Go to the front page
            </PillButton>
          </div>
        </div>
      </main>
    </>
  );
}
