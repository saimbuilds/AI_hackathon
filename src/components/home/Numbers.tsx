"use client";

import { useRef, type ReactNode } from "react";
import { Squiggle } from "@/components/ui/Squiggle";
import { Globe, Clock, Coin } from "@/components/ui/icons";
import { gsap, useGSAP, prefersReducedMotion } from "@/components/motion/gsap";

type Stat = { value: string; caption: string; bg: string; fg: string; icon: ReactNode };

const STATS: Stat[] = [
  {
    value: "530",
    caption: "newsrooms read every night, in 50 countries, from Dawn and Geo to Le Monde and Al Jazeera.",
    bg: "var(--sheet)",
    fg: "var(--ink)",
    icon: <Globe />,
  },
  {
    value: "6 min",
    caption: "to read the whole paper. About ten stories, then a last page that says you’re done.",
    bg: "var(--cyan)",
    fg: "var(--ink)",
    icon: <Clock />,
  },
  {
    value: "¼¢",
    caption: "to print each edition, so the daily paper can stay free and never needs to sell your attention.",
    bg: "var(--press)",
    fg: "var(--ink)",
    icon: <Coin />,
  },
];

/** Big numbers on cards that stack like a pile of papers as you scroll. */
export function Numbers() {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const cards = gsap.utils.toArray<HTMLElement>(".stat-card");
      cards.forEach((card, i) => {
        const next = cards[i + 1];
        if (!next) return;
        gsap.to(card.firstElementChild, {
          scale: 0.9,
          rotate: i % 2 ? 3 : -3,
          ease: "none",
          scrollTrigger: { trigger: next, start: "top bottom", end: "top 30%", scrub: true },
        });
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="panel-top relative z-10 -mt-[var(--r-lg)] bg-newsprint pt-28 pb-[calc(var(--r-lg)+12vh)] md:pt-40"
      aria-labelledby="numbers-title"
    >
      <div className="container-page grid gap-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <div className="md:sticky md:top-[calc(var(--nav-h)+var(--nav-top)+40px)]">
            <h2 id="numbers-title" className="t-xl">
              A few numbers behind <Squiggle color="var(--press)">every</Squiggle> edition
            </h2>
            <p className="t-body mt-10 max-w-[34ch] text-ink-2">
              The expensive work happens once per story, overnight, and is shared by every reader. Your paper only costs
              the last step: choosing and framing it for you.
            </p>
          </div>
        </div>
        <ol className="md:col-span-6 md:col-start-7">
          {STATS.map((s) => (
            <li key={s.value} className="stat-card sticky top-[calc(var(--nav-h)+var(--nav-top)+24px)] pb-[8vh]">
              <div
                className="relative flex aspect-[4/5] max-h-[620px] w-full max-w-[460px] flex-col justify-between rounded-[var(--r-lg)] p-8 md:ml-auto md:p-10"
                style={{ background: s.bg, color: s.fg }}
              >
                <span className="absolute right-6 top-6 grid h-12 w-12 place-items-center rounded-full bg-[color-mix(in_oklab,currentColor_10%,transparent)]">
                  {s.icon}
                </span>
                <span className="t-num mt-10 text-[clamp(5rem,3rem+7vw,9.5rem)] leading-[0.85] font-medium tracking-[-0.07em]">
                  {s.value}
                </span>
                <p className="t-body-lg max-w-[26ch]">{s.caption}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
