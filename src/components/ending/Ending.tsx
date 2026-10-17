"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Edition } from "@/types/edition";
import { Nav } from "@/components/ui/Nav";
import { PillButton } from "@/components/ui/PillButton";
import { Check, Close } from "@/components/ui/icons";
import { NextEdition } from "@/components/home/NextEdition";
import { track } from "@/components/reader/track";
import { gsap, useGSAP, prefersReducedMotion } from "@/components/motion/gsap";
import { useStored, writeStored } from "@/components/ui/useStored";
import { SavePaper } from "@/components/session/SavePaper";

type Answer = { pick: number; correct: boolean };

/** Counts consecutive finished editions. Recording happens once per edition date; the count is read back from storage. */
function useStreak(editionDate: string) {
  const [raw] = useStored("ep-streak");
  useEffect(() => {
    try {
      const prev = JSON.parse(localStorage.getItem("ep-streak") ?? "{}") as { last?: string; n?: number };
      if (prev.last === editionDate) return;
      const y = new Date(`${editionDate}T00:00:00Z`);
      y.setUTCDate(y.getUTCDate() - 1);
      const n = prev.last === y.toISOString().slice(0, 10) ? (prev.n ?? 0) + 1 : 1;
      writeStored("ep-streak", JSON.stringify({ last: editionDate, n }));
    } catch {}
  }, [editionDate]);
  try {
    const v = raw ? (JSON.parse(raw) as { last?: string; n?: number }) : null;
    return v?.last === editionDate ? (v.n ?? 1) : null;
  } catch {
    return null;
  }
}

/** The last page: closure, recall, the shared Daily 3, and a reason to come back tomorrow. */
export function Ending({ edition, canSave = false }: { edition: Edition; canSave?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const quiz = edition.dailyThree;
  const [answers, setAnswers] = useState<(Answer | null)[]>(() => quiz.map(() => null));
  const [copied, setCopied] = useState(false);
  const localStreak = useStreak(edition.date);
  // The server counts the streak once per local day from the caught_up event; prefer it when it has answered.
  const [serverStreak] = useStored("ep-server-streak");
  const streak = serverStreak && +serverStreak > 0 ? +serverStreak : localStreak;
  const finished = answers.every(Boolean);
  const score = answers.filter((a) => a?.correct).length;

  useEffect(() => track(edition.id, "caught_up"), [edition.id]);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.from(".end-title > *", { yPercent: 30, opacity: 0, duration: 1, stagger: 0.08 }, 0.1)
        .from(".end-stamp", { scale: 1.8, rotate: -24, opacity: 0, duration: 0.55, ease: "back.out(1.6)" }, 0.55)
        .from(".end-sub", { y: 14, opacity: 0, duration: 0.8 }, 0.8);
    },
    { scope: root },
  );

  const grid = answers.map((a) => (a ? (a.correct ? "🟩" : "🟥") : "⬜")).join("");
  const shareText = useMemo(
    () =>
      [
        `Endpaper #${edition.number} · 🧠 ${score}/${quiz.length}${streak ? ` · 🔥 ${streak}` : ""}`,
        grid,
        "",
        "3 things I learned this morning:",
        ...edition.threeThings.map((t, i) => `${i + 1}. ${t}`),
      ].join("\n"),
    [edition, score, quiz.length, streak, grid],
  );

  const answer = (qi: number, pick: number) => {
    if (answers[qi]) return;
    const correct = pick === quiz[qi].answer;
    setAnswers((prev) => prev.map((a, i) => (i === qi ? { pick, correct } : a)));
    track(edition.id, "quiz_answer", quiz[qi].storyId, { correct, kind: "daily3" });
  };

  return (
    <div ref={root} className="min-h-dvh bg-newsprint">
      <Nav cta={{ href: `/paper?e=${edition.id}`, label: "Back to the paper", short: "Paper" }} />
      <main id="main">
        {/* ---------- Closure ---------- */}
        <section className="panel-bottom relative bg-sun pt-[calc(var(--nav-h)+var(--nav-top)+12vh)] pb-[14vh]">
          <div className="container-page flex flex-col items-center text-center">
            <span className="end-stamp inline-block -rotate-[6deg] rounded-[var(--r-sm)] border-[3px] border-[#c2321a] px-5 py-2 text-[clamp(2rem,1.4rem+2.6vw,3.6rem)] leading-none font-semibold tracking-[-0.04em] text-[var(--kicker)]">
              Done for today
            </span>
            <h1 className="end-title t-mega mt-10 max-w-[12ch]">
              <span className="block">You’re all</span>
              <span className="block">caught up.</span>
            </h1>
            <p className="end-sub t-body-lg mt-8 max-w-[40ch] text-ink-2">
              Edition No. {edition.number} is finished. Nothing else is waiting for you today, and that’s the point.
            </p>
          </div>
        </section>

        {/* ---------- Three things ---------- */}
        <section className="container-page py-24 md:py-32" aria-labelledby="three-title">
          <h2 id="three-title" className="t-xl max-w-[16ch]">
            Three things to remember
          </h2>
          <ol className="mt-12 grid gap-3 md:grid-cols-3">
            {edition.threeThings.map((t, i) => (
              <li key={t} className="flex min-h-[260px] flex-col justify-between rounded-[var(--r-lg)] p-7 md:p-8" style={{ background: ["var(--sheet)", "var(--cyan)", "var(--leaf)"][i] }}>
                <span className="text-[4.5rem] leading-[0.8] font-medium tracking-[-0.07em]">{i + 1}</span>
                <p className="mt-8 font-serif text-[1.45rem] leading-[1.22] font-medium tracking-[-0.015em] text-balance">{t}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- The Daily 3 ---------- */}
        <section className="panel relative mx-[var(--gutter)] bg-ink py-20 text-[var(--on-dark)] md:py-28" aria-labelledby="daily-title">
          <div className="mx-auto max-w-[880px] px-5 md:px-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <h2 id="daily-title" className="t-xl text-[var(--on-dark)]">
                The Daily 3
              </h2>
              <p className="t-body max-w-[34ch] text-[color-mix(in_oklab,var(--on-dark)_70%,transparent)]">
                The same three questions for every Endpaper reader today. No spoilers when you share.
              </p>
            </div>

            <ol className="mt-12 space-y-4">
              {quiz.map((q, qi) => {
                const a = answers[qi];
                return (
                  <li key={q.q} className="rounded-[var(--r-md)] bg-[rgb(236_233_225/0.07)] p-6 md:p-8">
                    <p className="t-sm text-[color-mix(in_oklab,var(--on-dark)_60%,transparent)]">
                      Question {qi + 1} of {quiz.length}
                    </p>
                    <h3 className="t-md mt-2 text-[var(--on-dark)]">{q.q}</h3>
                    <div className="mt-6 grid gap-2 sm:grid-cols-2">
                      {q.options.map((o, oi) => {
                        const isAnswer = oi === q.answer;
                        const picked = a?.pick === oi;
                        const state = !a ? "idle" : isAnswer ? "right" : picked ? "wrong" : "dim";
                        return (
                          <button
                            key={o}
                            type="button"
                            disabled={!!a}
                            onClick={() => answer(qi, oi)}
                            className={`flex min-h-[56px] items-center justify-between gap-3 rounded-[var(--r-sm)] px-5 text-left text-[1.05rem] font-medium tracking-[-0.02em] transition-[background-color,transform,opacity] duration-200 active:scale-[0.98] ${
                              state === "idle"
                                ? "bg-sheet text-ink hover:bg-sun"
                                : state === "right"
                                  ? "bg-leaf text-ink"
                                  : state === "wrong"
                                    ? "bg-press text-ink"
                                    : "bg-sheet text-ink opacity-40"
                            }`}
                          >
                            {o}
                            {state === "right" && <Check />}
                            {state === "wrong" && <Close />}
                          </button>
                        );
                      })}
                    </div>
                    {a && (
                      <p className="t-sm mt-4 text-[color-mix(in_oklab,var(--on-dark)_75%,transparent)]" role="status">
                        {a.correct ? "Right." : `Not quite. It was ${q.options[q.answer]}.`}{" "}
                        <Link href={`/paper?e=${edition.id}&story=${q.storyId}`} className="underline underline-offset-4">
                          Read the story again
                        </Link>
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>

            {/* ---------- Score, streak, share ---------- */}
            <div className={`mt-10 grid gap-3 md:grid-cols-2 ${finished ? "" : "pointer-events-none opacity-40"}`} aria-live="polite">
              <div className="rounded-[var(--r-md)] bg-sun p-7 text-ink">
                <p className="t-sm">Endpaper #{edition.number}</p>
                <p className="t-num mt-3 text-[clamp(3.6rem,2.6rem+3vw,5.5rem)] leading-[0.85] font-medium tracking-[-0.06em]">
                  {finished ? `${score}/${quiz.length}` : "–/3"}
                </p>
                <div className="mt-5 flex gap-1.5" aria-label={`${score} of ${quiz.length} correct`}>
                  {answers.map((x, i) => (
                    <span key={i} className={`h-9 w-9 rounded-[var(--r-xs)] ${x ? (x.correct ? "bg-leaf" : "bg-press") : "bg-[rgb(28_29_26/0.12)]"}`} />
                  ))}
                </div>
                <p className="t-body mt-5">
                  {streak ? (
                    <>
                      <b className="font-semibold">Day {streak}</b> of your reading streak.
                    </>
                  ) : (
                    " "
                  )}
                </p>
              </div>
              <div className="flex flex-col justify-between gap-6 rounded-[var(--r-md)] bg-sheet p-7 text-ink">
                <div>
                  <p className="t-md">Share it without spoilers</p>
                  <pre className="t-sm mt-3 overflow-hidden font-sans whitespace-pre-wrap text-ink-2">{shareText.split("\n").slice(0, 2).join("\n")}</pre>
                </div>
                <div className="flex flex-wrap gap-2">
                  <PillButton
                    href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                    target="_blank"
                    rel="noreferrer"
                    tone="leaf"
                    look="solid"
                    size="sm"
                    onClick={() => track(edition.id, "share", undefined, { channel: "whatsapp" })}
                  >
                    Send on WhatsApp
                  </PillButton>
                  <button
                    type="button"
                    className="tbtn"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(shareText);
                        setCopied(true);
                        track(edition.id, "share", undefined, { channel: "link" });
                        setTimeout(() => setCopied(false), 1800);
                      } catch {}
                    }}
                  >
                    {copied ? "Copied" : "Copy text"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Tomorrow ---------- */}
        <section className="container-page grid gap-12 py-24 md:grid-cols-12 md:py-32" aria-labelledby="tomorrow-title">
          <div className="md:col-span-5">
            <h2 id="tomorrow-title" className="t-xl">
              Tomorrow in your paper
            </h2>
            <div className="mt-8">
              <NextEdition />
            </div>
            {canSave && (
              <div className="mt-10 max-w-[460px]">
                <SavePaper />
              </div>
            )}
          </div>
          <ul className="space-y-3 md:col-span-7">
            {edition.tomorrow.map((t) => (
              <li key={t} className="flex items-start gap-4 rounded-[var(--r-md)] bg-sheet p-6">
                <span className="mt-2 h-2.5 w-2.5 flex-none rounded-full bg-press" aria-hidden />
                <p className="font-serif text-[1.3rem] leading-[1.3] font-medium tracking-[-0.01em]">{t}</p>
              </li>
            ))}
            <li className="pt-4">
              <PillButton href="/" tone="sun" look="solid">
                Close the paper
              </PillButton>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
