"use client";

import { useRef, useState } from "react";
import { BRAND } from "@/lib/brand";
import { FrontPage, type PaperData } from "@/components/paper/FrontPage";
import { PillButton } from "@/components/ui/PillButton";
import { CropMarks } from "@/components/ui/CropMarks";
import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from "@/components/motion/gsap";
import { useSavedName } from "./useSavedName";

const HEADLINE = ["Read less.", "Remember more."];

/** Hero (sticky yellow plate) + the intro panel that slides over it, sharing the reader's name. */
export function HomeTop({ paper }: { paper: PaperData }) {
  const [name, setName] = useSavedName();
  const [typed, setTyped] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const paperName = BRAND.defaultPaperName(name.trim() || null);

  useGSAP(
    () => {
      document.documentElement.classList.remove("intro-pending");
      if (prefersReducedMotion()) return;
      // 1. Print registration: cyan and red plates slide into register, then the ink plate lands.
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.from(".plate-c", { x: -14, y: 9, duration: 1.1 }, 0.05)
        .from(".plate-m", { x: 12, y: -8, duration: 1.1 }, 0.05)
        .from(".hero-line", { yPercent: 18, opacity: 0, duration: 0.9, stagger: 0.08 }, 0)
        .to(".plate-k", { opacity: 1, duration: 0.35, ease: "power1.out" }, 0.62)
        .to([".plate-c", ".plate-m"], { opacity: 0, duration: 0.5, ease: "power1.out" }, 0.9)
        .from(".hero-sub", { y: 16, opacity: 0, duration: 0.8 }, 0.5)
        .from(".hero-form", { y: 16, opacity: 0, duration: 0.8 }, 0.6)
        .from(".hero-paper", { yPercent: 18, rotate: -9, opacity: 0, duration: 1.3 }, 0.35);

      // 2. The paper straightens as the newsprint panel slides over the hero.
      gsap.fromTo(
        ".hero-paper-tilt",
        { rotate: -5, y: 0 },
        {
          rotate: 0,
          y: -40,
          ease: "none",
          scrollTrigger: { trigger: ".intro-panel", start: "top bottom", end: "top 20%", scrub: 0.6 },
        },
      );
      // 3. Hero type recedes a little under the panel.
      gsap.to(".hero-inner", {
        scale: 0.92,
        y: -40,
        ease: "none",
        scrollTrigger: { trigger: ".intro-panel", start: "top bottom", end: "top top", scrub: true },
      });
      ScrollTrigger.refresh();
    },
    { scope: root },
  );

  return (
    <div ref={root}>
      {/* ---------- Hero: sticky color plate ---------- */}
      <section className="sticky top-0 z-0 h-[100svh] min-h-[640px] overflow-hidden bg-sun" aria-labelledby="hero-title">
        <CropMarks />
        <div className="hero-inner container-page flex h-full flex-col items-center pt-[calc(var(--nav-h)+var(--nav-top)+7vh)] text-center">
          <h1 id="hero-title" className="t-mega relative" data-intro>
            <span className="sr-only">{HEADLINE.join(" ")}</span>
            <span aria-hidden className="relative block">
              {/* Registration plates: cyan + red, multiplied, land on the ink plate */}
              <span className="plate plate-c absolute inset-0 text-cyan mix-blend-multiply">
                {HEADLINE.map((l) => (
                  <span key={l} className="block">{l}</span>
                ))}
              </span>
              <span className="plate plate-m absolute inset-0 text-press mix-blend-multiply">
                {HEADLINE.map((l) => (
                  <span key={l} className="block">{l}</span>
                ))}
              </span>
              <span className="plate plate-k relative block text-ink">
                {HEADLINE.map((l) => (
                  <span key={l} className="hero-line block">{l}</span>
                ))}
              </span>
            </span>
          </h1>
          <p className="hero-sub t-body-lg mt-6 max-w-[34ch] text-ink-2 md:mt-8" data-intro>
            A premium daily paper edited for one reader: you. Ten sourced stories, six minutes, and then it ends.
          </p>

          <form
            className="hero-form mt-7 flex w-full max-w-[560px] flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:rounded-[var(--r-sm)] sm:bg-sheet sm:p-2"
            action="/start"
            onSubmit={() => setName(name.trim())}
            data-intro
          >
            <label className="flex min-h-[56px] flex-1 items-center gap-2 rounded-[var(--r-sm)] bg-sheet px-4 transition-shadow focus-within:shadow-[0_0_0_2px_rgb(28_29_26/0.2)] text-[1.0625rem] tracking-[-0.02em] sm:min-h-0 sm:px-3">
              <span className="text-ink-3">The</span>
              <input
                name="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value.slice(0, 18));
                  setTyped(true);
                }}
                placeholder="Your name"
                autoComplete="given-name"
                spellCheck={false}
                aria-label="Your first name, for your paper's masthead"
                className="w-full min-w-0 bg-transparent font-medium text-ink outline-none placeholder:text-ink-3/70"
              />
              <span className="text-ink-3">Times</span>
            </label>
            <PillButton type="submit" tone="press" look="solid" className="justify-between sm:justify-start">
              Print my paper
            </PillButton>
          </form>
        </div>
      </section>

      {/* ---------- Intro panel: slides over the hero; the paper straddles the seam ---------- */}
      <section className="intro-panel panel-top relative z-10 bg-newsprint pb-24 md:pb-40" aria-label="What Endpaper is">
        <div className="container-page grid gap-10 md:grid-cols-12 md:gap-6">
          <div className="order-2 md:order-1 md:col-span-5 md:pt-[22vh]">
            <p className="t-md max-w-[22ch]">
              Every night we read the news so you don’t have to, and every morning at 7 we print a paper made for one
              reader: you.
            </p>
            <p className="t-body mt-6 max-w-[42ch] text-ink-2">
              Each story is checked across outlets and comes with a line on what it means for your city, your work and
              your money. When you reach the end, you’re done for the day.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <PillButton href="#how" tone="press" look="solid">
                How it works
              </PillButton>
              <PillButton href="/paper" tone="sun">
                Read today’s sample
              </PillButton>
            </div>
          </div>
          <div className="order-1 mt-6 md:order-2 md:col-span-6 md:col-start-7 md:-mt-[12svh]">
            <div className="md:sticky md:top-[calc(var(--nav-h)+var(--nav-top)+24px)]">
              <div className="hero-paper mx-auto w-full max-w-[560px]" data-intro>
                <div className="hero-paper-tilt origin-bottom">
                  <FrontPage data={{ ...paper, paperName }} crop animateMasthead={typed} />
                </div>
              </div>
              <p className="t-sm mx-auto mt-4 max-w-[560px] text-ink-3">
                {name.trim() ? `A real front page from this morning’s press, set for ${name.trim()}.` : "A real front page from this morning’s press. Type your name above and it’s yours."}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

