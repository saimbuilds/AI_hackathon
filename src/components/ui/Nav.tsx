"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Wordmark } from "./Wordmark";
import { SheetGlyph } from "./icons";
import { useUser, isSaved, signInWithGoogle, signOut } from "@/components/session/auth";
import { useClientValue } from "./useStored";
import { hasStoredSession } from "@/components/session/client";

/** Bottom of the menu: who holds this paper, or a way back into one on a new device. */
function Account() {
  const user = useUser();
  const [note, setNote] = useState<string | null>(null);
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line px-2 pt-4 pb-1">
      {isSaved(user) ? (
        <>
          <span className="t-sm text-ink-3">Signed in as {user!.email}</span>
          <button type="button" className="tbtn !min-h-0 text-[0.9rem]" onClick={() => signOut()}>
            Sign out
          </button>
        </>
      ) : (
        <>
          <span className="t-sm text-ink-3">{note ?? "Already have a paper?"}</span>
          <button
            type="button"
            className="tbtn !min-h-0 text-[0.9rem]"
            onClick={async () => {
              const msg = await signInWithGoogle();
              if (msg) setNote(msg.includes("not enabled") ? "Google sign-in isn’t switched on yet." : msg);
            }}
          >
            Sign in with Google
          </button>
        </>
      )}
    </div>
  );
}

const PRIMARY = [
  { href: "/#how", label: "How it works" },
  { href: "/paper", label: "Sample paper" },
  { href: "/gift", label: "For family" },
  { href: "/pricing", label: "Pricing" },
];
const SECONDARY = [
  { href: "/me", label: "My paper" },
  { href: "/following", label: "Following" },
  { href: "/archive", label: "Archive" },
  { href: "/lab", label: "Learning Lab" },
  { href: "/newsroom", label: "Newsroom" },
  { href: "/trust", label: "Trust & security" },
  { href: "/privacy", label: "Privacy" },
];

export function Nav({
  cta: ctaProp,
  right,
}: {
  cta?: { href: string; label: string; short?: string } | null;
  right?: ReactNode; // replaces the CTA box (e.g. reading progress)
}) {
  const [open, setOpen] = useState(false);
  // Readers who already have a session go to their paper; new visitors are invited to print one.
  const hasSession = useClientValue(hasStoredSession, false);
  const cta =
    ctaProp === undefined
      ? hasSession
        ? { href: "/me", label: "My paper", short: "Mine" }
        : { href: "/start", label: "Print my paper", short: "Print" }
      : ctaProp;
  const pathname = usePathname();
  const menuId = useId();
  const discRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on route change (adjusted during render), Esc and outside click; return focus to the disc.
  const [shownFor, setShownFor] = useState(pathname);
  if (shownFor !== pathname) {
    setShownFor(pathname);
    setOpen(false);
  }
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
          <Account />
        </div>
      </div>

      {right}
      {!right && cta && (
        <Link href={cta.href} className="nav-box group gap-3 pl-4 md:pl-5" aria-label={cta.label}>
          <span className="hidden text-[1.0625rem] font-medium tracking-[-0.025em] sm:inline">{cta.label}</span>
          <span className="sm:hidden text-[1rem] font-medium tracking-[-0.025em]">{cta.short ?? "Print"}</span>
          <span className="menu-disc !bg-press transition-transform group-hover:scale-[1.07]" aria-hidden>
            <SheetGlyph className="text-ink transition-transform duration-500 [transition-timing-function:var(--ease-bounce)] group-hover:-rotate-12" />
          </span>
        </Link>
      )}
    </header>
  );
}
