"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { StorySlot } from "@/types/edition";
import { LESS_REASONS } from "@/types/events";
import { Close, Check, Plus } from "@/components/ui/icons";
import { TrustChip } from "./StoryItem";

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const sup = (n: number) => String(n).split("").map((d) => SUP[+d]).join("");
const REASON_LABEL: Record<(typeof LESS_REASONS)[number], string> = {
  topic: "Not my topic",
  source: "Don’t trust the source",
  "too-long": "Too long",
  "already-knew": "Already knew it",
};

type Props = {
  story: StorySlot | null;
  saved: boolean;
  onClose: () => void;
  onAction: (type: "more" | "less" | "save" | "share" | "click_original", meta?: Record<string, unknown>) => void;
  onNext?: () => void;
  nextHeadline?: string;
};

/** The story, opened. A sheet from the right on desktop, from the bottom on phones. */
export function StoryDrawer({ story, saved, onClose, onAction, onNext, nextHeadline }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const [feedback, setFeedback] = useState<null | "more" | "less" | "less-done">(null);

  useEffect(() => {
    setFeedback(null);
    if (!story) return;
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>("button, a[href]");
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
      prev?.focus?.();
    };
  }, [story, onClose]);

  // Rendered only on the client (a story opens after hydration), so reading the viewport here is safe.
  const desk = typeof window !== "undefined" && matchMedia("(min-width: 768px)").matches;
  const off = desk ? { x: "105%", y: 0 } : { x: 0, y: "100%" };

  const shareText = story
    ? `${story.headline}\n\n${story.dek}\n\nFrom my Endpaper this morning: ${story.sources[0]?.url ?? ""}`
    : "";

  return (
    <AnimatePresence>
      {story && (
        <div className="fixed inset-0 z-[80]" role="presentation">
          <motion.button
            type="button"
            aria-label="Close story"
            className="absolute inset-0 cursor-default bg-[rgb(28_29_26/0.32)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.18 } }}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-title"
            tabIndex={-1}
            className="drawer absolute inset-x-2 bottom-2 top-[8svh] overflow-y-auto overscroll-contain rounded-[var(--r-lg)] bg-sheet outline-none md:inset-y-3 md:right-3 md:left-auto md:w-[min(620px,calc(100vw-24px))] md:rounded-[var(--r-md)]"
            initial={off}
            animate={{ x: 0, y: 0 }}
            exit={{ ...off, transition: { duration: 0.22, ease: [0.32, 0.72, 0, 1] } }}
            transition={{ duration: 0.34, ease: [0.32, 0.72, 0, 1] }}
            style={{ willChange: "transform" }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-sheet/95 px-6 pt-5 pb-3 backdrop-blur-[2px] md:px-9">
              <span className="text-[0.85rem] font-semibold text-[#c2321a]">{story.kicker}</span>
              <button type="button" onClick={onClose} className="menu-disc !h-10 !w-10 !bg-newsprint" aria-label="Close story">
                <Close />
              </button>
            </div>

            <article className="px-6 pb-10 md:px-9">
              <h2 id="drawer-title" className="font-serif text-[clamp(2rem,1.5rem+2vw,2.9rem)] leading-[1] font-medium tracking-[-0.03em] text-balance">
                {story.headline}
              </h2>
              <p className="mt-4 font-serif text-[1.25rem] leading-[1.4] text-ink-2 italic">{story.dek}</p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <TrustChip s={story} />
                <span className="t-sm text-ink-3">
                  {story.sources.length} {story.sources.length === 1 ? "source" : "sources"}, {Math.max(1, Math.round(story.readMinutes))} min
                </span>
              </div>

              {story.developing && (
                <p className="t-body mt-6 rounded-[var(--r-sm)] bg-newsprint p-4">
                  <b className="font-semibold">Since you last read, day {story.developing.dayCount}.</b> {story.developing.sinceLastRead}
                </p>
              )}
              {story.forYou && (
                <p className="t-body-lg mt-6 rounded-[var(--r-sm)] bg-sun p-5">
                  <b className="font-semibold">For you.</b> {story.forYou}
                </p>
              )}

              <div className="mt-7 space-y-4 font-serif text-[1.16rem] leading-[1.62] text-pretty">
                {story.body.map((b, i) => (
                  <p key={i}>
                    {b.text}
                    {b.sources.map((n) => {
                      const src = story.sources[n - 1];
                      return src ? (
                        <a
                          key={n}
                          href={src.url}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-[1px] font-sans text-[0.95em] font-semibold text-[#1d6fb0] no-underline hover:underline"
                          title={src.name}
                          onClick={() => onAction("click_original", { sourceIndex: n })}
                        >
                          {sup(n)}
                        </a>
                      ) : null;
                    })}
                  </p>
                ))}
              </div>

              <dl className="mt-8 grid gap-3">
                <div className="rounded-[var(--r-sm)] bg-newsprint p-4">
                  <dt className="t-sm font-semibold">Why it matters</dt>
                  <dd className="t-body mt-1 text-ink-2">{story.whyItMatters}</dd>
                </div>
                {story.trust.unknowns && (
                  <div className="rounded-[var(--r-sm)] bg-newsprint p-4">
                    <dt className="t-sm font-semibold">What we don’t know yet</dt>
                    <dd className="t-body mt-1 text-ink-2">{story.trust.unknowns}</dd>
                  </div>
                )}
                <div className="rounded-[var(--r-sm)] bg-newsprint p-4">
                  <dt className="t-sm font-semibold">Why you’re seeing this</dt>
                  <dd className="t-body mt-1 text-ink-2">{story.whyThis}</dd>
                </div>
              </dl>

              {story.world && story.world.length > 0 && (
                <section className="mt-9">
                  <h3 className="t-md">How the world covered it</h3>
                  <ul className="mt-4 divide-y divide-line border-y border-line">
                    {story.world.map((w) => (
                      <li key={w.url} className="py-3">
                        <a href={w.url} target="_blank" rel="noreferrer" className="group block">
                          <span className="t-sm text-ink-3">
                            {w.outlet}, {w.country}
                          </span>
                          <span className="mt-0.5 block font-serif text-[1.08rem] leading-[1.4] group-hover:underline">{w.line}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="mt-9">
                <h3 className="t-md">Sources</h3>
                <ol className="mt-4 space-y-2">
                  {story.sources.map((s, i) => (
                    <li key={s.url}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="t-body flex items-baseline gap-3 rounded-[var(--r-sm)] bg-newsprint px-4 py-3 hover:bg-newsprint-2"
                        onClick={() => onAction("click_original", { sourceIndex: i + 1 })}
                      >
                        <span className="t-num text-ink-3">{i + 1}</span>
                        <span className="flex-1">{s.name}</span>
                        <span className="t-sm text-ink-3">Read the original</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </section>

              {/* ---------- Actions: every one fires an event ---------- */}
              <section className="mt-9 rounded-[var(--r-md)] bg-newsprint p-4" aria-label="Teach your editor">
                <p className="t-sm px-1 text-ink-3">Teach your editor</p>
                {feedback === "less" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {LESS_REASONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        className="chip !h-10 !px-4 hover:bg-newsprint-2"
                        onClick={() => {
                          onAction("less", { reason: r });
                          setFeedback("less-done");
                        }}
                      >
                        {REASON_LABEL[r]}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="chip !h-11 !px-4"
                      data-tone={feedback === "more" ? "leaf" : undefined}
                      onClick={() => {
                        onAction("more");
                        setFeedback("more");
                      }}
                    >
                      {feedback === "more" ? <Check size={12} /> : <Plus size={12} />}
                      {feedback === "more" ? "You’ll see more like this" : "More like this"}
                    </button>
                    <button
                      type="button"
                      className="chip !h-11 !px-4"
                      onClick={() => setFeedback("less")}
                      disabled={feedback === "less-done"}
                    >
                      {feedback === "less-done" ? "Noted, less of this" : "Less like this"}
                    </button>
                    <button type="button" className="chip !h-11 !px-4" data-tone={saved ? "sun" : undefined} onClick={() => onAction("save")}>
                      {saved ? "Saved" : "Save"}
                    </button>
                    <a
                      className="chip !h-11 !px-4"
                      href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => onAction("share", { channel: "whatsapp" })}
                    >
                      Send on WhatsApp
                    </a>
                  </div>
                )}
              </section>

              {onNext && nextHeadline && (
                <button
                  type="button"
                  onClick={onNext}
                  className="mt-4 block w-full rounded-[var(--r-md)] bg-ink p-5 text-left text-[var(--on-dark)] transition-transform active:scale-[0.99]"
                >
                  <span className="t-sm opacity-70">Next story</span>
                  <span className="mt-1 block font-serif text-[1.35rem] leading-[1.15] font-medium">{nextHeadline}</span>
                </button>
              )}
            </article>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
