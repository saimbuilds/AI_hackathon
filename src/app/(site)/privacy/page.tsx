import type { Metadata } from "next";
import { PageShell } from "@/components/ui/PageShell";
import { DeleteData } from "@/components/privacy/DeleteData";

export const metadata: Metadata = { title: "Privacy · Endpaper" };

const POINTS = [
  { t: "What we keep", b: "Your first name, city, the sentence you wrote about yourself, and what you open, save, skip or answer in your paper. That’s how your editor learns." },
  { t: "What we never do", b: "Sell your data, show you ads, or track you across other sites. We have no reason to keep you scrolling, so we don’t measure time spent." },
  { t: "Where it lives", b: "In one database where each reader can only read their own rows, plus the overnight job that prints your paper. Stories come from public news feeds, and every one links back to its sources." },
  { t: "Gift papers", b: "The person you make a paper for gets their own private paper. You see their streak, never what they read." },
];

export default function PrivacyPage() {
  return (
    <PageShell plate="leaf" title="Your paper, your data." intro="Plain answers about what Endpaper keeps and why. No dark patterns, no small print.">
      <div className="container-page mt-16 grid gap-3 md:grid-cols-2">
        {POINTS.map((p) => (
          <section key={p.t} className="rounded-[var(--r-lg)] bg-sheet p-8">
            <h2 className="t-md">{p.t}</h2>
            <p className="t-body-lg mt-4 text-ink-2">{p.b}</p>
          </section>
        ))}
      </div>
      <DeleteData />
    </PageShell>
  );
}
