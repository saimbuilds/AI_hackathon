const TIERS = [
  {
    name: "The paper",
    price: "Free",
    per: "",
    lines: ["Your paper every morning, about ten stories", "Web, phone and printable PDF", "The Daily 3, streaks and your archive"],
    cta: { label: "Print my paper", href: "/onboarding" },
    primary: true,
  },
  {
    name: "Endpaper Plus",
    price: "$4",
    per: "/ month",
    lines: ["Your own sources: newsletters, blogs, channels", "The audio edition for your commute", "Unlimited beats and a Sunday long read"],
    cta: { label: "Join the list", href: "/waitlist?plan=plus" },
  },
  {
    name: "A gift paper",
    price: "$5",
    per: "/ month each",
    lines: ["A paper for someone you love", "Their language, large print", "Emailed daily or ready for WhatsApp"],
    cta: { label: "Make a gift paper", href: "/onboarding?for=someone" },
  },
];

export function Pricing() {
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="relative border-t border-rule">
      <div className="page py-[clamp(4.5rem,9vw,8rem)]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="t-kicker text-accent" data-reveal>
              Pricing
            </p>
            <h2 id="pricing-title" className="t-headline-xl mt-5" data-reveal>
              Cheaper than a newspaper.
            </h2>
          </div>
          <p className="t-meta max-w-[36ch]" data-reveal>
            The daily paper is free. We make money when you want more of it, or want it for someone else.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 border-t border-ink md:grid-cols-3">
          {TIERS.map((t, i) => (
            <div
              key={t.name}
              data-reveal
              className={`flex flex-col py-9 md:px-[var(--col-gap)] ${i > 0 ? "border-t border-rule md:border-l md:border-t-0" : ""} ${
                i === 0 ? "md:pl-0" : ""
              }`}
            >
              <p className="t-kicker">{t.name}</p>
              <p className="mt-6 flex items-baseline gap-2">
                <span className="font-serif text-[3.25rem] font-[420] leading-none tracking-[-0.03em]">{t.price}</span>
                <span className="t-meta">{t.per}</span>
              </p>
              <ul className="mt-7 flex-1 space-y-3">
                {t.lines.map((l) => (
                  <li key={l} className="flex gap-3 font-serif text-[1.02rem] leading-[1.45] text-ink-2">
                    <span aria-hidden className="mt-[0.62em] inline-block h-px w-3 shrink-0 bg-ink-3" />
                    {l}
                  </li>
                ))}
              </ul>
              <a href={t.cta.href} className={`mt-9 self-start ${t.primary ? "btn-ink" : "btn-quiet"}`}>
                {t.cta.label}
                {t.primary ? (
                  <span className="arrow" aria-hidden>
                    →
                  </span>
                ) : null}
              </a>
            </div>
          ))}
        </div>
        <p className="t-meta mt-8 border-t border-rule pt-6" data-reveal>
          For teams: a shared morning brief on your industry, competitors and regulators.{" "}
          <a href="/waitlist?plan=teams" className="link-ink text-ink">
            Join the teams waitlist
          </a>
        </p>
      </div>
    </section>
  );
}
