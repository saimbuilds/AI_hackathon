"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform, animate } from "motion/react";

export type DeckCard = { storyId: string; headline: string; dek: string; kicker: string; outlets: number };
export type SwipeAction = "love" | "yes" | "no";

const STAMP: Record<SwipeAction, { label: string; color: string }> = {
  yes: { label: "Keep", color: "var(--leaf-ink)" },
  love: { label: "Love", color: "#c2321a" },
  no: { label: "Pass", color: "var(--ink-3)" },
};

function Card({ card, onDone, depth }: { card: DeckCard; onDone: (a: SwipeAction) => void; depth: number }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-14, 14]);
  const keep = useTransform(x, [20, 120], [0, 1]);
  const pass = useTransform(x, [-120, -20], [1, 0]);
  const love = useTransform(y, [-120, -30], [1, 0]);

  const fling = (a: SwipeAction) => {
    const to = a === "yes" ? { x: 520, y: 40 } : a === "no" ? { x: -520, y: 40 } : { x: 0, y: -620 };
    animate(x, to.x, { duration: 0.32, ease: [0.23, 1, 0.32, 1] });
    animate(y, to.y, { duration: 0.32, ease: [0.23, 1, 0.32, 1] }).then(() => onDone(a));
  };

  useEffect(() => {
    if (depth !== 0) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as Element | null)?.closest?.("input,textarea")) return;
      if (e.key === "ArrowRight") fling("yes");
      if (e.key === "ArrowLeft") fling("no");
      if (e.key === "ArrowUp") fling("love");
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  return (
    <motion.div
      className="absolute inset-0 flex cursor-grab touch-none flex-col justify-between rounded-[var(--r-lg)] bg-sheet p-7 active:cursor-grabbing md:p-8"
      style={{ x, y, rotate, zIndex: 10 - depth }}
      initial={{ scale: 0.94, y: 18, opacity: 0 }}
      animate={{ scale: 1 - depth * 0.04, y: depth * 14, opacity: depth > 2 ? 0 : 1 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ type: "spring", stiffness: 300, damping: 34 }}
      drag={depth === 0}
      dragSnapToOrigin
      dragElastic={0.9}
      onDragEnd={(_, info) => {
        if (info.offset.y < -110 && Math.abs(info.offset.x) < 120) fling("love");
        else if (info.offset.x > 110 || info.velocity.x > 600) fling("yes");
        else if (info.offset.x < -110 || info.velocity.x < -600) fling("no");
      }}
      aria-hidden={depth !== 0}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="chip !bg-newsprint">{card.kicker}</span>
        <span className="t-xs text-ink-3">
          {card.outlets} {card.outlets === 1 ? "outlet" : "outlets"}
        </span>
      </div>
      <div>
        <h3 className="font-serif text-[clamp(1.7rem,1.3rem+1.4vw,2.35rem)] leading-[1.02] font-medium tracking-[-0.025em] text-balance">{card.headline}</h3>
        <p className="mt-4 line-clamp-3 font-serif text-[1.08rem] leading-[1.4] text-ink-2">{card.dek}</p>
      </div>
      {depth === 0 && (
        <>
          <motion.span style={{ opacity: keep, borderColor: STAMP.yes.color, color: STAMP.yes.color }} className="absolute top-7 left-7 rotate-[-10deg] rounded-[var(--r-xs)] border-[3px] px-3 py-1 text-[1.4rem] font-semibold">
            Keep
          </motion.span>
          <motion.span style={{ opacity: pass, borderColor: STAMP.no.color, color: STAMP.no.color }} className="absolute top-7 right-7 rotate-[10deg] rounded-[var(--r-xs)] border-[3px] px-3 py-1 text-[1.4rem] font-semibold">
            Pass
          </motion.span>
          <motion.span style={{ opacity: love, borderColor: STAMP.love.color, color: STAMP.love.color }} className="absolute top-1/3 left-1/2 -translate-x-1/2 rotate-[-4deg] rounded-[var(--r-xs)] border-[3px] px-3 py-1 text-[1.6rem] font-semibold">
            Love
          </motion.span>
        </>
      )}
      {/* Buttons are the gesture's equivalent, for keyboard, screen reader and mouse users */}
      {depth === 0 && (
        <div className="mt-6 grid grid-cols-3 gap-2" onPointerDownCapture={(e) => e.stopPropagation()}>
          <button type="button" className="chip !h-12 justify-center !bg-newsprint text-[0.95rem]" onClick={() => fling("no")}>
            Pass
          </button>
          <button type="button" className="chip !h-12 justify-center text-[0.95rem]" data-tone="sun" onClick={() => fling("love")}>
            Love
          </button>
          <button type="button" className="chip !h-12 justify-center text-[0.95rem]" data-tone="leaf" onClick={() => fling("yes")}>
            Keep
          </button>
        </div>
      )}
    </motion.div>
  );
}

/** Twelve real headlines. Right = keep, left = pass, up = love. Buttons and arrow keys do the same. */
export function SwipeDeck({ cards, onSwipe }: { cards: DeckCard[]; onSwipe: (card: DeckCard, a: SwipeAction) => void }) {
  const [i, setI] = useState(0);
  const left = cards.slice(i, i + 3);
  return (
    <div>
      <div className="relative mx-auto h-[440px] w-full max-w-[460px]">
        <AnimatePresence>
          {left.map((c, d) => (
            <Card
              key={c.storyId}
              card={c}
              depth={d}
              onDone={(a) => {
                onSwipe(c, a);
                setI((n) => n + 1);
              }}
            />
          )).reverse()}
        </AnimatePresence>
        {i >= cards.length && (
          <div className="absolute inset-0 grid place-items-center rounded-[var(--r-lg)] bg-sheet p-8 text-center">
            <p className="t-md">That’s all twelve. Your editor has a good idea of you now.</p>
          </div>
        )}
      </div>
      <p className="t-sm mt-4 text-center text-ink-3" aria-live="polite">
        {Math.min(i, cards.length)} of {cards.length}. Drag, tap a button, or use the arrow keys.
      </p>
    </div>
  );
}
