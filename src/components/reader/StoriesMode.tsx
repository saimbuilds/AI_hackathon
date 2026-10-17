"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import type { Edition, StorySlot } from "@/types/edition";
import { Close, Chevron } from "@/components/ui/icons";
import { TrustChip } from "./StoryItem";
import { track } from "./track";

const PLATES = ["var(--sun)", "var(--sheet)", "var(--cyan)", "var(--newsprint-2)", "var(--leaf)"];

/** Phone reading: one story per screen. Tap right for next, left for back, swipe up to open, left to skip. */
export function StoriesMode({
  edition,
  slots,
  onClose,
  onSeen,
  onOpenStory,
}: {
  edition: Edition;
  slots: StorySlot[];
  onClose: () => void;
  onSeen: (s: StorySlot) => void;
  onOpenStory: (s: StorySlot) => void;
}) {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  const enteredAt = useRef(0);
  const total = slots.length;
  const done = i >= total;
  const s = slots[Math.min(i, total - 1)];

  const go = (n: number) => {
    const cur = slots[i];
    if (cur && n > i && Date.now() - enteredAt.current < 2000) track(edition.id, "skip", cur.storyId);
    setDir(n > i ? 1 : -1);
    setI(Math.max(0, Math.min(total, n)));
    enteredAt.current = Date.now();
  };

  useEffect(() => {
    if (slots[i]) {
      onSeen(slots[i]);
      track(edition.id, "impression", slots[i].storyId);
    }
    if (i === total) track(edition.id, "caught_up");
  }, [i, slots, total, edition.id, onSeen]);

  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(i + 1);
      if (e.key === "ArrowLeft") go(i - 1);
      if (e.key === "ArrowUp" && slots[i]) onOpenStory(slots[i]);
      if (e.key === "Escape") onClose();
    };
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  });

  const onPointerUp = (e: React.PointerEvent) => {
    const st = start.current;
    start.current = null;
    if (!st) return;
    const dx = e.clientX - st.x;
    const dy = e.clientY - st.y;
    if (dy < -70 && Math.abs(dy) > Math.abs(dx) && slots[i]) return onOpenStory(slots[i]);
    if (dx < -60 && Math.abs(dx) > Math.abs(dy)) return go(i + 1);
    if (dx > 60 && Math.abs(dx) > Math.abs(dy)) return go(i - 1);
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
      if ((e.target as HTMLElement).closest("button,a")) return;
      go(e.clientX < innerWidth * 0.3 ? i - 1 : i + 1);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col bg-ink text-ink select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Stories"
      style={{ touchAction: "none" }}
      onPointerDown={(e) => (start.current = { x: e.clientX, y: e.clientY, t: Date.now() })}
      onPointerUp={onPointerUp}
    >
      <div className="flex gap-1 px-3 pt-[max(12px,env(safe-area-inset-top))]" aria-hidden>
        {slots.map((x, n) => (
          <span key={x.storyId} className="h-[3px] flex-1 overflow-hidden rounded-full bg-[rgb(236_233_225/0.25)]">
            <span className="block h-full bg-[var(--on-dark)] transition-[width] duration-300" style={{ width: n < i ? "100%" : n === i ? "50%" : "0%" }} />
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between px-4 py-3 text-[var(--on-dark)]">
        <span className="font-blackletter text-[1.35rem]" translate="no">
          {edition.paperName}
        </span>
        <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full bg-[rgb(236_233_225/0.12)]" aria-label="Close stories">
          <Close />
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden px-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          {!done ? (
            <motion.article
              key={s.storyId}
              custom={dir}
              initial={{ x: `${dir * 40}%`, opacity: 0, rotate: dir * 2 }}
              animate={{ x: 0, opacity: 1, rotate: 0 }}
              exit={{ x: `${dir * -30}%`, opacity: 0, rotate: dir * -2, transition: { duration: 0.2 } }}
              transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
              className="absolute inset-x-3 top-0 bottom-[max(12px,env(safe-area-inset-bottom))] flex flex-col justify-between rounded-[var(--r-lg)] p-6"
              style={{ background: PLATES[i % PLATES.length] }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip">{s.kicker}</span>
                <TrustChip s={s} size="sm" />
              </div>
              <div>
                <h2 className="font-serif text-[clamp(2rem,9vw,2.8rem)] leading-[1] font-medium tracking-[-0.03em] text-balance">{s.headline}</h2>
                <p className="mt-4 font-serif text-[1.15rem] leading-[1.4] text-ink-2">{s.dek}</p>
                {s.forYou && (
                  <p className="t-body mt-5 rounded-[var(--r-sm)] bg-[rgb(255_255_255/0.6)] p-4">
                    <b className="font-semibold">For you.</b> {s.forYou}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="t-sm t-num text-ink-2">
                  {i + 1} of {total}
                </span>
                <button type="button" className="pbtn" data-size="sm" onClick={() => onOpenStory(s)}>
                  <span className="pbtn__label">Read the story</span>
                  <span className="pbtn__disc" aria-hidden>
                    <Chevron className="-rotate-90" />
                  </span>
                </button>
              </div>
            </motion.article>
          ) : (
            <motion.div
              key="done"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="absolute inset-x-3 top-0 bottom-[max(12px,env(safe-area-inset-bottom))] flex flex-col items-center justify-center rounded-[var(--r-lg)] bg-sun p-6 text-center"
            >
              <p className="text-[2.6rem] font-semibold tracking-[-0.04em] text-[#c2321a]">— 30 —</p>
              <h2 className="t-xl mt-4">You’re all caught up.</h2>
              <p className="t-body mt-4 max-w-[28ch] text-ink-2">Three things to remember and today’s three questions are on the last page.</p>
              <Link href="/paper/end" className="pbtn mt-8" data-tone="press" data-look="solid">
                <span className="pbtn__label">Finish my paper</span>
                <span className="pbtn__disc" aria-hidden>
                  <Chevron />
                </span>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
