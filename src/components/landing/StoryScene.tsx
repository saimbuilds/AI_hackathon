"use client";

import { useRef, useState } from "react";
import type { StorySlot } from "@/types/edition";
import { ScrollTrigger, useGSAP } from "@/components/motion/gsap";
import { TrustLine } from "./TrustLine";

const SUPERSCRIPT = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
const sup = (n: number) => String(n).split("").map((d) => SUPERSCRIPT[Number(d)]).join("");

const STEPS = [
  {
    kicker: "Every sentence has a receipt",
    title: "Checked across outlets, cited like a footnote.",
    text: "Each line links to the article it came from. A second model checks every sentence against its sources and drops anything it can’t support.",
  },
  {
    kicker: "Written for you",
    title: "A line on what it means for you.",
    text: "Not a summary everyone gets. The editor connects the story to your work, your city and what you follow, and stays quiet when there’s no real link.",
  },
  {
    kicker: "It remembers",
    title: "Developing stories pick up where you left off.",
    text: "If you read about it on Tuesday, Thursday’s paper tells you only what changed, and what we still don’t know.",
  },
];

export function StoryScene({ story }: { story: StorySlot }) {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useGSAP(
    () => {
      const steps = Array.from(root.current!.querySelectorAll<HTMLElement>("[data-step]"));
      steps.forEach((step, i) =>
        ScrollTrigger.create({
          trigger: step,
          start: "top 55%",
          end: "bottom 55%",
          onToggle: (self) => self.isActive && setActive(i),
        }),
      );
    },
    { scope: root },
  );

  const body = story.body.slice(0, 3);
  return (
    <section ref={root} aria-labelledby="story-title" className="relative border-t border-rule">
      <div className="page grid grid-cols-12 gap-x-[var(--col-gap)] py-[clamp(4rem,10vw,9rem)]">
        <div className="col-span-12 md:col-span-5">
          <p className="t-kicker text-accent" data-reveal>
            Inside every story
          </p>
          <h2 id="story-title" className="t-headline-xl mt-5 max-w-[14ch]" data-reveal>
            Fewer stories. Every one of them earned.
          </h2>
          <ol className="mt-10 md:mt-16">
            {STEPS.map((s, i) => (
              <li
                key={s.kicker}
                data-step
                className={`border-t py-8 transition-colors duration-300 md:min-h-[46vh] ${
                  active === i ? "border-ink" : "border-rule"
                }`}
              >
                <p className={`t-kicker transition-colors duration-300 ${active === i ? "text-accent" : "text-ink-3"}`}>
                  {String(i + 1).padStart(2, "0")} · {s.kicker}
                </p>
                <h3
                  className={`t-headline-l mt-4 max-w-[20ch] transition-opacity duration-300 ${
                    active === i ? "opacity-100" : "opacity-40"
                  }`}
                >
                  {s.title}
                </h3>
                <p
                  className={`t-body mt-4 max-w-[42ch] text-ink-2 transition-opacity duration-300 ${
                    active === i ? "opacity-100" : "opacity-40"
                  }`}
                >
                  {s.text}
                </p>
              </li>
            ))}
          </ol>
        </div>

        {/* The story, as the reader sees it */}
        <div className="col-span-12 mt-12 md:col-span-7 md:mt-0">
          <article
            aria-label="Example story from a sample edition"
            className="sticky top-[10vh] border border-rule bg-paper-raised p-[clamp(1.25rem,3vw,2.5rem)]"
          >
            <div className="flex items-center justify-between gap-4">
              <p className="t-kicker text-ink-3">{story.kicker}</p>
              <p
                className={`t-kicker rounded-[2px] px-2 py-1 transition-colors duration-300 ${
                  active === 2 ? "bg-accent text-paper" : "text-ink-3"
                }`}
              >
                {story.developing ? `Developing · Day ${story.developing.dayCount}` : "Developing"}
              </p>
            </div>
            <h3 className="t-headline-l mt-4">{story.headline}</h3>
            <p className="t-dek mt-3 !text-[1.08rem]">{story.dek}</p>
            <span className="rule-hair mt-6" />

            {active === 2 && story.developing ? (
              <p className="mt-6 border-l-2 border-accent pl-4 font-serif text-[1.02rem] italic leading-[1.5] text-ink-2">
                <span className="t-kicker not-italic text-accent">Since you last read</span>
                <br />
                {story.developing.sinceLastRead}
              </p>
            ) : null}

            <div className="mt-6 space-y-4">
              {body.map((sentence, i) => (
                <p key={i} className="t-body">
                  {sentence.text}
                  {sentence.sources.map((n) => (
                    <a
                      key={n}
                      href={story.sources[n - 1]?.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Source ${n}: ${story.sources[n - 1]?.name}`}
                      className={`ml-[1px] font-sans text-[0.8em] font-[600] transition-colors duration-300 ${
                        active === 0 ? "text-accent" : "text-ink-3"
                      }`}
                    >
                      {sup(n)}
                    </a>
                  ))}
                </p>
              ))}
            </div>

            {story.forYou ? (
              <div
                className={`mt-7 border-l-2 pl-4 transition-all duration-500 ${
                  active === 1 ? "border-accent bg-accent/[0.06] py-3" : "border-rule py-0"
                }`}
              >
                <p className="t-kicker text-accent">For you</p>
                <p className="mt-2 font-sans text-[0.95rem] leading-[1.5] text-ink">{story.forYou}</p>
              </div>
            ) : null}

            <span className="rule-hair mt-7" />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <TrustLine slot={story} />
              <p className="t-meta">
                {story.sources.length} sources · {Array.from(new Set(story.sources.map((s) => s.name))).join(", ")}
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
