import { PillButton } from "@/components/ui/PillButton";
import { Check } from "@/components/ui/icons";

export function ReadyCta() {
  return (
    <section className="panel-top relative z-10 -mt-[var(--r-lg)] bg-sun pt-[18vh] pb-[calc(16vh+var(--r-lg))]" aria-labelledby="ready-title">
      <div className="container-page flex flex-col items-center text-center">
        <h2 id="ready-title" className="t-mega max-w-[11ch]">
          Six minutes, then done.
        </h2>
        <p className="t-body-lg mt-8 max-w-[36ch] text-ink-2">
          Tell us your name and one sentence about you. Your first paper prints in about ten seconds, and the next one
          is on your doorstep at 7.
        </p>
        <div className="mt-9">
          <PillButton href="/start" tone="press" size="lg">
            Print my first paper
          </PillButton>
        </div>
        <ul className="mt-[12vh] grid w-full max-w-[900px] gap-4 text-left sm:grid-cols-3 sm:text-center">
          {["No account to start", "One email a day, at most", "Free, every morning"].map((t) => (
            <li key={t} className="t-body flex items-center gap-3 sm:justify-center">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-sun">
                <Check size={12} />
              </span>
              {t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
