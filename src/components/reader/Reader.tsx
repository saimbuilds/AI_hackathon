"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Edition, StorySlot } from "@/types/edition";
import { Nav } from "@/components/ui/Nav";
import { PillButton } from "@/components/ui/PillButton";
import { Chevron } from "@/components/ui/icons";
import { Masthead } from "@/components/paper/Masthead";
import { allSlots, formatEditionDate } from "@/components/paper/FrontPage";
import { useNextEdition } from "@/components/home/NextEdition";
import { StoryItem } from "./StoryItem";
import { StoryDrawer } from "./StoryDrawer";
import { StoriesMode } from "./StoriesMode";
import { EditionToggle } from "./EditionToggle";
import { useReadState } from "./useReadState";
import { track } from "./track";

function weekDay(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  const day = Math.floor((d.getTime() - start) / 86400000) + 1;
  const t = new Date(d);
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const week = Math.ceil(((t.getTime() - Date.UTC(t.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
  return { week, day };
}

function Progress({ read, total }: { read: number; total: number }) {
  const r = 17;
  const c = 2 * Math.PI * r;
  return (
    <Link href="/paper/end" className="nav-box group gap-3 pl-4 md:pl-5" aria-label={`${read} of ${total} stories read. Go to the last page`}>
      <span className="t-num text-[1.0625rem] font-medium tracking-[-0.025em]">
        {read} of {total}
        <span className="hidden sm:inline"> read</span>
      </span>
      <span className="relative grid h-11 w-11 place-items-center rounded-full bg-newsprint" aria-hidden>
        <svg width="44" height="44" viewBox="0 0 44 44" className="absolute inset-0 -rotate-90">
          <circle cx="22" cy="22" r={r} fill="none" stroke="var(--press)" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - read / Math.max(total, 1))} style={{ transition: "stroke-dashoffset 600ms var(--ease-out)" }} />
        </svg>
        <span className="text-[0.7rem] font-semibold">{Math.round((read / Math.max(total, 1)) * 100)}%</span>
      </span>
    </Link>
  );
}

function SectionHead({ title, note }: { title: string; note?: string }) {
  return (
    <div className="flex items-end justify-between gap-4 border-b-2 border-[var(--paper-ink)] pb-3">
      <h2 className="t-md">{title}</h2>
      {note && <span className="t-sm text-ink-3">{note}</span>}
    </div>
  );
}

export function Reader({ edition }: { edition: Edition }) {
  const slots = useMemo(() => allSlots(edition), [edition]);
  const { read, saved, markRead, toggleSave } = useReadState(edition.id);
  const [open, setOpen] = useState<StorySlot | null>(null);
  const [stories, setStories] = useState(false);
  const next = useNextEdition();
  const { week, day } = weekDay(edition.date);
  const minutes = Math.round(slots.reduce((m, s) => m + s.readMinutes, 0));

  // URL is state: ?story=<id> opens a story, Back closes it.
  const openStory = useCallback(
    (s: StorySlot, push = true) => {
      setOpen(s);
      markRead(s.storyId);
      track(edition.id, "open", s.storyId);
      if (push) history.pushState({ story: s.storyId }, "", `?story=${s.storyId}`);
    },
    [edition.id, markRead],
  );
  const close = useCallback(() => {
    setOpen(null);
    if (location.search.includes("story=")) history.pushState({}, "", location.pathname);
  }, []);

  useEffect(() => {
    track(edition.id, "edition_open");
    const fromUrl = () => {
      const id = new URLSearchParams(location.search).get("story");
      const s = id ? slots.find((x) => x.storyId === id) : null;
      setOpen(s ?? null);
      if (s) markRead(s.storyId);
    };
    fromUrl();
    addEventListener("popstate", fromUrl);
    return () => removeEventListener("popstate", fromUrl);
  }, [edition.id, slots, markRead]);

  // Keyboard: J/K move between stories, Enter opens (native button).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open || stories || e.metaKey || e.ctrlKey || (e.target as Element | null)?.closest?.("input,textarea")) return;
      if (e.key !== "j" && e.key !== "k") return;
      const items = [...document.querySelectorAll<HTMLButtonElement>(".story-item")];
      const i = items.indexOf(document.activeElement as HTMLButtonElement);
      const n = e.key === "j" ? Math.min(items.length - 1, i + 1) : Math.max(0, i - 1);
      items[n]?.focus();
      items[n]?.scrollIntoView({ block: "center", behavior: "smooth" });
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open, stories]);

  const idx = open ? slots.findIndex((s) => s.storyId === open.storyId) : -1;
  const nextStory = idx >= 0 ? slots[idx + 1] : undefined;
  const onAction = (type: "more" | "less" | "save" | "share" | "click_original", meta?: Record<string, unknown>) => {
    if (!open) return;
    if (type === "save") toggleSave(open.storyId);
    track(edition.id, type, open.storyId, meta);
  };
  const item = (s: StorySlot, variant: "lead" | "major" | "minor" | "brief") => (
    <StoryItem key={s.storyId} s={s} variant={variant} read={read.has(s.storyId)} onOpen={openStory} />
  );

  return (
    <div className="edition-scope min-h-dvh bg-newsprint text-ink">
      <Nav right={<Progress read={read.size} total={slots.length} />} />
      <main id="main" className="pt-[calc(var(--nav-h)+var(--nav-top)*2)] pb-20">
        <div className="container-page">
          <div className="rounded-[var(--r-lg)] bg-[var(--paper-bg)] px-5 pt-6 pb-10 text-[var(--paper-ink)] md:px-10 md:pt-8 lg:px-14">
            {/* ---------- Masthead + ears ---------- */}
            <header>
              <div className="t-sm flex items-start justify-between gap-4">
                <div>
                  <p>Edition No. {edition.number}</p>
                  <p className="text-ink-3">
                    Week {week}, day {day}
                  </p>
                </div>
                <div className="hidden text-center sm:block">
                  <EditionToggle />
                </div>
                <div className="text-right">
                  <p>{edition.city}</p>
                  {edition.weather && (
                    <p className="t-num text-ink-3">
                      {edition.weather.hi}° / {edition.weather.lo}°
                    </p>
                  )}
                </div>
              </div>
              <div className="mx-auto mt-2 max-w-[1100px] [&_.paper-masthead]:!m-0 [&_.paper-masthead]:text-[clamp(2.6rem,1rem+7.4vw,8.4rem)]">
                <Masthead name={edition.paperName} />
              </div>
              <div className="t-sm mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-y-2 border-[var(--paper-ink)] py-2.5">
                <span>{formatEditionDate(edition.date)}</span>
                <span className="t-num">
                  {slots.length} stories, {minutes} min
                </span>
                <span className="t-num text-ink-3">Next edition in {next ?? "…"}</span>
              </div>
            </header>

            {/* ---------- Front: note | lead | everyone's front page ---------- */}
            <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-0">
              <aside className="order-2 lg:order-1 lg:col-span-3 lg:pr-8">
                <p className="t-sm font-semibold">From your editor</p>
                <p className="mt-3 font-serif text-[1.12rem] leading-[1.5] text-pretty italic">{edition.editorNote}</p>
                <div className="mt-8 rounded-[var(--r-md)] bg-newsprint p-5">
                  <p className="t-sm font-semibold">On this day</p>
                  <p className="mt-2 font-serif text-[1.02rem] leading-[1.45]">{edition.extras.onThisDay}</p>
                </div>
              </aside>
              <section className="order-1 lg:order-2 lg:col-span-6 lg:border-x lg:border-[var(--paper-rule)] lg:px-8" aria-label="Lead story">
                {item(edition.lead, "lead")}
              </section>
              <aside className="order-3 lg:col-span-3 lg:pl-8" aria-label="Everyone’s front page">
                <p className="t-sm font-semibold">Everyone’s front page</p>
                <p className="t-xs mt-1 text-ink-3">The same story for every reader today, so nobody lives in a bubble.</p>
                <div className="mt-4 space-y-6">{edition.everyonesFrontPage.map((s) => item(s, "minor"))}</div>
              </aside>
            </div>

            {/* ---------- Sections ---------- */}
            {edition.sections.map((sec) => (
              <section key={sec.name} className="mt-16" aria-label={sec.name}>
                <SectionHead title={sec.name} note={`${sec.slots.length} ${sec.slots.length === 1 ? "story" : "stories"}`} />
                <div className="mt-6 grid gap-x-8 gap-y-10 md:grid-cols-12">
                  {sec.slots.map((s) => (
                    <div key={s.storyId} className={s.size === "major" ? "md:col-span-6" : "md:col-span-6 lg:col-span-3"}>
                      {item(s, s.size === "major" ? "major" : "minor")}
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {/* ---------- Off your beat + briefs ---------- */}
            <div className="mt-16 grid gap-8 md:grid-cols-12">
              <section className="rounded-[var(--r-lg)] bg-cyan p-6 text-ink md:col-span-7 md:p-9" aria-label="Off your beat">
                <p className="t-sm font-semibold">Off your beat</p>
                <p className="t-xs mt-1 opacity-75">One story outside your usual interests, picked to keep your paper wide.</p>
                <div className="mt-6 space-y-8 [&_.text-\[\#c2321a\]]:!text-ink">{edition.offYourBeat.map((s) => item(s, "major"))}</div>
              </section>
              <section className="md:col-span-5" aria-label="In other news">
                <SectionHead title="In other news" />
                <div className="mt-5 divide-y divide-[var(--paper-rule)]">
                  {edition.briefs.map((s) => (
                    <div key={s.storyId} className="py-4 first:pt-0">
                      {item(s, "brief")}
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* ---------- The end of the paper ---------- */}
            <section className="mt-20 flex flex-col items-center rounded-[var(--r-lg)] bg-sun px-6 py-16 text-center text-ink">
              <p className="text-[3rem] leading-none font-semibold tracking-[-0.04em] text-[#c2321a]">— 30 —</p>
              <h2 className="t-xl mt-6 max-w-[14ch]">That’s the whole paper.</h2>
              <p className="t-body-lg mt-5 max-w-[38ch] text-ink-2">
                Three things to remember, three questions everyone gets today, and you’re done until 7 tomorrow.
              </p>
              <div className="mt-8">
                <PillButton href="/paper/end" tone="press" look="solid" size="lg">
                  Finish my paper
                </PillButton>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Phones: read it as stories */}
      <div className="fixed inset-x-3 bottom-3 z-40 md:hidden">
        <button type="button" onClick={() => setStories(true)} className="pbtn w-full justify-between !bg-ink !text-[var(--on-dark)]" data-tone="sun">
          <span className="pbtn__label">Read as stories</span>
          <span className="pbtn__disc" aria-hidden>
            <Chevron />
          </span>
        </button>
      </div>

      <StoryDrawer
        story={open}
        saved={open ? saved.has(open.storyId) : false}
        onClose={close}
        onAction={onAction}
        nextHeadline={nextStory?.headline}
        onNext={nextStory ? () => openStory(nextStory) : undefined}
      />
      {stories && (
        <StoriesMode
          edition={edition}
          slots={slots}
          onClose={() => setStories(false)}
          onSeen={(s) => markRead(s.storyId)}
          onOpenStory={(s) => {
            setStories(false);
            openStory(s);
          }}
        />
      )}
    </div>
  );
}
