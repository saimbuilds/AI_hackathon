"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { StorySlot } from "@/types/edition";
import { BRAND } from "@/lib/brand";
import { gsap, SplitText, useGSAP, prefersReducedMotion } from "@/components/motion/gsap";
import { Masthead } from "./Masthead";
import { TrustLine } from "./TrustLine";
import { useToday } from "./useToday";
import { useSavedName } from "./useSavedName";

type Props = {
  stories: StorySlot[];
  onThisDay?: string;
};

const releaseIntro = () => document.documentElement.classList.remove("intro-pending");

export function Hero({ stories, onThisDay }: Props) {
  const root = useRef<HTMLElement>(null);
  const today = useToday();
  const router = useRouter();
  const name = useSavedName().trim();

  const start = (n = name) => router.push(n ? `/onboarding?name=${encodeURIComponent(n)}` : "/onboarding");

  useGSAP(
    (_ctx, contextSafe) => {
      if (prefersReducedMotion()) {
        releaseIntro();
        return;
      }
      let split: SplitText | undefined;
      let cancelled = false;
      // contextSafe: animations created after the fonts load still belong to this component's context,
      // so React's dev double-mount and unmounts revert them cleanly.
      const play = contextSafe!(() => {
        if (cancelled || !root.current) return;
        split = SplitText.create(root.current.querySelector("[data-split-lines]"), {
          type: "lines",
          mask: "lines",
        });
        // Masks clip glyph overhangs (the T, descenders): remove them once the reveal lands.
        const tl = gsap.timeline({
          defaults: { ease: "expo.out", duration: 1.15 },
          onComplete: () => split?.revert(),
        });
        if (process.env.NODE_ENV !== "production") (window as unknown as { __heroTl: gsap.core.Timeline }).__heroTl = tl;
        tl.from("[data-rule]", { scaleX: 0, stagger: 0.07, duration: 1.3 }, 0)
          .from("[data-ear]", { autoAlpha: 0, y: -8, stagger: 0.05, duration: 0.7 }, 0.1)
          .from("[data-masthead-word]", { yPercent: 55, autoAlpha: 0, stagger: 0.09, duration: 1.1 }, 0.18)
          .from("[data-dateline] > *", { autoAlpha: 0, y: 6, stagger: 0.05, duration: 0.7 }, 0.45)
          .from(split.lines, { yPercent: 105, stagger: 0.09, duration: 1.2 }, 0.5)
          .from("[data-fade-up]", { autoAlpha: 0, y: 18, stagger: 0.07, duration: 0.9 }, 0.8)
          .from("[data-column-item]", { autoAlpha: 0, y: 22, stagger: 0.08, duration: 0.95 }, 0.85);
        releaseIntro();
      });
      document.fonts.ready.then(play);
      return () => {
        cancelled = true;
        split?.revert();
      };
    },
    { scope: root },
  );

  return (
    <header ref={root} data-intro className="relative">
      <div className="page">
        {/* Top bar */}
        <div className="flex h-16 items-center justify-between">
          <Link href="/" data-ear className="group flex items-baseline gap-0 font-serif text-[1.45rem] font-[560] tracking-[-0.025em]" translate="no">
            {BRAND.name}
            <span className="text-accent">.</span>
          </Link>
          <nav data-ear className="hidden items-center gap-9 md:flex" aria-label="Primary">
            <a href="#how" className="t-ui text-ink-2 transition-colors duration-[120ms] hover:text-ink">How it works</a>
            <a href="#family" className="t-ui text-ink-2 transition-colors duration-[120ms] hover:text-ink">For your family</a>
            <a href="#pricing" className="t-ui text-ink-2 transition-colors duration-[120ms] hover:text-ink">Pricing</a>
          </nav>
          <div data-ear className="flex items-center gap-6">
            <a href="/signin" className="t-ui hidden text-ink-2 transition-colors duration-[120ms] hover:text-ink sm:inline">Sign in</a>
            <button type="button" onClick={() => start()} className="btn-ink !h-10 !px-4 text-[0.9rem]">
              Print my paper
            </button>
          </div>
        </div>

        <span className="rule" data-rule />

        {/* Ears */}
        <div className="grid grid-cols-2 items-center gap-4 py-2.5 sm:grid-cols-3">
          <p data-ear className="t-mono text-ink-3">
            {today ? `Week ${today.week} · Day ${today.dayOfYear}` : " "}
          </p>
          <p data-ear className="t-meta hidden text-center sm:block">Every story checked across outlets</p>
          <p data-ear className="t-mono text-right text-ink-3">
            {today ? `${today.place} · ${today.time}` : " "}
          </p>
        </div>

        <span className="rule-hair" data-rule />

        <Masthead onSubmit={start} />

        <span className="rule-heavy" data-rule />
        <span className="mt-[3px] rule" data-rule />

        {/* Dateline */}
        <div data-dateline className="flex items-center justify-between gap-4 py-2.5">
          <p className="t-kicker text-ink-2">
            <span className="sm:hidden">{today?.short ?? " "}</span>
            <span className="hidden sm:inline">{today?.dateline ?? " "}</span>
          </p>
          <p className="t-kicker hidden text-ink-2 md:block">
            {today ? `${today.place} Edition` : " "} · No.&nbsp;1
          </p>
          <p className="t-kicker text-ink-2">
            <span className="sm:hidden">Six minutes</span>
            <span className="hidden sm:inline">Price: six minutes</span>
          </p>
        </div>

        <span className="rule" data-rule />

        {/* Front page */}
        <div className="grid grid-cols-12 gap-x-[var(--col-gap)] pb-20 pt-[clamp(2.25rem,4.5vw,4rem)]">
          <div className="col-span-12 lg:col-span-8 lg:pr-[calc(var(--col-gap)*0.5)]">
            <p data-fade-up className="t-kicker text-accent">
              Introducing {BRAND.name}
            </p>
            <h1 data-split-lines className="t-display mt-6">
              <span className="block">The morning paper</span>
              <span className="block">that ends.</span>
            </h1>
            <p data-fade-up className="t-dek mt-7 max-w-[44ch]">
              Every morning we read the world&rsquo;s news and print one paper written for you. About ten stories, each
              checked across outlets. Six minutes, then you&rsquo;re done, and you&rsquo;ll remember it.
            </p>
            <div data-fade-up className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-4">
              <button type="button" onClick={() => start()} className="btn-ink">
                {name ? `Print The ${name} Times` : "Print my paper"}
                <span className="arrow" aria-hidden>
                  →
                </span>
              </button>
              <a href="#how" className="btn-quiet">
                See how it works
              </a>
            </div>
            <p data-fade-up className="t-meta mt-6">
              Free · No signup to start · Ready in 90&nbsp;seconds
            </p>
          </div>

          <aside
            aria-label="Today's front page, sample edition"
            className="col-span-12 mt-16 lg:col-span-4 lg:mt-0 lg:border-l lg:border-rule lg:pl-[var(--col-gap)]"
          >
            <div data-column-item className="flex items-baseline justify-between">
              <p className="t-kicker">Today&rsquo;s front page</p>
              <p className="t-meta">Sample edition</p>
            </div>
            <span className="rule mt-3" />
            {stories.map((s) => (
              <article key={s.storyId} data-column-item className="border-b border-rule py-5">
                <p className="t-kicker text-ink-3">{s.kicker}</p>
                <h3 className="t-headline-m mt-2.5">{s.headline}</h3>
                {s.forYou ? (
                  <p className="mt-3 border-l-2 border-accent pl-3 text-[0.875rem] leading-[1.45] text-ink-2">
                    <span className="font-[600] text-ink">For you</span> · {s.forYou}
                  </p>
                ) : null}
                <TrustLine slot={s} className="mt-3" />
              </article>
            ))}
            {onThisDay ? (
              <div data-column-item className="pt-5">
                <p className="t-kicker text-ink-3">On this day</p>
                <p className="mt-2 font-serif text-[0.98rem] italic leading-[1.45] text-ink-2">{onThisDay}</p>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </header>
  );
}
