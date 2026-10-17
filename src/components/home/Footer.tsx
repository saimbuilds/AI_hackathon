import Link from "next/link";
import { PillButton } from "@/components/ui/PillButton";
import { Squiggle } from "@/components/ui/Squiggle";
import { NextEdition } from "./NextEdition";

const COLS = [
  [
    { href: "/#how", label: "How it works" },
    { href: "/paper", label: "Sample paper" },
    { href: "/gift", label: "Gift a paper" },
    { href: "/pricing", label: "Pricing" },
    { href: "/archive", label: "Archive" },
  ],
  [
    { href: "/lab", label: "Learning Lab" },
    { href: "/newsroom", label: "Newsroom" },
    { href: "/privacy", label: "Privacy" },
    { href: "/privacy#delete", label: "Delete my data" },
  ],
];

/** Revealed underneath the page: the last sheet of the site. */
export function Footer() {
  return (
    <footer className="sticky bottom-0 z-0 bg-press text-ink">
      <div className="container-page flex min-h-[100svh] flex-col justify-between pt-[calc(var(--nav-h)+var(--nav-top)+48px)] pb-8 md:min-h-[min(100svh,860px)]">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="t-body-lg max-w-[30ch]">
              Tomorrow’s paper is already being written. Tell us who it’s for and it will be waiting at 7.
            </p>
            <div className="mt-7">
              <PillButton href="/start" tone="sun" look="on-color">
                Print my paper
              </PillButton>
            </div>
          </div>
          <nav className="grid grid-cols-2 gap-x-10 gap-y-2 md:col-span-4 md:col-start-9" aria-label="Footer">
            {COLS.map((col, i) => (
              <ul key={i} className="space-y-1.5">
                {col.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="t-body underline-offset-4 hover:underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ))}
          </nav>
        </div>

        <div className="mt-20 grid items-end gap-10 md:grid-cols-12">
          <p className="t-mega md:col-span-8" aria-label="See you at 7.">
            See you <Squiggle color="var(--sun)" weight={6}>at 7.</Squiggle>
          </p>
          <div className="md:col-span-4 md:text-right">
            <NextEdition />
          </div>
        </div>

        <div className="t-sm mt-14 flex flex-col justify-between gap-3 border-t border-[rgb(28_29_26/0.2)] pt-6 sm:flex-row">
          <span>© 2026 Endpaper. Built in Islamabad for NaSCon ’26.</span>
          <span className="font-semibold tracking-[0.02em]">— 30 —</span>
        </div>
      </div>
    </footer>
  );
}
