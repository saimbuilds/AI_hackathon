"use client";

import { useMemo, useState } from "react";
import { FrontPage, type PaperData } from "@/components/paper/FrontPage";
import { PillButton } from "@/components/ui/PillButton";
import { Check } from "@/components/ui/icons";
import { useSavedName } from "@/components/home/useSavedName";

type Lang = "en" | "ur";
type Delivery = "whatsapp" | "email" | "print";

/** Describe someone, pick their language and type size, and watch their paper set itself. */
export function GiftBuilder({ english, urdu }: { english: PaperData; urdu: PaperData }) {
  const [fromName, setFromName] = useSavedName();
  const [forName, setForName] = useState("Abbu");
  const [about, setAbout] = useState("Retired banker in Rawalpindi. Cricket and markets. Reads Urdu.");
  const [lang, setLang] = useState<Lang>("ur");
  const [large, setLarge] = useState(true);
  const [delivery, setDelivery] = useState<Delivery>("whatsapp");
  const [done, setDone] = useState(false);
  const from = fromName.trim() || "Saim";
  const to = forName.trim() || "Abbu";

  const preview: PaperData = useMemo(() => {
    if (lang === "ur") {
      return { ...urdu, ears: { left: urdu.ears!.left, right: [`${to} کے لیے، ${from} کی طرف سے`] } };
    }
    return {
      ...english,
      paperName: `The ${to} Times`,
      ears: { left: english.ears!.left, right: [`Compiled for ${to}`, `by ${from}`] },
    };
  }, [lang, to, from, english, urdu]);

  const link = `https://wa.me/?text=${encodeURIComponent(`${to}, I made you a morning paper. It arrives every day at 7, in ${lang === "ur" ? "Urdu" : "English"}${large ? ", in large print" : ""}. From ${from}.`)}`;

  return (
    <div className="container-page mt-16 grid gap-12 lg:grid-cols-12">
      <form
        className="grid content-start gap-5 lg:col-span-5"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            localStorage.setItem("ep-gift", JSON.stringify({ forName: to, fromName: from, about, lang, large, delivery }));
          } catch {}
          setDone(true);
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="t-sm text-ink-3">Who is it for?</span>
            <input className="field mt-1.5" value={forName} onChange={(e) => setForName(e.target.value.slice(0, 16))} />
          </label>
          <label>
            <span className="t-sm text-ink-3">From</span>
            <input className="field mt-1.5" value={fromName} placeholder="Saim" onChange={(e) => setFromName(e.target.value.slice(0, 16))} />
          </label>
        </div>
        <label>
          <span className="t-sm text-ink-3">Describe them in a sentence</span>
          <textarea className="field mt-1.5 min-h-[110px] resize-none leading-[1.45]" value={about} onChange={(e) => setAbout(e.target.value)} />
        </label>

        <fieldset>
          <legend className="t-sm text-ink-3">Language</legend>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {([
              ["ur", "اردو", "Urdu, Nastaliq type"],
              ["en", "English", "Plain English"],
            ] as const).map(([v, l, n]) => (
              <button key={v} type="button" aria-pressed={lang === v} onClick={() => setLang(v)} className={`rounded-[var(--r-sm)] p-4 text-left transition-colors ${lang === v ? "bg-ink text-[var(--on-dark)]" : "bg-sheet hover:bg-newsprint-2"}`}>
                <span className="t-md block">{l}</span>
                <span className="t-sm block opacity-70">{n}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-[var(--r-sm)] bg-sheet p-4">
          <span>
            <span className="t-body block font-semibold">Large print</span>
            <span className="t-sm block text-ink-3">Bigger type and fewer, longer stories.</span>
          </span>
          <input type="checkbox" checked={large} onChange={(e) => setLarge(e.target.checked)} className="h-5 w-5 accent-[var(--ink)]" />
        </label>

        <fieldset>
          <legend className="t-sm text-ink-3">Delivered every morning by</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {([
              ["whatsapp", "WhatsApp"],
              ["email", "Email"],
              ["print", "Printed PDF"],
            ] as const).map(([v, l]) => (
              <button key={v} type="button" aria-pressed={delivery === v} onClick={() => setDelivery(v)} className="chip !h-11 !px-4 text-[0.95rem]" data-tone={delivery === v ? "sun" : undefined}>
                {l}
              </button>
            ))}
          </div>
        </fieldset>

        {done ? (
          <div className="rounded-[var(--r-md)] bg-leaf p-6" role="status">
            <p className="t-md flex items-center gap-2">
              <Check /> {to}’s paper is set up.
            </p>
            <p className="t-body mt-2">Send {to} the news first. Every gift paper has your name in the masthead ear.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <PillButton href={link} target="_blank" rel="noreferrer" tone="ink" size="sm">
                Tell {to} on WhatsApp
              </PillButton>
              <button type="button" className="tbtn" onClick={() => setDone(false)}>
                Edit
              </button>
            </div>
          </div>
        ) : (
          <div>
            <PillButton type="submit" tone="press" look="solid" size="lg">
              Make {to}’s paper
            </PillButton>
            <p className="t-sm mt-3 text-ink-3">$5 a month per paper after a free first week. Cancel any time.</p>
          </div>
        )}
      </form>

      <div className="lg:col-span-7">
        <div className="sticky top-[calc(var(--nav-h)+var(--nav-top)+24px)] rounded-[var(--r-lg)] bg-cyan p-6 md:p-12">
          <div className="mx-auto max-w-[520px] rotate-[1.5deg]">
            <FrontPage data={preview} crop large={large} />
          </div>
          <p className="t-sm mt-6 text-center">
            Preview of {to}’s paper, {lang === "ur" ? "in Urdu" : "in English"}
            {large ? ", large print" : ""}.
          </p>
        </div>
      </div>
    </div>
  );
}
