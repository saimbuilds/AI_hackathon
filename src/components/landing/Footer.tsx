import { BRAND } from "@/lib/brand";

export function Footer() {
  return (
    <footer className="relative border-t border-ink">
      <div className="page pb-10 pt-[clamp(4rem,9vw,8rem)]">
        <div className="grid grid-cols-12 gap-x-[var(--col-gap)] gap-y-10">
          <div className="col-span-12 lg:col-span-7">
            <p className="t-headline-xl max-w-[16ch]" data-reveal>
              Tomorrow&rsquo;s paper is already being written.
            </p>
            <a href="/onboarding" className="btn-ink mt-9" data-reveal>
              Print my paper <span className="arrow" aria-hidden>→</span>
            </a>
          </div>
          <nav aria-label="Footer" className="col-span-6 sm:col-span-3 lg:col-span-2 lg:col-start-9">
            <p className="t-kicker text-ink-3">Product</p>
            <ul className="mt-4 space-y-2.5 t-ui">
              <li><a href="#how" className="link-ink">How it works</a></li>
              <li><a href="#family" className="link-ink">For your family</a></li>
              <li><a href="#pricing" className="link-ink">Pricing</a></li>
            </ul>
          </nav>
          <nav aria-label="Legal" className="col-span-6 sm:col-span-3 lg:col-span-2">
            <p className="t-kicker text-ink-3">Company</p>
            <ul className="mt-4 space-y-2.5 t-ui">
              <li><a href="/privacy" className="link-ink">Privacy</a></li>
              <li><a href="/terms" className="link-ink">Terms</a></li>
              <li><a href="mailto:hello@endpaper.app" className="link-ink">Contact</a></li>
            </ul>
          </nav>
        </div>

        <p
          aria-hidden
          translate="no"
          className="mt-[clamp(4rem,9vw,8rem)] select-none font-serif text-[clamp(4.5rem,20.5vw,19rem)] font-[440] leading-[0.8] tracking-[-0.055em]"
        >
          {BRAND.name}
          <span className="text-accent">.</span>
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-5">
          <p className="t-meta">Every story checked across outlets. Every source linked.</p>
          <p className="font-serif text-[0.95rem] tracking-[0.3em] text-accent">— 30 —</p>
        </div>
      </div>
    </footer>
  );
}
