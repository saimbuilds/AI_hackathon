import Link from "next/link";
import type { Edition } from "@/types/edition";
import { FrontPage, paperFromEdition, allSlots, formatEditionDate } from "@/components/paper/FrontPage";
import { PillButton } from "@/components/ui/PillButton";

export type EditionDay = { id: string; date: string; number: number };

const DAY = 86400000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...o }).format(new Date(`${d}T00:00:00Z`));

/** Every day from the first paper to today, newest first, so missed mornings show as gaps. One tap opens a day. */
function DateStrip({ days, sample }: { days: EditionDay[]; sample: boolean }) {
  const byDate = new Map<string, EditionDay>();
  for (const d of days) if (!byDate.has(d.date) || byDate.get(d.date)!.number < d.number) byDate.set(d.date, d);
  const dates = [...byDate.keys()].sort();
  const newest = Date.parse(`${dates[dates.length - 1]}T00:00:00Z`);
  const oldest = Math.max(Date.parse(`${dates[0]}T00:00:00Z`), newest - 89 * DAY);
  const span: string[] = [];
  for (let t = newest; t >= oldest; t -= DAY) span.push(iso(t));
  return (
    <nav aria-label="Editions by date" className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:thin]">
      <ol className="flex w-max gap-2">
        <li>
          <span className="block w-[4.25rem] rounded-[var(--r-md)] border border-dashed border-line px-2 py-3 text-center text-ink-3" title="The next paper prints at 7 in the morning">
            <span className="t-xs block">{fmt(iso(newest + DAY), { weekday: "short" })}</span>
            <span className="t-num block text-[1.6rem] leading-none font-medium tracking-[-0.04em]">{fmt(iso(newest + DAY), { day: "numeric" })}</span>
            <span className="t-xs mt-1 block">Next</span>
          </span>
        </li>
        {span.map((d, i) => {
          const e = byDate.get(d);
          const month = i === 0 || d.endsWith("-01");
          const inner = (
            <>
              <span className="t-xs block text-ink-3">{month ? fmt(d, { month: "short" }) : fmt(d, { weekday: "short" })}</span>
              <span className="t-num block text-[1.6rem] leading-none font-medium tracking-[-0.04em]">{fmt(d, { day: "numeric" })}</span>
              <span className="t-xs mt-1 block">{e ? `No. ${e.number}` : "—"}</span>
            </>
          );
          return (
            <li key={d}>
              {e ? (
                <Link
                  href={sample ? "/paper" : `/paper?e=${e.id}`}
                  className={`block w-[4.25rem] rounded-[var(--r-md)] px-2 py-3 text-center transition-transform hover:-translate-y-0.5 ${i === 0 ? "bg-[var(--sun)]" : "bg-sheet"}`}
                  aria-label={`Open edition ${e.number}, ${fmt(d, { weekday: "long", day: "numeric", month: "long" })}`}
                >
                  {inner}
                </Link>
              ) : (
                <span className="block w-[4.25rem] rounded-[var(--r-md)] border border-dashed border-line px-2 py-3 text-center text-ink-3" title="No paper that day">
                  {inner}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Past editions as a stack of folded papers. Only real editions are drawn; blank sheets are tomorrow's. */
export function Shelf({ editions, days, sample = false }: { editions: Edition[]; days?: EditionDay[]; sample?: boolean }) {
  const [latest] = editions;
  const strip = days ?? editions.map((e) => ({ id: e.id, date: e.date, number: e.number }));
  return (
    <div className="container-page mt-16">
      <DateStrip days={strip} sample={sample} />
      <div className="mt-12 grid items-center gap-12 lg:grid-cols-12">
        <div className="relative mx-auto w-full max-w-[520px] [perspective:1600px] lg:col-span-6">
          {/* Blank sheets waiting behind today's paper */}
          {[3, 2, 1].map((n) => (
            <div
              key={n}
              aria-hidden
              className="absolute inset-0 rounded-[0.35em] bg-[var(--paper-bg)]"
              style={{ transform: `translate3d(${n * 14}px, ${-n * 16}px, ${-n * 40}px) rotate(${n * 1.6}deg)`, opacity: 1 - n * 0.18, boxShadow: "0 30px 60px -30px rgb(28 29 26 / 0.3)" }}
            />
          ))}
          <Link href={sample ? "/paper" : `/paper?e=${latest.id}`} className="relative block transition-transform duration-500 [transition-timing-function:var(--ease-out)] hover:-translate-y-2 hover:-rotate-1" aria-label={`Open ${latest.paperName}, edition ${latest.number}`}>
            <FrontPage data={paperFromEdition(latest)} crop />
          </Link>
        </div>
        <div className="lg:col-span-5 lg:col-start-8">
          <ol className="divide-y divide-line border-y border-line">
            {editions.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-4 py-5">
                <div>
                  <p className="t-sm text-ink-3">Edition No. {e.number}</p>
                  <p className="t-md">{formatEditionDate(e.date)}</p>
                  <p className="t-sm mt-1 text-ink-2">
                    {allSlots(e).length} stories, lead: {e.lead.headline}
                  </p>
                </div>
                <div className="flex flex-none flex-col items-end gap-2">
                  <PillButton href={sample ? "/paper" : `/paper?e=${e.id}`} tone="sun" size="sm">
                    Open
                  </PillButton>
                  <Link href={`/print/${e.id}`} className="tbtn !min-h-0 text-[0.9rem]">
                    PDF
                  </Link>
                </div>
              </li>
            ))}
          </ol>
          <p className="t-body mt-6 max-w-[40ch] text-ink-2">{sample ? "This is the sample paper. Print your own and your archive grows by one paper every morning at 7." : "Your archive grows by one paper every morning at 7. Every edition stays exactly as it was printed."}</p>
        </div>
      </div>
    </div>
  );
}
