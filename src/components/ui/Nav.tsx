"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Wordmark } from "./Wordmark";
import { SheetGlyph } from "./icons";

const PRIMARY = [
  { href: "/#how", label: "How it works" },
  { href: "/paper", label: "Sample paper" },
  { href: "/gift", label: "For family" },
  { href: "/pricing", label: "Pricing" },
];
const SECONDARY = [
  { href: "/archive", label: "Archive" },
  { href: "/lab", label: "Learning Lab" },
  { href: "/newsroom", label: "Newsroom" },
  { href: "/privacy", label: "Privacy" },
];

export function Nav({
  cta = { href: "/start", label: "Print my paper" },
  right,
}: {
  cta?: { href: string; label: string } | null;
  right?: ReactNode; // replaces the CTA box (e.g. reading progress)
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuId = useId();
  const discRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on route change, Esc and outside click; return focus to the disc.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        discRef.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !discRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    panelRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <header className="nav">
      <div className="relative">
        <nav className="nav-box gap-1 pl-4 md:pl-5" aria-label="Main">
          <Link href="/" className="mr-auto flex h-11 items-center pr-3 md:mr-6 lg:mr-14" aria-label="Endpaper, home">
            <Wordmark />
          </Link>
          <ul className="hidden items-center lg:flex">
            {PRIMARY.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="nav-link" aria-current={pathname === l.href ? "page" : undefined}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <button
            ref={discRef}
            type="button"
            className="menu-disc ml-2 lg:ml-3"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <i />
            <i />
          </button>
        </nav>

        <div
          id={menuId}
          ref={panelRef}
          hidden={!open}
          className="menu-panel absolute left-0 top-[calc(100%+8px)] w-[min(92vw,560px)] rounded-[var(--r-md)] bg-sheet p-3"
        >
          <ul>
            {PRIMARY.map((l, i) => (
              <li key={l.href} style={{ animationDelay: `${40 + i * 35}ms` }} className="menu-item">
                <Link href={l.href} className="flex items-center justify-between rounded-[var(--r-sm)] px-4 py-3 t-lg hover:bg-newsprint">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2 border-t border-line px-2 pt-4 pb-1">
            {SECONDARY.map((l) => (
              <Link key={l.href} href={l.href} className="chip" data-tone="line">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {right}
      {!right && cta && (
        <Link href={cta.href} className="nav-box group gap-3 pl-4 md:pl-5" aria-label={cta.label}>
          <span className="hidden text-[1.0625rem] font-medium tracking-[-0.025em] sm:inline">{cta.label}</span>
          <span className="sm:hidden text-[1rem] font-medium tracking-[-0.025em]">Print</span>
          <span className="menu-disc !bg-press transition-transform group-hover:scale-[1.07]" aria-hidden>
            <SheetGlyph className="text-ink transition-transform duration-500 [transition-timing-function:var(--ease-bounce)] group-hover:-rotate-12" />
          </span>
        </Link>
      )}
    </header>
  );
}
