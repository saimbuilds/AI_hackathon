import Link from "next/link";
import type { Edition } from "@/types/edition";
import { FrontPage, paperFromEdition, allSlots, formatEditionDate } from "@/components/paper/FrontPage";
import { PillButton } from "@/components/ui/PillButton";

/** Past editions as a stack of folded papers. Only real editions are drawn; blank sheets are tomorrow's. */
export function Shelf({ editions }: { editions: Edition[] }) {
  const [latest] = editions;
  return (
    <div className="container-page mt-16">
      <div className="grid items-center gap-12 lg:grid-cols-12">
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
          <Link href="/paper" className="relative block transition-transform duration-500 [transition-timing-function:var(--ease-out)] hover:-translate-y-2 hover:-rotate-1" aria-label={`Open ${latest.paperName}, edition ${latest.number}`}>
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
                  <PillButton href="/paper" tone="sun" size="sm">
                    Open
                  </PillButton>
                  <Link href={`/print/${e.id}`} className="tbtn !min-h-0 text-[0.9rem]">
                    PDF
                  </Link>
                </div>
              </li>
            ))}
          </ol>
          <p className="t-body mt-6 max-w-[40ch] text-ink-2">Your archive grows by one paper every morning at 7. Every edition stays exactly as it was printed.</p>
        </div>
      </div>
    </div>
  );
}
