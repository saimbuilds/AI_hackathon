"use client";

import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/components/motion/gsap";

type Props = {
  threeThings: string[];
  tomorrow: string[];
  editionNumber: number;
};

/** "It ends." The finite paper, the end mark, what you'll remember, and the Daily 3. */
export function EndScene({ threeThings, tomorrow, editionNumber }: Props) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const tl = gsap.timeline({
        scrollTrigger: { trigger: "[data-end-title]", start: "top 70%", toggleActions: "play none none reverse" },
      });
      tl.from("[data-end-title]", { yPercent: 35, autoAlpha: 0, duration: 1.1, ease: "expo.out" })
        .from(
          "[data-stamp]",
          { scale: 1.6, rotation: -9, autoAlpha: 0, duration: 0.55, ease: "back.out(2.2)" },
          "-=0.55",
        )
        .from("[data-cell]", { scale: 0.6, autoAlpha: 0, duration: 0.4, stagger: 0.07, ease: "back.out(2)" }, "-=0.2");
    },
    { scope: root },
  );

  return (
    <section ref={root} aria-labelledby="end-title" className="relative overflow-hidden border-t border-rule">
      <div className="page py-[clamp(4.5rem,11vw,10rem)]">
        <div className="text-center">
          <p className="t-kicker text-ink-3" data-reveal>
            The part no feed has
          </p>
          <h2 id="end-title" data-end-title className="t-display mx-auto mt-6 !text-[clamp(4rem,13vw,13rem)] !leading-[0.86]">
            It ends.
          </h2>
          <p data-stamp className="mt-8 font-serif text-[clamp(1.6rem,3vw,2.6rem)] tracking-[0.3em] text-accent" aria-label="Thirty, the newsroom mark for end of story">
            — 30 —
          </p>
          <p className="t-dek mx-auto mt-8 max-w-[46ch]" data-reveal>
            No infinite scroll. About ten stories, then &ldquo;You&rsquo;re all caught up.&rdquo; Close it knowing what
            happened, and come back tomorrow at seven.
          </p>
        </div>

        <div className="mt-[clamp(3.5rem,7vw,6rem)] grid grid-cols-12 gap-x-[var(--col-gap)] gap-y-12 border-t border-ink pt-10">
          {/* Three things */}
          <div className="col-span-12 lg:col-span-5" data-reveal>
            <p className="t-kicker">3 things you learned today</p>
            <ol className="mt-6 space-y-5">
              {threeThings.map((t, i) => (
                <li key={t} className="grid grid-cols-[2.25rem_1fr] items-baseline">
                  <span className="font-serif text-[1.6rem] leading-none text-accent">{i + 1}</span>
                  <span className="font-serif text-[1.12rem] leading-[1.45]">{t}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Daily 3 */}
          <div className="col-span-12 sm:col-span-6 lg:col-span-4 lg:border-l lg:border-rule lg:pl-[var(--col-gap)]" data-reveal>
            <p className="t-kicker">The Daily 3</p>
            <p className="t-meta mt-2">The same three questions for everyone, every morning.</p>
            <div className="mt-6 border border-rule bg-paper-raised p-5">
              <p className="t-mono text-ink-2">Endpaper No.&nbsp;{editionNumber}</p>
              <div className="mt-4 flex gap-2" aria-label="Three out of three correct">
                {[0, 1, 2].map((i) => (
                  <span key={i} data-cell className="inline-block size-9 bg-confirm" />
                ))}
              </div>
              <p className="mt-4 font-serif text-[1.35rem] leading-tight">
                3/3 · <span className="text-accent">9-day streak</span>
              </p>
              <p className="t-meta mt-3">Share it to WhatsApp. No spoilers, just your score.</p>
            </div>
          </div>

          {/* Tomorrow */}
          <div className="col-span-12 sm:col-span-6 lg:col-span-3 lg:border-l lg:border-rule lg:pl-[var(--col-gap)]" data-reveal>
            <p className="t-kicker">Tomorrow in your paper</p>
            <ul className="mt-6 space-y-4">
              {tomorrow.map((t) => (
                <li key={t} className="border-b border-rule pb-4 font-serif text-[1rem] italic leading-[1.45] text-ink-2">
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
