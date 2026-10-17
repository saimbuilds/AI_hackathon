import type { Edition, StorySlot, Trust } from "@/types/edition";
import { Masthead } from "./Masthead";

export type PaperStory = {
  kicker: string;
  headline: string;
  dek?: string;
  body?: string[];
  forYou?: string;
  trust?: Trust;
};

export type PaperData = {
  paperName: string;
  number: number;
  city: string;
  dateLabel: string;
  stats: string; // "11 stories, 6 min"
  weather?: string;
  lead: PaperStory;
  side: PaperStory[];
  credit?: string; // "Compiled for Abbu by Saim"
  dir?: "ltr" | "rtl";
  lang?: string;
  ears?: { left: string[]; right: string[] }; // overrides the default ears (other languages)
  forYouLabel?: string;
};

export const trustLabel = (t: Trust) =>
  t.label === "confirmed" ? `Confirmed by ${t.outlets} outlets` : t.label === "developing" ? "Developing" : "Single source";

// Reading order, as the paper lays it out: lead, everyone’s front page, sections, off your beat, briefs.
export const allSlots = (e: Edition): StorySlot[] => [
  e.lead,
  ...e.everyonesFrontPage,
  ...e.sections.flatMap((s) => s.slots),
  ...e.offYourBeat,
  ...e.briefs,
];

export const formatEditionDate = (iso: string, style: "long" | "short" = "long") =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    ...(style === "long" ? { weekday: "long", day: "numeric", month: "long", year: "numeric" } : { day: "numeric", month: "long" }),
  }).format(new Date(`${iso}T00:00:00Z`));

export function paperFromEdition(e: Edition, paperName?: string): PaperData {
  const slots = allSlots(e);
  const minutes = Math.round(slots.reduce((m, s) => m + s.readMinutes, 0));
  const side = e.sections.flatMap((s) => s.slots).filter((s) => s.size === "major");
  return {
    paperName: paperName ?? e.paperName,
    number: e.number,
    city: e.city,
    dateLabel: formatEditionDate(e.date),
    stats: `${slots.length} stories, ${minutes} min`,
    weather: e.weather ? `${e.weather.hi}° / ${e.weather.lo}°` : undefined,
    lead: {
      kicker: e.lead.kicker,
      headline: e.lead.headline,
      dek: e.lead.dek,
      body: e.lead.body.slice(0, 4).map((b) => b.text),
      forYou: e.lead.forYou,
      trust: e.lead.trust,
    },
    side: [...side, ...e.offYourBeat].slice(0, 3).map((s) => ({ kicker: s.kicker, headline: s.headline, dek: s.dek, trust: s.trust })),
    credit: e.gift ? `Compiled for ${e.gift.forName} by ${e.gift.fromName}` : undefined,
  };
}

/** A typeset front page. Sized by its container; pass `crop` to fade it out below the fold. */
export function FrontPage({
  data,
  crop = false,
  shadow = true,
  large = false,
  animateMasthead = false,
  className,
}: {
  data: PaperData;
  crop?: boolean;
  shadow?: boolean;
  large?: boolean;
  animateMasthead?: boolean;
  className?: string;
}) {
  const { lead, side } = data;
  return (
    <div className={`paper-frame ${className ?? ""}`}>
      <article
        className="paper"
        dir={data.dir ?? "ltr"}
        lang={data.lang}
        data-crop={crop || undefined}
        data-shadow={shadow ? undefined : "none"}
        data-large={large || undefined}
        aria-label={`${data.paperName}, edition ${data.number}`}
      >
        <div className="paper-ears">
          <div>
            {(data.ears?.left ?? [`Edition No. ${data.number}`, `${data.city} Edition`]).map((l, i) => (
              <span key={i} className="block">{l}</span>
            ))}
          </div>
          <div>
            {(data.ears?.right ?? [data.credit ?? "An Endpaper edition", ...(data.weather ? [data.weather] : [])]).map((l, i) => (
              <span key={i} className="block">{l}</span>
            ))}
          </div>
        </div>
        <Masthead name={data.paperName} animate={animateMasthead} />
        <div className="paper-dateline">
          <span>{data.dateLabel}</span>
          <span>{data.stats}</span>
        </div>

        <div className="paper-grid">
          <section>
            <div className="paper-kicker">{lead.kicker}</div>
            <h3 className="paper-lead">{lead.headline}</h3>
            {lead.dek && <p className="paper-dek">{lead.dek}</p>}
            {lead.forYou && (
              <p className="paper-foryou">
                <b>{data.forYouLabel ?? "For you."}</b> {lead.forYou}
              </p>
            )}
            {lead.body && lead.body.length > 0 && (
              <div className="paper-body">
                {lead.body.map((t, i) => (
                  <p key={i}>{t}</p>
                ))}
              </div>
            )}
            {lead.trust && (
              <div className="paper-trust" data-label={lead.trust.label}>
                {trustLabel(lead.trust)}
              </div>
            )}
          </section>
          <aside>
            {side.map((s, i) => (
              <div key={i}>
                {i > 0 && <div className="paper-rule" />}
                <div className="paper-kicker">{s.kicker}</div>
                <h4 className={i === 0 ? "paper-h2" : "paper-h3"}>{s.headline}</h4>
                {s.dek && <p className="paper-small">{s.dek}</p>}
                {s.trust && (
                  <div className="paper-trust" data-label={s.trust.label}>
                    {trustLabel(s.trust)}
                  </div>
                )}
              </div>
            ))}
          </aside>
        </div>
        {!crop && <div className="paper-endmark">— 30 —</div>}
      </article>
    </div>
  );
}
