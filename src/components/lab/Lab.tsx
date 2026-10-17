"use client";

import { useEffect, useState } from "react";
import { LabChart, type Series } from "./LabChart";
import { PillButton } from "@/components/ui/PillButton";

// Shapes from the backend simulator (fold-core src/lab/sim.ts). GET /api/lab returns the latest run.
type PolicyName = "fold" | "onboarding" | "random";
type DayRow = { day: number; relevance: number; diversity: number };
type DayStory = { id: string; headline: string; topics: string[]; label: "love" | "open" | "skip" | "less" };
type PersonaResult = { id: string; name: string; bio: string; hidden: string[]; stated: string[]; policies: Record<PolicyName, { day: number; relevance: number; diversity: number; stories: DayStory[] }[]> };
type Summary = {
  byDay: Record<PolicyName, DayRow[]>;
  fold: { day1: number; lastDay: number; liftPoints: number };
  baselines: { onboardingLast3: number; randomLast3: number; foldVsOnboarding: number };
  diversity: { fold: number; floor: number; ok: boolean };
};
type LabRun = { summary: Summary; personas?: PersonaResult[]; ranAt?: string };

// Validated with the dataviz palette checker (light surface #fbfaf6): all six checks pass.
const COLORS: Record<PolicyName, string> = { fold: "#e0401f", onboarding: "#1f7fc4", random: "#a07400" };
const LABELS: Record<PolicyName, string> = { fold: "Endpaper", onboarding: "Onboarding only", random: "Random" };
const pct = (v: number) => `${Math.round(v * 100)}%`;

function isRun(x: unknown): x is LabRun {
  const s = (x as LabRun | null)?.summary;
  return !!s && !!s.byDay && Array.isArray(s.byDay.fold);
}

export function Lab() {
  const [state, setState] = useState<"loading" | "empty" | "ready">("loading");
  const [run, setRun] = useState<LabRun | null>(null);
  const [table, setTable] = useState(false);
  const [persona, setPersona] = useState(0);
  const [day, setDay] = useState(1);

  useEffect(() => {
    fetch("/api/lab")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (isRun(j)) {
          setRun(j);
          setDay(j.summary.byDay.fold.length || 1);
          setState("ready");
        } else setState("empty");
      })
      .catch(() => setState("empty"));
  }, []);

  if (state === "loading") {
    return (
      <div className="container-page mt-16" aria-busy="true">
        <div className="h-[420px] animate-pulse rounded-[var(--r-lg)] bg-sheet" />
      </div>
    );
  }

  if (state === "empty" || !run) {
    return (
      <div className="container-page mt-16 grid gap-3 md:grid-cols-12">
        <section className="rounded-[var(--r-lg)] bg-sheet p-8 md:col-span-7 md:p-10">
          <h2 className="t-lg">The Lab hasn’t published a run yet.</h2>
          <p className="t-body-lg mt-4 max-w-[48ch] text-ink-2">
            When the backend runs <code className="rounded bg-newsprint px-1.5 py-0.5 text-[0.9em]">pnpm lab</code>, this page charts the result: three simulated readers with hidden interests read seven days of real stories, and we compare how relevant each day’s paper is under three policies.
          </p>
          <ul className="mt-8 space-y-3">
            {(Object.keys(LABELS) as PolicyName[]).map((p) => (
              <li key={p} className="t-body flex items-start gap-3">
                <span className="mt-2 h-[3px] w-5 flex-none rounded-full" style={{ background: COLORS[p] }} aria-hidden />
                <span>
                  <b className="font-semibold">{LABELS[p]}.</b>{" "}
                  {p === "fold" ? "The full system: learns from every swipe, open and skip." : p === "onboarding" ? "Same first day, but never learns from reading." : "Random stories from the same pool."}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-[var(--r-lg)] bg-sun p-8 md:col-span-5 md:p-10">
          <h2 className="t-md">What a good result looks like</h2>
          <p className="t-body mt-3 text-ink-2">Endpaper’s line climbs above the onboarding-only line by day 7, while topic diversity stays above the floor, so learning doesn’t shrink the paper into a bubble.</p>
        </section>
      </div>
    );
  }

  const { summary } = run;
  const series: Series[] = (Object.keys(LABELS) as PolicyName[]).map((p) => ({ key: p, label: LABELS[p], color: COLORS[p], points: summary.byDay[p].map((d) => ({ day: d.day, value: d.relevance })) }));
  const div: Series[] = [{ key: "fold", label: "Endpaper", color: COLORS.fold, points: summary.byDay.fold.map((d) => ({ day: d.day, value: d.diversity })) }];
  const p = run.personas?.[persona];
  const days = summary.byDay.fold.length;

  return (
    <div className="container-page mt-16 space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[var(--r-lg)] bg-sheet p-7">
          <p className="t-sm text-ink-3">Relevance, day 1 → day {days}</p>
          <p className="t-num mt-3 text-[3.6rem] leading-none font-medium tracking-[-0.06em]">
            {pct(summary.fold.day1)} → {pct(summary.fold.lastDay)}
          </p>
        </div>
        <div className="rounded-[var(--r-lg)] bg-sheet p-7">
          <p className="t-sm text-ink-3">Ahead of onboarding-only (last 3 days)</p>
          <p className="t-num mt-3 text-[3.6rem] leading-none font-medium tracking-[-0.06em]">
            {summary.baselines.foldVsOnboarding >= 0 ? "+" : ""}
            {Math.round(summary.baselines.foldVsOnboarding * 100)} pts
          </p>
        </div>
        <div className="rounded-[var(--r-lg)] bg-sheet p-7">
          <p className="t-sm text-ink-3">Topic diversity</p>
          <p className="t-num mt-3 text-[3.6rem] leading-none font-medium tracking-[-0.06em]">{pct(summary.diversity.fold)}</p>
          <p className="t-sm mt-2">{summary.diversity.ok ? `Above the ${pct(summary.diversity.floor)} floor` : `Below the ${pct(summary.diversity.floor)} floor`}</p>
        </div>
      </div>

      <section className="rounded-[var(--r-lg)] bg-sheet p-6 md:p-10">
        <div className="flex justify-end">
          <button type="button" className="tbtn" onClick={() => setTable((v) => !v)} aria-pressed={table}>
            {table ? "Show chart" : "Show as table"}
          </button>
        </div>
        {table ? (
          <table className="t-body mt-4 w-full text-left">
            <caption className="t-md mb-4 text-left">Share of each day’s paper the reader wanted</caption>
            <thead>
              <tr className="border-b border-line">
                <th className="py-2 font-semibold">Day</th>
                {series.map((s) => (
                  <th key={s.key} className="py-2 font-semibold">
                    {s.label}
                  </th>
                ))}
                <th className="py-2 font-semibold">Diversity</th>
              </tr>
            </thead>
            <tbody className="t-num">
              {summary.byDay.fold.map((d, i) => (
                <tr key={d.day} className="border-b border-line">
                  <td className="py-2">{d.day}</td>
                  {series.map((s) => (
                    <td key={s.key} className="py-2">
                      {pct(s.points[i]?.value ?? 0)}
                    </td>
                  ))}
                  <td className="py-2">{pct(d.diversity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="grid gap-14">
            <LabChart title="Share of each day’s paper the reader wanted" series={series} />
            <LabChart title="Topic diversity" series={div} floor={{ value: summary.diversity.floor, label: "Bubble floor" }} height={240} />
          </div>
        )}
      </section>

      {p && (
        <section className="rounded-[var(--r-lg)] bg-cyan p-6 md:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="t-lg">Day 1 vs day {day}, for one reader</h2>
            <div className="flex flex-wrap gap-2">
              {run.personas!.map((x, i) => (
                <button key={x.id} type="button" aria-pressed={i === persona} onClick={() => setPersona(i)} className="chip !h-10 !px-4" data-tone={i === persona ? "ink" : undefined}>
                  {x.name}
                </button>
              ))}
            </div>
          </div>
          <p className="t-body mt-3 max-w-[60ch]">
            {p.bio} Says they like {p.stated.join(", ")}; actually reads {p.hidden.join(", ")}.
          </p>
          <label className="mt-6 block max-w-[520px]">
            <span className="t-sm">Day {day}</span>
            <input type="range" min={1} max={days} value={day} onChange={(e) => setDay(+e.target.value)} className="mt-2 w-full accent-[var(--ink)]" />
          </label>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {[1, day].map((d, i) => (
              <ol key={i} className="rounded-[var(--r-md)] bg-sheet p-5">
                <p className="t-sm mb-3 text-ink-3">Day {d}</p>
                {p.policies.fold[d - 1]?.stories.slice(0, 6).map((s) => (
                  <li key={s.id} className="flex items-start justify-between gap-3 border-t border-line py-2 first:border-0">
                    <span className="font-serif text-[1.02rem] leading-[1.3]">{s.headline}</span>
                    <span className="chip flex-none !h-6 !text-[0.72rem]" data-tone={s.label === "love" || s.label === "open" ? "leaf" : "line"}>
                      {s.label === "love" ? "Loved" : s.label === "open" ? "Read" : s.label === "less" ? "Less" : "Skipped"}
                    </span>
                  </li>
                ))}
              </ol>
            ))}
          </div>
        </section>
      )}
      {run.ranAt && <p className="t-sm text-ink-3">Run on {new Date(run.ranAt).toLocaleString("en-GB")}.</p>}
      <div className="pt-6">
        <PillButton href="/start" tone="press" look="solid">
          Try the real thing
        </PillButton>
      </div>
    </div>
  );
}
