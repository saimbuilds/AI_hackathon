import Link from "next/link";
import type { Edition, StorySlot } from "@/types/edition";
import { trustLabel, formatEditionDate } from "@/components/paper/FrontPage";
import { PillButton } from "@/components/ui/PillButton";
import { Check } from "@/components/ui/icons";

function Trust({ s }: { s: StorySlot }) {
  const tone = s.trust.label === "confirmed" ? "leaf" : s.trust.label === "developing" ? "press" : "sun";
  return (
    <span className="chip" data-tone={tone}>
      {s.trust.label === "confirmed" ? <Check size={12} /> : <span className="chip-dot" />}
      {trustLabel(s.trust)}
    </span>
  );
}

function Topics({ s }: { s: StorySlot }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {s.topics.slice(0, 2).map((t) => (
        <span key={t} className="chip capitalize">
          {t.replace(/-/g, " ")}
        </span>
      ))}
      <Trust s={s} />
    </div>
  );
}

/** Real stories from this morning's press, laid out as cards you can open. */
export function TodaysPaper({ edition }: { edition: Edition }) {
  const lead = edition.lead;
  const majors = edition.sections.flatMap((s) => s.slots).filter((s) => s.size === "major");
  const [wide, ...rest] = [...majors, ...edition.offYourBeat];
  const small = rest.slice(0, 2);
  const name = edition.paperName.replace(/^The | Times$/g, "");

  return (
    <div className="container-page" aria-labelledby="today-title">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <h2 id="today-title" className="t-xl max-w-[14ch]">
          This morning, for {name}
        </h2>
        <p className="t-body max-w-[40ch] text-ink-2">
          Edition No. {edition.number}, {formatEditionDate(edition.date, "short")}, {edition.city}. Every card below is a
          real story from today’s press, checked across the outlets that reported it.
        </p>
      </div>

      <div className="mt-14 grid gap-3 md:grid-cols-12">
        <Link
          href="/paper"
          className="group relative flex min-h-[520px] flex-col justify-between rounded-[var(--r-lg)] bg-sheet p-7 md:col-span-6 md:row-span-2 md:p-10"
        >
          <Topics s={lead} />
          <div>
            <p className="t-sm text-[#c2321a]">{lead.kicker}</p>
            <h3 className="mt-3 font-serif text-[clamp(2rem,1.4rem+2.4vw,3.4rem)] leading-[0.98] font-medium tracking-[-0.03em] text-balance">
              {lead.headline}
            </h3>
            <p className="mt-5 max-w-[46ch] font-serif text-[1.2rem] leading-[1.4] text-ink-2 italic">{lead.dek}</p>
            {lead.forYou && (
              <p className="t-body mt-6 rounded-[var(--r-sm)] bg-sun p-4">
                <b className="font-semibold">For you.</b> {lead.forYou}
              </p>
            )}
          </div>
          <span className="t-sm mt-8 flex items-center justify-between text-ink-3">
            <span>
              {lead.sources.length} sources, {Math.round(lead.readMinutes)} min read
            </span>
            <span className="tbtn !min-h-0 text-ink">Read the story</span>
          </span>
        </Link>

        {wide && (
          <Link
            href="/paper"
            className="flex min-h-[254px] flex-col justify-between gap-8 rounded-[var(--r-lg)] bg-cyan p-7 md:col-span-6 md:p-9"
          >
            <Topics s={wide} />
            <div>
              <p className="t-sm">{wide.kicker}</p>
              <h3 className="mt-2 font-serif text-[clamp(1.6rem,1.3rem+1.1vw,2.3rem)] leading-[1.02] font-medium tracking-[-0.025em] text-balance">
                {wide.headline}
              </h3>
            </div>
          </Link>
        )}
        {small.map((s) => (
          <Link
            key={s.storyId}
            href="/paper"
            className="flex min-h-[254px] flex-col justify-between gap-6 rounded-[var(--r-lg)] bg-sheet p-7 md:col-span-3"
          >
            <Topics s={s} />
            <div>
              <p className="t-sm text-ink-3">{s.kicker}</p>
              <h3 className="mt-2 font-serif text-[1.45rem] leading-[1.06] font-medium tracking-[-0.02em] text-balance">
                {s.headline}
              </h3>
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-10 flex justify-center">
        <PillButton href="/paper" tone="press" look="solid">
          Open the whole paper
        </PillButton>
      </div>
    </div>
  );
}
