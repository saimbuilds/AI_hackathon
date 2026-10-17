import { PillButton } from "@/components/ui/PillButton";

// A real story from the press, captured on 17 October 2026 (stories table, 3 outlets, enriched by the pipeline).
// Shown on the landing page as a live example of what a story in your paper looks like: grounded, sourced, honest about unknowns.
export const STORY = {
  kicker: "Cars · Developing",
  headline: "Tesla shows Roadster stunts; reactions mix praise and skepticism",
  dek: "Tesla’s demonstration at a SpaceX facility in Texas drew praise from some figures and doubts from others about the company’s claims.",
  matters: "A high-profile carmaker’s performance claims and safety questions shape what consumers and investors expect from future vehicles.",
  unknown: "Sources do not confirm whether the Roadster will be made available to consumers, and the performance figures were presented by Tesla and not independently verified.",
  sources: [
    { name: "Sky News Arabia", url: "https://www.skynewsarabia.com/technology/1898786-%D8%A5%D8%B4%D8%A7%D8%AF%D8%A9-%D8%A8%D8%B3%D9%8A%D8%A7%D8%B1%D8%A9-%D8%AA%D8%B3%D9%84%D8%A7-%D8%A7%D9%84%D8%AE%D8%A7%D8%B1%D9%82%D8%A9-%D9%88%D8%B4%D9%83%D9%88%D9%83-%D9%88%D8%B9%D9%88%D8%AF-%D9%85%D8%A7%D8%B3%D9%83", line: "Middle East: mixed reactions, praise for the capabilities and doubts about the promises." },
    { name: "France 24", url: "https://www.france24.com/ar/%D9%81%D9%8A%D8%AF%D9%8A%D9%88/20261017-%D8%A5%D9%8A%D9%84%D9%88%D9%86-%D9%85%D8%A7%D8%B3%D9%83-%D9%8A%D9%83%D8%B4%D9%81-%D8%B9%D9%86-%D8%B3%D9%8A%D8%A7%D8%B1%D8%A9-%D8%B7%D8%A7%D8%A6%D8%B1%D8%A9-%D9%85%D9%86-%D8%AA%D8%B3%D9%8A%D9%84%D8%A7", line: "France: frames it as Musk unveiling a “flying” Tesla." },
    { name: "agadir24", url: "https://agadir24.info/%d8%aa%d8%b3%d9%84%d8%a7-%d8%aa%d9%83%d8%b4%d9%81-%d8%b9%d9%86-%d8%b3%d9%8a%d8%a7%d8%b1%d8%a9-%d8%ac%d8%af%d9%8a%d8%af%d8%a9-%d8%b0%d8%a7%d8%aa-%d9%82%d8%af%d8%b1%d8%a9-%d8%b9%d9%84%d9%89-%d8%a7%d9%84.html", line: "Morocco: a car that rises into the air, with rocket-style propulsion." },
  ],
};

/** One real story, set the way it prints in your paper, with how the world covered it. */
export function LiveStory() {
  return (
    <section className="relative z-10 bg-newsprint py-24 md:py-32" aria-labelledby="live-title">
      <div className="container-page grid gap-10 md:grid-cols-12 md:gap-6">
        <div className="md:col-span-4">
          <p className="t-sm text-ink-3">From this morning’s press</p>
          <h2 id="live-title" className="t-xl mt-3">
            The story everyone is talking about, read three ways.
          </h2>
          <p className="t-body mt-5 max-w-[34ch] text-ink-2">
            Newsrooms in the Middle East, France and Morocco covered Tesla’s rocket-assisted Roadster demo. Your paper keeps the one story, checks it across outlets, and says what nobody knows yet.
          </p>
          <div className="mt-7">
            <PillButton href="/paper" tone="press" look="solid">
              Read a full sample paper
            </PillButton>
          </div>
        </div>
        <article className="rounded-[var(--r-lg)] bg-[var(--paper-bg)] p-6 text-[var(--paper-ink)] md:col-span-8 md:p-10">
          <p className="t-sm font-semibold text-press">{STORY.kicker}</p>
          <h3 className="mt-3 font-serif text-[clamp(1.9rem,1.2rem+2.4vw,3.2rem)] leading-[1.05] font-semibold tracking-[-0.02em] text-balance">{STORY.headline}</h3>
          <p className="mt-4 font-serif text-[1.2rem] leading-[1.4] text-ink-2 italic">{STORY.dek}</p>
          <div className="mt-6 flex flex-wrap gap-1.5">
            <span className="chip" data-tone="leaf">
              Confirmed by 3 outlets
            </span>
            <span className="chip">Cars</span>
            <span className="chip">Consumer tech</span>
          </div>
          <dl className="mt-8 grid gap-3 md:grid-cols-2">
            <div className="rounded-[var(--r-sm)] bg-newsprint p-4">
              <dt className="t-sm font-semibold">Why it matters</dt>
              <dd className="t-body mt-1 text-ink-2">{STORY.matters}</dd>
            </div>
            <div className="rounded-[var(--r-sm)] bg-newsprint p-4">
              <dt className="t-sm font-semibold">What we don’t know yet</dt>
              <dd className="t-body mt-1 text-ink-2">{STORY.unknown}</dd>
            </div>
          </dl>
          <h4 className="t-md mt-9">How the world covered it</h4>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {STORY.sources.map((s) => (
              <li key={s.url} className="py-3">
                <a href={s.url} target="_blank" rel="noreferrer" className="group block">
                  <span className="t-sm text-ink-3">{s.name}</span>
                  <span className="mt-0.5 block font-serif text-[1.08rem] leading-[1.4] group-hover:underline">{s.line}</span>
                </a>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
