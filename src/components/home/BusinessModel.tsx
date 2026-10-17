import { PillButton } from "@/components/ui/PillButton";

const LINES = [
  {
    who: "Adult children, for their parents",
    name: "Gift papers",
    price: "$5",
    per: "a month per paper",
    why: "A paper in Abbu’s language and type size, signed from you. People pay more for family than for themselves, and every gift brings a second reader.",
    bg: "var(--sun)",
  },
  {
    who: "Readers who want more",
    name: "Endpaper+",
    price: "$4",
    per: "a month, PKR 399 in Pakistan",
    why: "Unlimited follows and “since you asked” alerts, the audio edition, and your newsletters folded into the paper.",
    bg: "var(--sheet)",
  },
  {
    who: "Companies",
    name: "Teams",
    price: "$8",
    per: "a seat a month",
    why: "A shared morning brief on competitors, regulation and deals, delivered to Slack at 9.",
    bg: "var(--press)",
  },
];

const ECONOMICS = [
  { k: "¼¢", v: "to print one edition: the costly AI work runs once per story, shared by every reader" },
  { k: "~15¢", v: "a month to serve a free reader, all in: AI, email, PDF, storage" },
  { k: "4%", v: "of readers paying covers every free reader; gross margin about 85%" },
];

/** Who pays, and why the free paper stays free. */
export function BusinessModel() {
  return (
    <section className="panel-top relative z-10 -mt-[var(--r-lg)] bg-cyan pt-28 pb-[calc(var(--r-lg)+12vh)] md:pt-36" aria-labelledby="money-title">
      <div className="container-page">
        <div className="grid gap-8 md:grid-cols-12 md:items-end">
          <h2 id="money-title" className="t-xl md:col-span-7">
            Free to read. Paid to give, follow and share at work.
          </h2>
          <p className="t-body-lg text-ink-2 md:col-span-5">
            We earn when you finish a paper you value, never by keeping you scrolling. No ads, no selling attention, so the business and the reader want the same thing.
          </p>
        </div>

        <ul className="mt-14 grid gap-3 md:grid-cols-3">
          {LINES.map((l) => (
            <li key={l.name} className="flex min-h-[380px] flex-col rounded-[var(--r-lg)] p-7 md:p-8" style={{ background: l.bg }}>
              <p className="t-sm">{l.who}</p>
              <h3 className="t-lg mt-2">{l.name}</h3>
              <p className="mt-6 flex items-baseline gap-2">
                <span className="t-num text-[3.6rem] leading-none font-medium tracking-[-0.06em]">{l.price}</span>
                <span className="t-sm">{l.per}</span>
              </p>
              <p className="t-body mt-auto pt-8">{l.why}</p>
            </li>
          ))}
        </ul>

        <dl className="mt-3 grid gap-3 md:grid-cols-3">
          {ECONOMICS.map((e) => (
            <div key={e.k} className="rounded-[var(--r-md)] bg-[rgb(251_250_246/0.55)] p-6">
              <dt className="t-num text-[2.6rem] leading-none font-medium tracking-[-0.05em]">{e.k}</dt>
              <dd className="t-body mt-3">{e.v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <PillButton href="/pricing" tone="press" look="solid">
            See plans
          </PillButton>
          <p className="t-sm max-w-[52ch]">
            Later: classifieds matched to your interests without tracking, and a revenue share with the publishers we send readers to.
          </p>
        </div>
      </div>
    </section>
  );
}
