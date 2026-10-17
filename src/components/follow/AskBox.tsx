"use client";

import { useState } from "react";
import Link from "next/link";
import { ask, followQuestion, type AskResult } from "./api";
import { PillButton } from "@/components/ui/PillButton";
import { Check } from "@/components/ui/icons";

const EXAMPLES = ["What happened with oil prices this week?", "Is the Fed likely to cut rates?", "Who is ahead in the Premier League?"];

type FollowState = "idle" | "busy" | "done" | "plus" | "error";

/** Ask the news a question. The answer comes only from stories in the press, with sources; follow it for updates. */
export function AskBox() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AskResult | null>(null);
  const [asked, setAsked] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [follow, setFollow] = useState<FollowState>("idle");

  const submit = async (question: string) => {
    const text = question.trim();
    if (text.length < 4) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setFollow("idle");
    setAsked(text);
    try {
      setResult(await ask(text));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t answer that right now.");
    } finally {
      setBusy(false);
    }
  };

  const doFollow = async () => {
    setFollow("busy");
    const r = await followQuestion(asked);
    setFollow(r.ok ? "done" : r.needsPlus ? "plus" : "error");
  };

  return (
    <section className="rounded-[var(--r-lg)] bg-newsprint p-5 md:p-7" aria-labelledby="ask-title">
      <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
        <h2 id="ask-title" className="t-md">
          Ask your paper
        </h2>
        <p className="t-sm text-ink-3">Answered only from today’s reporting, with sources. Follow it and we’ll tell you when it changes.</p>
      </div>
      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(q);
        }}
      >
        <input
          className="field flex-1"
          value={q}
          onChange={(e) => setQ(e.target.value.slice(0, 300))}
          placeholder={EXAMPLES[0]}
          aria-label="Your question"
          enterKeyHint="send"
        />
        <PillButton type="submit" tone="press" look="solid" disabled={busy || q.trim().length < 4}>
          {busy ? "Reading the press…" : "Ask"}
        </PillButton>
      </form>
      {!result && !busy && !error && (
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((x) => (
            <button
              key={x}
              type="button"
              className="chip !h-9"
              data-tone="line"
              onClick={() => {
                setQ(x);
                void submit(x);
              }}
            >
              {x}
            </button>
          ))}
        </div>
      )}

      <div aria-live="polite">
        {busy && <div className="mt-5 h-24 animate-pulse rounded-[var(--r-md)] bg-sheet" aria-busy="true" />}
        {error && (
          <p className="t-body mt-5 rounded-[var(--r-sm)] bg-sheet p-4" role="alert">
            {error}
          </p>
        )}
        {result && (
          <div className="mt-5 rounded-[var(--r-md)] bg-sheet p-5 md:p-6">
            <p className="t-sm text-ink-3">{result.covered ? "From the press" : "Not in the news yet"}</p>
            <p className="mt-2 font-serif text-[1.2rem] leading-[1.5] text-pretty">
              {result.sentences?.length
                ? result.sentences.map((x, i) => (
                    <span key={i}>
                      {x.text}
                      {x.sources.length > 0 && <sup className="ml-[1px] font-sans text-[0.62em] font-semibold text-[#1d6fb0]">{x.sources.join(",")}</sup>}{" "}
                    </span>
                  ))
                : result.answer}
            </p>
            {result.sources.length > 0 && (
              <ol className="mt-4 space-y-1.5">
                {result.sources.map((s, i) => (
                  <li key={s.url + i} className="t-sm">
                    <span className="t-num text-ink-3">{i + 1}.</span>{" "}
                    <a href={s.url} target="_blank" rel="noreferrer" className="underline decoration-[var(--line-2)] underline-offset-4 hover:decoration-current">
                      {s.headline ?? s.name}
                    </a>{" "}
                    <span className="text-ink-3">{s.headline ? s.name : ""}</span>
                  </li>
                ))}
              </ol>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {follow === "done" ? (
                <span className="chip !h-10 !px-4" data-tone="leaf">
                  <Check size={12} /> Following. Updates arrive in your paper
                </span>
              ) : follow === "plus" ? (
                <span className="t-sm">
                  Free papers follow 3 questions.{" "}
                  <Link href="/pricing" className="underline underline-offset-4">
                    Endpaper+ follows as many as you like
                  </Link>
                  .
                </span>
              ) : (
                <PillButton tone="sun" size="sm" onClick={doFollow} disabled={follow === "busy"}>
                  {follow === "busy" ? "Following…" : result.covered ? "Follow for updates" : "Tell me when it’s news"}
                </PillButton>
              )}
              {follow === "error" && <span className="t-sm text-ink-3">Couldn’t follow that right now. Try again.</span>}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
