"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import type { BuildProgress } from "@/types/events";
import { BuildProgressSchema } from "@/types/events";
import { BRAND } from "@/lib/brand";
import { FrontPage, type PaperData } from "@/components/paper/FrontPage";
import { Nav } from "@/components/ui/Nav";
import { PillButton } from "@/components/ui/PillButton";
import { Check } from "@/components/ui/icons";
import { useSavedName } from "@/components/home/useSavedName";

type Counts = { articles: number; sources: number; stories: number; picked: number };
const STEP_ORDER = ["reading", "clustering", "picking", "layout", "note", "done"] as const;
type Step = (typeof STEP_ORDER)[number] | "queued" | "error";

const LABEL: Record<(typeof STEP_ORDER)[number], string> = {
  reading: "Reading overnight articles",
  clustering: "Grouping them into stories",
  picking: "Choosing yours",
  layout: "Setting the front page",
  note: "Writing your editor’s note",
  done: "Printed",
};

/** Counts tick toward their target so the numbers feel like a machine running. */
function useTicker(target: number, ms = 900) {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      const n = Math.round(a + (target - a) * e);
      setV(n);
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

// Real stream: POST /api/edition/build (SSE over fetch). Without a session or backend, a faithful simulation
// of the same steps, so the screen works offline and in demos.
async function* buildStream(forName: string): AsyncGenerator<BuildProgress> {
  const token = (() => {
    try {
      return localStorage.getItem("ep-token");
    } catch {
      return null;
    }
  })();
  if (token) {
    try {
      const res = await fetch("/api/edition/build", { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: "{}" });
      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) return;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const l of lines) {
            if (!l.startsWith("data:")) continue;
            const parsed = BuildProgressSchema.safeParse(JSON.parse(l.slice(5)));
            if (parsed.success) yield parsed.data;
          }
        }
      }
    } catch {}
  }
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  yield { step: "reading", articles: 1243, sources: 212 };
  await wait(900);
  yield { step: "reading", articles: 3214, sources: 530 };
  await wait(1100);
  yield { step: "clustering", stories: 311 };
  await wait(1300);
  yield { step: "picking", picked: 14, forName };
  await wait(1200);
  yield { step: "layout" };
  await wait(900);
  yield { step: "note" };
  await wait(900);
  yield { step: "done", editionId: "c038b80c-eb78-4317-ad6a-9eae883cee20" };
}

export function Press({ paper }: { paper: PaperData }) {
  const router = useRouter();
  const [name] = useSavedName();
  const [step, setStep] = useState<Step>("reading");
  const [counts, setCounts] = useState<Counts>({ articles: 0, sources: 0, stories: 0, picked: 0 });
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  const forName = name.trim() || "you";

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      for await (const ev of buildStream(forName)) {
        if (ev.step === "reading") setCounts((c) => ({ ...c, articles: ev.articles, sources: ev.sources }));
        if (ev.step === "clustering") setCounts((c) => ({ ...c, stories: ev.stories }));
        if (ev.step === "picking") setCounts((c) => ({ ...c, picked: ev.picked }));
        if (ev.step === "error") setError(ev.message);
        setStep(ev.step);
      }
    })();
  }, [forName]);

  const articles = useTicker(counts.articles);
  const sources = useTicker(counts.sources);
  const stories = useTicker(counts.stories);
  const picked = useTicker(counts.picked, 600);
  const at = STEP_ORDER.indexOf(step as (typeof STEP_ORDER)[number]);
  const progress = step === "done" ? 1 : Math.max(0.06, (at + 0.5) / STEP_ORDER.length);
  const done = step === "done";

  return (
    <div className="min-h-dvh bg-newsprint">
      <Nav cta={null} />
      <main id="main" className="grid min-h-dvh lg:grid-cols-2">
        <section className="flex flex-col justify-center px-[var(--gutter)] pt-[calc(var(--nav-h)+var(--nav-top)+40px)] pb-12 md:px-12 lg:px-16" aria-live="polite">
          <p className="t-sm text-ink-3">{done ? "Edition No. 12 is ready" : "The press is running"}</p>
          <h1 className="t-xl mt-3 max-w-[14ch]">{done ? `Your paper is ready${forName === "you" ? "" : `, ${forName}`}.` : `Printing ${forName === "you" ? "your" : `${forName}’s`} paper`}</h1>

          <dl className="mt-12 grid max-w-[560px] grid-cols-2 gap-3">
            {[
              { k: "Articles read", v: articles },
              { k: "Sources", v: sources },
              { k: "Stories found", v: stories },
              { k: `Picked for ${forName}`, v: picked },
            ].map((x, i) => (
              <div key={x.k} className="rounded-[var(--r-md)] p-5" style={{ background: i === 3 ? "var(--sun)" : "var(--sheet)" }}>
                <dt className="t-sm text-ink-3">{x.k}</dt>
                <dd className="t-num mt-2 text-[clamp(2.2rem,1.6rem+2vw,3.4rem)] leading-none font-medium tracking-[-0.05em]">{x.v.toLocaleString("en-GB")}</dd>
              </div>
            ))}
          </dl>

          <ol className="mt-10 max-w-[560px] space-y-2">
            {STEP_ORDER.slice(0, 5).map((s, i) => {
              const state = at > i || done ? "done" : at === i ? "now" : "todo";
              return (
                <li key={s} className={`t-body flex items-center gap-3 transition-opacity duration-300 ${state === "todo" ? "opacity-35" : ""}`}>
                  <span className={`grid h-6 w-6 flex-none place-items-center rounded-full ${state === "done" ? "bg-ink text-sun" : state === "now" ? "bg-press" : "bg-newsprint-3"}`}>
                    {state === "done" ? <Check size={11} /> : state === "now" ? <span className="h-2 w-2 animate-pulse rounded-full bg-ink" /> : null}
                  </span>
                  {LABEL[s]}
                </li>
              );
            })}
          </ol>

          {error && (
            <p className="t-body mt-8 max-w-[46ch] rounded-[var(--r-sm)] bg-sheet p-4" role="alert">
              The press stopped: {error}. Your paper will still print from today’s stored stories. <button className="tbtn" onClick={() => location.reload()}>Try again</button>
            </p>
          )}

          <div className="mt-10 min-h-[64px]">
            {done && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}>
                <PillButton tone="press" look="solid" size="lg" onClick={() => router.push("/paper")}>
                  Open my paper
                </PillButton>
              </motion.div>
            )}
          </div>
        </section>

        {/* ---------- The sheet coming off the roller ---------- */}
        <aside className="relative hidden overflow-hidden bg-ink lg:block" aria-hidden>
          <div className="sticky top-0 flex h-dvh flex-col items-center px-12 pt-[18vh]">
            <div className="relative z-10 h-6 w-full max-w-[640px] rounded-full bg-[#2b2c28] shadow-[inset_0_-3px_0_rgb(0_0_0/0.35)]" />
            <div className="relative -mt-3 w-full max-w-[560px] overflow-hidden">
              <motion.div initial={{ y: "-100%" }} animate={{ y: `${-100 + progress * 100}%` }} transition={{ duration: 1.1, ease: [0.65, 0, 0.35, 1] }}>
                <FrontPage data={{ ...paper, paperName: BRAND.defaultPaperName(name.trim() || null) }} crop shadow={false} />
              </motion.div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
