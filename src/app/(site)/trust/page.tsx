import type { Metadata } from "next";
import { PageShell } from "@/components/ui/PageShell";
import { PillButton } from "@/components/ui/PillButton";

export const metadata: Metadata = { title: "Trust & security · Endpaper" };

const GROUPS = [
  {
    title: "The news is checked",
    bg: "var(--sun)",
    points: [
      "Every story is built from several outlets and says how many confirmed it. Single-source stories are labelled.",
      "Every sentence in a brief carries its sources. Sentences that can’t be traced back to one are dropped before print.",
      "The AI may choose and frame stories. It is never allowed to change a fact, and a fact-check pass runs on every brief.",
      "We publish our grounding rate: the share of sentences verified against their sources on each press run.",
    ],
  },
  {
    title: "The AI is fenced in",
    bg: "var(--sheet)",
    points: [
      "Articles we read are treated as untrusted text, wrapped in markers and never followed as instructions.",
      "Every AI answer must match a strict format and is validated before it reaches you. If it fails, the paper still prints from verified sentences.",
      "No AI-made news images, and no financial or medical advice in the “For you” lines.",
      "Answers to your questions come only from stories in the press, with their sources. If the news hasn’t covered it, we say so.",
    ],
  },
  {
    title: "Your data stays yours",
    bg: "var(--leaf)",
    points: [
      "Database rules mean each reader can only ever read their own rows: their profile, editions and reading history.",
      "Every request carries a signed session token; nothing is identified by cookies or trackers.",
      "No ads and no selling attention. We don’t measure time spent, so we have no reason to keep you reading.",
      "Download everything we keep about you, or delete it, in one click.",
    ],
  },
  {
    title: "Abuse is kept out",
    bg: "var(--cyan)",
    points: [
      "Every input is checked against a strict schema before it is used.",
      "Rate limits on sign-up, printing, questions and sharing stop scripts from flooding the press.",
      "A human check can be switched on for sign-up and printing if bots show up.",
      "Secret keys live only on the server and are never sent to your browser.",
    ],
  },
];

export default function TrustPage() {
  return (
    <PageShell plate="ink" title="Trust is the product." intro="A paper you rely on every morning has to be accurate, honest about what it doesn’t know, and careful with you. Here is how Endpaper does that.">
      <div className="container-page mt-16 grid gap-3 md:grid-cols-2">
        {GROUPS.map((g) => (
          <section key={g.title} className="rounded-[var(--r-lg)] p-8 md:p-10" style={{ background: g.bg }}>
            <h2 className="t-lg">{g.title}</h2>
            <ul className="mt-6 space-y-4">
              {g.points.map((p) => (
                <li key={p} className="t-body flex gap-3">
                  <span className="mt-[0.55em] h-2 w-2 flex-none rounded-full bg-ink" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div className="container-page mt-10 flex flex-wrap gap-3">
        <PillButton href="/privacy" tone="sun">
          Privacy and your data
        </PillButton>
        <PillButton href="/lab" tone="cyan">
          See the Learning Lab
        </PillButton>
      </div>
    </PageShell>
  );
}
