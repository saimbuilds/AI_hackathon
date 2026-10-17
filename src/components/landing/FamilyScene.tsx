import { Noto_Naskh_Arabic, Noto_Nastaliq_Urdu, Noto_Serif_Devanagari } from "next/font/google";

// Loaded only for this section; not preloaded so the hero stays fast.
const nastaliq = Noto_Nastaliq_Urdu({ subsets: ["arabic"], weight: "500", preload: false, display: "swap" });
const naskh = Noto_Naskh_Arabic({ subsets: ["arabic"], weight: "500", preload: false, display: "swap" });
const devanagari = Noto_Serif_Devanagari({ subsets: ["devanagari"], weight: "500", preload: false, display: "swap" });

const PAPERS = [
  {
    masthead: "ابو کا اخبار",
    lang: "ur",
    dir: "rtl" as const,
    font: nastaliq.className,
    size: "text-[clamp(1.7rem,3vw,2.5rem)] leading-[2]",
    note: "For Abbu, in Urdu, large print. Cricket, markets and home.",
    from: "Compiled by Saim",
  },
  {
    masthead: "El Diario de la Abuela",
    lang: "es",
    dir: "ltr" as const,
    font: "font-[family-name:var(--font-unifraktur)]",
    size: "text-[clamp(1.5rem,2.6vw,2.2rem)] leading-[1.1]",
    note: "For Abuela, in Spanish. Her town, the garden, the grandkids’ teams.",
    from: "Compiled by María",
  },
  {
    masthead: "नानी का अख़बार",
    lang: "hi",
    dir: "ltr" as const,
    font: devanagari.className,
    size: "text-[clamp(1.6rem,2.8vw,2.4rem)] leading-[1.5]",
    note: "For Nani, in Hindi. Weather, recipes and the stories she follows.",
    from: "Compiled by Arjun",
  },
  {
    masthead: "جريدة جدّي",
    lang: "ar",
    dir: "rtl" as const,
    font: naskh.className,
    size: "text-[clamp(1.7rem,3vw,2.5rem)] leading-[1.6]",
    note: "For Jaddi, in Arabic, large print. Football and the family’s cities.",
    from: "Compiled by Layla",
  },
];

export function FamilyScene() {
  return (
    <section id="family" aria-labelledby="family-title" className="relative border-t border-rule">
      <div className="page py-[clamp(4.5rem,10vw,9rem)]">
        <div className="grid grid-cols-12 gap-x-[var(--col-gap)] gap-y-6">
          <div className="col-span-12 lg:col-span-6">
            <p className="t-kicker text-accent" data-reveal>
              For your family
            </p>
            <h2 id="family-title" className="t-headline-xl mt-5 max-w-[14ch]" data-reveal>
              Make one for someone you love.
            </h2>
          </div>
          <p className="t-body col-span-12 self-end text-ink-2 lg:col-span-5 lg:col-start-8" data-reveal>
            Describe them in a sentence. We&rsquo;ll print their paper every morning, in their language and at their size,
            delivered by email or ready to forward on WhatsApp. A trusted thing to share, instead of another forward.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-[var(--col-gap)] sm:grid-cols-2 lg:grid-cols-4">
          {PAPERS.map((p) => (
            <figure key={p.lang} className="flex flex-col border border-rule bg-paper-raised p-5" data-reveal>
              <div className="flex justify-between">
                <span className="t-mono text-ink-3">No. 1</span>
                <span className="t-mono uppercase text-ink-3">{p.lang}</span>
              </div>
              <span className="rule mt-3" />
              <p lang={p.lang} dir={p.dir} translate="no" className={`${p.font} ${p.size} py-4 text-center`}>
                {p.masthead}
              </p>
              <span className="rule-heavy" />
              <span className="rule mt-[2px]" />
              <div className="mt-4 space-y-[6px]" aria-hidden>
                {[100, 100, 92, 100, 70].map((w, i) => (
                  <span key={i} className="block h-[3px] bg-ink/10" style={{ width: `${w}%` }} />
                ))}
              </div>
              <figcaption className="mt-5 flex-1 font-serif text-[0.98rem] italic leading-[1.45] text-ink-2">{p.note}</figcaption>
              <p className="t-meta mt-4">{p.from}</p>
            </figure>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-x-7 gap-y-3" data-reveal>
          <a href="/onboarding?for=someone" className="btn-ink">
            Make a paper for someone <span className="arrow" aria-hidden>→</span>
          </a>
          <p className="t-meta">Any language. Large print. Free while in beta.</p>
        </div>
      </div>
    </section>
  );
}
