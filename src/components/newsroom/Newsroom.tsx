"use client";

import { useCallback, useEffect, useState } from "react";
import { PillButton } from "@/components/ui/PillButton";
import { useStored } from "@/components/ui/useStored";

// Response of GET /api/admin/stats (backend: src/app/api/admin/stats/route.ts).
type Provider = { calls: number; failures: number; tokens: number; costUsd: number; p50ms: number };
type PressRun = { id: string; started_at: string; finished_at: string | null; stats: Record<string, unknown> | null; errors: unknown };
type Job = { id: string; kind: string; status: string; error: string | null; created_at: string };
type Feedback = { id: string; kind: string; message: string; status: string; created_at: string };
type Stats = {
  readers: { total: number; onboarded: number };
  editions: { total: number; last24h: number };
  queue: { queued: number; running: number; failedLast24h: number };
  press: { last: PressRun | null; ageMinutes: number | null };
  llm: { last24h: Record<string, Provider>; budget: unknown };
  jobs: Job[];
  feedback: { open: number; latest: Feedback[] };
};

const KEY = "ep-admin-key";

type Result = { stats: Stats } | { error: string };
async function fetchStats(k: string): Promise<Result> {
  try {
    const r = await fetch("/api/admin/stats", { headers: { "x-admin-key": k }, cache: "no-store" });
    if (r.status === 401) return { error: "That key isn’t right." };
    if (!r.ok) return { error: `The newsroom API answered ${r.status}. Is the backend deployed on this branch?` };
    return { stats: (await r.json()) as Stats };
  } catch {
    return { error: "Couldn’t reach the newsroom API." };
  }
}
const grounding = (r: PressRun | null) => {
  const g = (r?.stats as { enrich?: { grounding?: number } } | null)?.enrich?.grounding;
  return typeof g === "number" ? `${Math.round(g * 100)}%` : "–";
};

function Tile({ label, value, note, bg = "var(--sheet)" }: { label: string; value: string | number; note?: string; bg?: string }) {
  return (
    <div className="rounded-[var(--r-lg)] p-6" style={{ background: bg }}>
      <p className="t-sm text-ink-3">{label}</p>
      <p className="t-num mt-3 text-[3rem] leading-none font-medium tracking-[-0.06em]">{value}</p>
      {note && <p className="t-sm mt-2 text-ink-2">{note}</p>}
    </div>
  );
}

/** The launch desk: readers, the press, the queue, AI spend and feedback on one screen. Refreshes every 30 s. */
export function Newsroom() {
  const [storedKey, setStoredKey] = useStored(KEY, "session");
  const [typed, setKey] = useState<string | null>(null);
  const key = typed ?? storedKey ?? "";
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [at, setAt] = useState<string>("");

  const apply = useCallback(
    (k: string, res: Result) => {
      if ("error" in res) return setError(res.error);
      setStats(res.stats);
      setError(null);
      setAt(new Date().toLocaleTimeString("en-GB"));
      setStoredKey(k);
    },
    [setStoredKey],
  );
  const load = (k: string) => fetchStats(k).then((res) => apply(k, res));

  // A key remembered in this tab opens the desk straight away; then refresh every 30 s.
  useEffect(() => {
    if (!storedKey) return;
    let live = true;
    const run = () => fetchStats(storedKey).then((res) => live && apply(storedKey, res));
    run();
    const id = setInterval(run, 30000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [storedKey, apply]);

  if (!stats) {
    return (
      <div className="container-page mt-16">
        <form
          className="max-w-[560px] rounded-[var(--r-lg)] bg-sheet p-8"
          onSubmit={(e) => {
            e.preventDefault();
            load(key);
          }}
        >
          <h2 className="t-md">Staff only</h2>
          <p className="t-body mt-2 text-ink-2">Enter the admin key to open the launch desk. It stays in this tab only.</p>
          <input type="password" className="field mt-6" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Admin key" autoComplete="off" aria-label="Admin key" />
          {error && (
            <p className="t-sm mt-3 rounded-[var(--r-sm)] bg-newsprint p-3" role="alert">
              {error}
            </p>
          )}
          <div className="mt-6">
            <PillButton type="submit" tone="press" look="solid" disabled={!key}>
              Open the newsroom
            </PillButton>
          </div>
        </form>
      </div>
    );
  }

  const providers = Object.entries(stats.llm.last24h);
  const cost = providers.reduce((c, [, p]) => c + p.costUsd, 0);
  return (
    <div className="container-page mt-16 space-y-3">
      <p className="t-sm text-ink-3" aria-live="polite">
        Updated {at}. Refreshes every 30 seconds.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Readers" value={stats.readers.total} note={`${stats.readers.onboarded} finished onboarding`} bg="var(--sun)" />
        <Tile label="Editions, last 24 h" value={stats.editions.last24h} note={`${stats.editions.total} all time`} />
        <Tile label="Queue" value={stats.queue.queued + stats.queue.running} note={`${stats.queue.running} printing, ${stats.queue.failedLast24h} failed today`} bg={stats.queue.failedLast24h ? "var(--press)" : "var(--sheet)"} />
        <Tile label="Grounding rate" value={grounding(stats.press.last)} note={stats.press.ageMinutes === null ? "No press run yet" : `Last press run ${stats.press.ageMinutes} min ago`} bg="var(--leaf)" />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-[var(--r-lg)] bg-sheet p-6 md:p-8">
          <h2 className="t-md">AI calls, last 24 h</h2>
          <table className="t-sm t-num mt-4 w-full text-left">
            <thead>
              <tr className="border-b border-line text-ink-3">
                <th className="py-2 font-medium">Provider</th>
                <th className="py-2 font-medium">Calls</th>
                <th className="py-2 font-medium">Failed</th>
                <th className="py-2 font-medium">p50</th>
                <th className="py-2 font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {providers.map(([name, p]) => (
                <tr key={name} className="border-b border-line">
                  <td className="py-2">{name}</td>
                  <td>{p.calls}</td>
                  <td>{p.failures}</td>
                  <td>{p.p50ms} ms</td>
                  <td>${p.costUsd.toFixed(3)}</td>
                </tr>
              ))}
              {!providers.length && (
                <tr>
                  <td colSpan={5} className="py-3 text-ink-3">
                    No AI calls in the last day.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="t-sm mt-4">
            Total ${cost.toFixed(2)}
            {stats.editions.last24h ? `, $${(cost / stats.editions.last24h).toFixed(4)} per edition` : ""}
          </p>
        </section>
        <section className="rounded-[var(--r-lg)] bg-sheet p-6 md:p-8">
          <h2 className="t-md">Latest feedback ({stats.feedback.open} open)</h2>
          <ul className="mt-4 divide-y divide-line">
            {stats.feedback.latest.slice(0, 8).map((f) => (
              <li key={f.id} className="py-3">
                <p className="t-xs text-ink-3">
                  {f.kind}, {new Date(f.created_at).toLocaleString("en-GB")}
                </p>
                <p className="t-body mt-0.5">{f.message}</p>
              </li>
            ))}
            {!stats.feedback.latest.length && <li className="t-sm py-3 text-ink-3">Nothing yet.</li>}
          </ul>
        </section>
      </div>
      <section className="rounded-[var(--r-lg)] bg-sheet p-6 md:p-8">
        <h2 className="t-md">Jobs</h2>
        <ul className="t-sm mt-4 divide-y divide-line">
          {stats.jobs.map((j) => (
            <li key={j.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
              <span>
                {j.kind} <span className="text-ink-3">{new Date(j.created_at).toLocaleTimeString("en-GB")}</span>
              </span>
              <span className="chip !h-6 !text-[0.72rem]" data-tone={j.status === "failed" ? "press" : j.status === "done" ? "leaf" : "sun"}>
                {j.status}
              </span>
              {j.error && <span className="w-full text-ink-3">{j.error}</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
