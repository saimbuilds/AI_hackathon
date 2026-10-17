"use client";

import { useRef } from "react";
import { FrontPage, type PaperData } from "@/components/paper/FrontPage";
import { PillButton } from "@/components/ui/PillButton";
import { gsap, useGSAP, prefersReducedMotion } from "@/components/motion/gsap";

const REPEATS = 5;
const RIBBON = "Make one for someone you love   \u25CF   In their language   \u25CF   Large print for tired eyes   \u25CF   اردو میں   \u25CF   Signed with love from you   \u25CF   On their doorstep at 7   \u25CF   ";

/** The gift: a large-print paper in another language, wrapped in a ribbon that runs as you scroll. */
export function GiftPanel({ urdu, english }: { urdu: PaperData; english: PaperData }) {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      // A slow, endless marquee: shift by exactly one repeat of the phrase, then loop without a seam.
      const tp = root.current!.querySelector<SVGTextPathElement>(".gift-ribbon-text");
      const text = tp?.parentElement as unknown as SVGTextElement | null;
      if (tp && text) {
        const repeat = text.getComputedTextLength() / REPEATS;
        gsap.fromTo(tp, { attr: { startOffset: 0 } }, { attr: { startOffset: -repeat }, duration: repeat / 45, ease: "none", repeat: -1 });
      }
      gsap.fromTo(
        ".gift-paper-ur",
        { rotate: 7, y: 80 },
        { rotate: 3, y: -30, ease: "none", scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: true } },
      );
      gsap.fromTo(
        ".gift-paper-en",
        { rotate: -9, y: 140 },
        { rotate: -5, y: -10, ease: "none", scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: true } },
      );
    },
    { scope: root },
  );

  // One gentle band from left to right, under the papers: always upright, never covering them.
  const d = "M-120,690 C120,620 330,760 560,690 C720,640 820,600 940,610";
  return (
    <section
      ref={root}
      id="gift"
      className="panel-top relative z-10 -mt-[var(--r-lg)] overflow-hidden bg-ink pt-24 pb-[calc(var(--r-lg)+96px)] text-on-dark md:pt-32"
      aria-labelledby="gift-title"
    >
      <div className="container-page grid items-center gap-12 md:grid-cols-12">
        <div className="relative z-20 md:col-span-5">
          <h2 id="gift-title" className="t-xl text-[var(--on-dark)]">
            Make one for someone you love.
          </h2>
          <p className="t-body-lg mt-6 max-w-[38ch] text-[color-mix(in_oklab,var(--on-dark)_72%,transparent)]">
            Describe them in a sentence: “Abbu, retired banker in Rawalpindi, cricket and markets, reads Urdu.” We print
            his paper every morning in his language and in large type, signed from you.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <PillButton href="/gift" tone="sun" look="solid">
              Make a gift paper
            </PillButton>
          </div>
          <dl className="mt-12 grid max-w-[420px] grid-cols-2 gap-6 border-t border-[rgb(236_233_225/0.16)] pt-6">
            <div>
              <dt className="t-sm text-[color-mix(in_oklab,var(--on-dark)_60%,transparent)]">Languages</dt>
              <dd className="t-body-lg mt-1 text-[var(--on-dark)]">Urdu, English, more coming</dd>
            </div>
            <div>
              <dt className="t-sm text-[color-mix(in_oklab,var(--on-dark)_60%,transparent)]">Delivered by</dt>
              <dd className="t-body-lg mt-1 text-[var(--on-dark)]">Email, WhatsApp or print</dd>
            </div>
          </dl>
        </div>

        <div className="relative h-[560px] md:col-span-7 md:h-[720px]">
          <div className="gift-paper-en absolute left-[2%] top-[14%] z-10 w-[58%] max-w-[380px]">
            <FrontPage data={english} crop large />
          </div>
          <div className="gift-paper-ur absolute right-[2%] top-[4%] z-20 w-[64%] max-w-[440px]">
            <FrontPage data={urdu} crop large />
          </div>
          <svg
            className="pointer-events-none absolute -inset-x-[12%] -inset-y-[6%] z-0 h-[112%] w-[124%] overflow-visible"
            viewBox="0 0 800 760"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden
          >
            <path id="gift-ribbon" d={d} fill="none" stroke="var(--sun)" strokeWidth="58" />
            <text fill="var(--ink)" style={{ fontSize: 21, fontWeight: 550, letterSpacing: "-0.02em" }} dominantBaseline="central">
              <textPath href="#gift-ribbon" className="gift-ribbon-text" startOffset={0}>
                {RIBBON.repeat(REPEATS)}
              </textPath>
            </text>
          </svg>
        </div>
      </div>


    </section>
  );
}
