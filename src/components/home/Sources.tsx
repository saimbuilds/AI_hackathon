"use client";

import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/components/motion/gsap";

// Real outlets from the press's source catalog (worker/sources.json).
const ROWS = [
  ["BBC News", "Dawn", "Al Jazeera", "The Guardian", "Financial Times", "The Economist", "Le Monde", "DW", "France 24", "NPR"],
  ["The Express Tribune", "Geo News", "Business Recorder", "Arab News", "The National", "Scroll.in", "The Japan Times", "South China Morning Post", "CNA", "RNZ"],
  ["MIT Technology Review", "Ars Technica", "The Verge", "Wired", "TechCrunch", "Nature", "Quanta Magazine", "SpaceNews", "Politico", "The Conversation"],
];
const TONES = ["var(--sun)", "var(--cyan)", "var(--press)", "var(--leaf)"];

function Chip({ name, i }: { name: string; i: number }) {
  return (
    <span className="inline-flex h-[64px] shrink-0 items-center gap-3 rounded-full bg-sheet pr-6 pl-2.5 md:h-[76px] md:pr-8">
      <span
        className="grid h-[44px] w-[44px] place-items-center rounded-full font-serif text-[1.35rem] font-medium md:h-[54px] md:w-[54px]"
        style={{ background: TONES[i % TONES.length] }}
        aria-hidden
      >
        {name.replace(/^The /, "")[0]}
      </span>
      <span className="text-[1.05rem] font-medium tracking-[-0.03em] whitespace-nowrap md:text-[1.2rem]">{name}</span>
    </span>
  );
}

/** Three rails of outlets drifting in alternate directions; scrolling nudges them along. */
export function Sources() {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.utils.toArray<HTMLElement>(".rail").forEach((rail, i) => {
        const dir = i % 2 ? 1 : -1;
        const half = rail.scrollWidth / 2;
        const loop = gsap.fromTo(
          rail,
          { x: dir < 0 ? 0 : -half },
          { x: dir < 0 ? -half : 0, duration: 55 + i * 8, ease: "none", repeat: -1 },
        );
        // Speed up briefly with scroll velocity.
        gsap.to(loop, {
          timeScale: 1,
          scrollTrigger: {
            trigger: root.current,
            start: "top bottom",
            end: "bottom top",
            onUpdate: (self) => {
              const v = Math.min(Math.abs(self.getVelocity()) / 400, 6);
              gsap.to(loop, { timeScale: 1 + v, duration: 0.2, overwrite: true });
              gsap.to(loop, { timeScale: 1, duration: 1.2, delay: 0.2 });
            },
          },
        });
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="mt-[18vh]" aria-labelledby="sources-title">
      <h2 id="sources-title" className="t-xl container-page mx-auto max-w-[16ch] text-center">
        We read them, so you don’t have to.
      </h2>
      <p className="t-body container-page mx-auto mt-6 max-w-[46ch] text-center text-ink-2">
        Your paper draws on 530 sources across the world and your own corner of it. Every story links back to the
        outlets that reported it.
      </p>
      <div className="rail-mask mt-14 flex flex-col gap-3" aria-label="Some of the outlets we read">
        {ROWS.map((row, r) => (
          <div key={r} className="rail" aria-hidden={r > 0 || undefined}>
            {[...row, ...row].map((n, i) => (
              <Chip key={`${n}-${i}`} name={n} i={i + r} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
