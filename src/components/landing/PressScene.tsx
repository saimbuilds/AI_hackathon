"use client";

import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/components/motion/gsap";

// Real outlets as visual texture for the illustration (the slips carry no claims, only names).
const OUTLETS = [
  "BBC News", "Dawn", "Al Jazeera", "DW", "The Hindu", "Le Monde", "El País", "NHK World", "The Guardian",
  "Ars Technica", "The Verge", "Nature", "AP", "France 24", "The Express Tribune", "Arab News", "SCMP",
  "Der Spiegel", "ABC Australia", "Bloomberg", "Financial Times", "Wired", "BBC Urdu", "NDTV", "Kyodo",
  "The Atlantic", "Rest of World", "Semafor", "Business Recorder", "ESPN", "Cricinfo", "Quanta",
];

const CAPTIONS = [
  { big: "Thousands.", text: "Every night the press reads the world’s news: thousands of articles from more than 150 outlets, in many languages." },
  { big: "Hundreds.", text: "When many outlets report the same event, it becomes one story, checked against all of them." },
  { big: "Ten.", text: "Then an editor picks the ten that matter to you, writes a line on what each means for you, and stops." },
];

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Props = { headlines: string[] };

export function PressScene({ headlines }: Props) {
  const root = useRef<HTMLElement>(null);
  const stories = headlines.slice(0, 12);
  const slipsPerStory = [16, 13, 12, 11, 10, 9, 9, 8, 8, 7, 7, 6];

  useGSAP(
    () => {
      const el = root.current!;
      const stage = el.querySelector<HTMLElement>("[data-stage]")!;
      const slips = gsap.utils.toArray<HTMLElement>("[data-slip]", el);
      const cards = gsap.utils.toArray<HTMLElement>("[data-card]", el);
      const captions = gsap.utils.toArray<HTMLElement>("[data-caption]", el);
      const bigs = gsap.utils.toArray<HTMLElement>("[data-big]", el);
      const nums = gsap.utils.toArray<HTMLElement>("[data-num]", el);
      // Centre every slip and card on its point (GSAP owns the transform, so no CSS translate).
      gsap.set([...slips, ...cards], { xPercent: -50, yPercent: -50 });

      if (prefersReducedMotion()) {
        // Static end state: your ten, no motion.
        const W = stage.clientWidth;
        const H = stage.clientHeight;
        gsap.set(slips, { autoAlpha: 0 });
        gsap.set(captions.slice(0, 2), { autoAlpha: 0 });
        gsap.set(bigs.slice(0, 2), { autoAlpha: 0 });
        cards.forEach((c, i) =>
          gsap.set(c, {
            autoAlpha: i < 10 ? 1 : 0,
            x: (i % 2 === 0 ? -0.26 : 0.26) * W,
            y: (Math.floor(i / 2) - 2) * Math.min(H / 5, 96),
          }),
        );
        return;
      }

      const mm = gsap.matchMedia();
      mm.add({ wide: "(min-width: 768px)", narrow: "(max-width: 767px)" }, (ctx) => {
        const wide = ctx.conditions!.wide;
        const W = stage.clientWidth;
        const H = stage.clientHeight;
        const rand = rng(42);
        const cols = wide ? 4 : 2;
        const rows = Math.ceil(stories.length / cols);
        const cellW = W / cols;
        const cellH = H / rows;
        // Cards always fit their cell (and the final two-column index fits the stage).
        const cardW = Math.min(cellW - (wide ? 20 : 10), 250);
        gsap.set(cards, { width: cardW });
        gsap.set(slips, { width: Math.min(cardW * 0.62, 132) });
        const cardH = cards[0]?.offsetHeight ?? 64;

        // Cluster centre for story i (stage-centred coordinates)
        const cluster = (i: number) => ({
          x: (i % cols) * cellW + cellW / 2 - W / 2,
          y: Math.floor(i / cols) * cellH + cellH / 2 - H / 2,
        });
        // Final "your ten": two tidy columns, numbered like a front-page index
        const finalGapY = Math.min(cardH * 1.14, (H - cardH) / 4.4);
        const final = (rank: number) => ({
          x: (rank % 2 === 0 ? -1 : 1) * (cardW / 2 + (wide ? 14 : 6)),
          y: (Math.floor(rank / 2) - 2) * finalGapY,
        });

        // Initial scatter: the overnight flood
        slips.forEach((s) => {
          gsap.set(s, {
            x: (rand() - 0.5) * W * 0.98,
            y: (rand() - 0.5) * H * 0.98,
            rotation: (rand() - 0.5) * 24,
            scale: 0.8 + rand() * 0.35,
            autoAlpha: 1,
          });
        });
        cards.forEach((c, i) => gsap.set(c, { ...cluster(i), autoAlpha: 0, scale: 0.92 }));
        gsap.set(nums, { autoAlpha: 0, x: -6 });
        gsap.set(captions.slice(1), { autoAlpha: 0, y: 14 });
        gsap.set(bigs.slice(1), { autoAlpha: 0, yPercent: 30 });

        const tl = gsap.timeline({
          defaults: { ease: "power2.inOut" },
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: () => `+=${window.innerHeight * (wide ? 2.6 : 2.2)}`,
            pin: true,
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        });

        // Act 1 → 2: slips fly into story stacks
        tl.to(slips, {
          x: (i: number) => {
            const story = Number(slips[i].dataset.story);
            return cluster(story).x + (rand() - 0.5) * 10;
          },
          y: (i: number) => {
            const story = Number(slips[i].dataset.story);
            return cluster(story).y + 6 + (Number(slips[i].dataset.depth) * 2.2);
          },
          rotation: () => (rand() - 0.5) * 7,
          scale: 0.92,
          duration: 1.2,
          stagger: { amount: 0.5, from: "random" },
        }, 0.15)
          .to(cards, { autoAlpha: 1, scale: 1, duration: 0.45, stagger: 0.03 }, 1.15)
          .to(captions[0], { autoAlpha: 0, y: -14, duration: 0.3 }, 0.95)
          .to(bigs[0], { autoAlpha: 0, yPercent: -30, duration: 0.3 }, 0.95)
          .to(captions[1], { autoAlpha: 1, y: 0, duration: 0.35 }, 1.15)
          .to(bigs[1], { autoAlpha: 1, yPercent: 0, duration: 0.35 }, 1.15)

          // Act 2 → 3: two stories don't make your paper; ten line up, numbered
          .to(cards.slice(10), { autoAlpha: 0, scale: 0.86, duration: 0.4 }, 2.1)
          .to(slips.filter((s) => Number(s.dataset.story) >= 10), { autoAlpha: 0, scale: 0.7, duration: 0.4 }, 2.1)
          .to(slips.filter((s) => Number(s.dataset.story) < 10), { autoAlpha: 0, duration: 0.35 }, 2.25)
          .to(cards.slice(0, 10), {
            x: (i: number) => final(i).x * (wide ? 1.1 : 1),
            y: (i: number) => final(i).y * (wide ? 1.1 : 1),
            scale: wide ? 1.1 : 1,
            duration: 1,
            stagger: 0.04,
          }, 2.3)
          .to(nums, { autoAlpha: 1, x: 0, duration: 0.4, stagger: 0.04 }, 2.9)
          .to(captions[1], { autoAlpha: 0, y: -14, duration: 0.3 }, 2.15)
          .to(bigs[1], { autoAlpha: 0, yPercent: -30, duration: 0.3 }, 2.15)
          .to(captions[2], { autoAlpha: 1, y: 0, duration: 0.35 }, 2.4)
          .to(bigs[2], { autoAlpha: 1, yPercent: 0, duration: 0.35 }, 2.4)
          .to({}, { duration: 0.5 });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  let slipIndex = 0;
  return (
    <section ref={root} aria-labelledby="press-title" className="relative h-dvh overflow-hidden border-t border-rule bg-paper">
      <div className="page grid h-full grid-cols-12 gap-x-[var(--col-gap)]">
        {/* Captions */}
        <div className="relative z-10 col-span-12 flex flex-col justify-start pt-[12vh] md:col-span-4 md:justify-center md:pt-0">
          <p className="t-kicker text-accent" id="press-title">
            How the press works
          </p>
          <div className="relative mt-5 h-[clamp(3.4rem,7vw,6.2rem)]">
            {CAPTIONS.map((c) => (
              <p key={c.big} data-big className="t-display absolute inset-x-0 top-0 !text-[clamp(3rem,6.4vw,6rem)]">
                {c.big}
              </p>
            ))}
          </div>
          <div className="relative mt-6 min-h-[7.5em] max-w-[34ch]">
            {CAPTIONS.map((c) => (
              <p key={c.big} data-caption className="t-dek absolute inset-x-0 top-0 !not-italic !text-ink-2">
                {c.text}
              </p>
            ))}
          </div>
        </div>

        {/* Stage */}
        <div data-stage aria-hidden className="relative col-span-12 h-[58dvh] md:col-span-8 md:my-[10vh] md:h-[80dvh]">
          <div className="absolute left-1/2 top-1/2">
            {stories.map((_, si) =>
              Array.from({ length: slipsPerStory[si] ?? 6 }).map((__, depth) => {
                const outlet = OUTLETS[(slipIndex++ * 7) % OUTLETS.length];
                return (
                  <div
                    key={`${si}-${depth}`}
                    data-slip
                    data-story={si}
                    data-depth={depth}
                    className="invisible absolute w-[110px] border border-rule bg-paper-raised px-2.5 py-2 will-change-transform"
                  >
                    <p className="t-kicker truncate !text-[0.56rem] text-ink-3">{outlet}</p>
                    <span className="mt-1.5 block h-[3px] w-[86%] bg-ink/15" />
                    <span className="mt-1 block h-[3px] w-[64%] bg-ink/10" />
                  </div>
                );
              }),
            )}
            {stories.map((h, i) => (
              <div
                key={h}
                data-card
                className="invisible absolute w-[220px] border border-ink/80 bg-paper px-3.5 py-3 will-change-transform"
              >
                <div className="flex items-start gap-2.5">
                  <span data-num className="t-mono mt-[3px] text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="font-serif text-[clamp(0.78rem,1vw,0.98rem)] font-[500] leading-[1.18] tracking-[-0.01em] line-clamp-2">
                    {h}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
