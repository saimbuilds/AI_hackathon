"use client";

import { useMemo, useState } from "react";
import { FrontPage, type PaperData } from "@/components/paper/FrontPage";
import { PillButton } from "@/components/ui/PillButton";
import { Check } from "@/components/ui/icons";
import { useSavedName } from "@/components/home/useSavedName";
import { api } from "@/components/session/client";
import { SavePaper } from "@/components/session/SavePaper";

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
  const [relation, setRelation] = useState("father");
  const [email, setEmail] = useState("");
  const [done, setDone] = useState<{ giftId: string; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const message = `${to}, I made you a morning paper. It arrives every day at 7, in ${lang === "ur" ? "Urdu" : "English"}${large ? ", in large print" : ""}. From ${from}.`;
  const link = `https://wa.me/?text=${encodeURIComponent(done ? `${message}\n\n${done.url}` : message)}`;

  return (
    <div className="container-page mt-16 grid gap-12 lg:grid-cols-12">
      <form
        className="grid content-start gap-5 lg:col-span-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            const r = await api<{ giftId: string; token: string; url: string }>("/api/gifts", {
              method: "POST",
              json: {
                forName: to,
                relation: relation.trim() || "family",
                fromName: from,
                text: about.trim() || undefined,
                language: lang,
                largePrint: large,
                tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Karachi",
                emailEveryMorning: delivery === "email" && email.includes("@"),
                recipientEmail: delivery === "email" && email.includes("@") ? email.trim() : undefined,
              },
            });
            setDone({ giftId: r.giftId, url: r.url });
          } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn’t make the paper. Try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="t-sm text-ink-3">Who is it for?</span>
            <input className="field mt-1.5" value={forName} onChange={(e) => setForName(e.target.value.slice(0, 16))} />
          </label>
          <label>
            <span className="t-sm text-ink-3">They are your</span>
            <input className="field mt-1.5" value={relation} onChange={(e) => setRelation(e.target.value.slice(0, 40))} placeholder="father" />
          </label>
          <label className="sm:col-span-2">
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
          {delivery === "email" && (
            <label className="mt-3 block">
              <span className="t-sm text-ink-3">Their email address</span>
              <input type="email" className="field mt-1.5" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="abbu@example.com" autoComplete="off" />
            </label>
          )}
        </fieldset>

        {done ? (
          <div className="rounded-[var(--r-md)] bg-leaf p-6" role="status">
            <p className="t-md flex items-center gap-2">
              <Check /> {to}’s paper is set up.
            </p>
            <p className="t-body mt-2">Print the first edition now, then send {to} the link. It opens without an account.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <PillButton href={`/press?gift=${done.giftId}`} tone="ink" size="sm">
                Print the first paper
              </PillButton>
              <PillButton href={link} target="_blank" rel="noreferrer" tone="sun" size="sm">
                Send {to} the link
              </PillButton>
            </div>
            <p className="t-sm mt-4 break-all">{done.url}</p>
          </div>
        ) : (
          <div>
            {error && (
              <p className="t-body mb-4 rounded-[var(--r-sm)] bg-sheet p-4" role="alert">
                {error}
              </p>
            )}
            <PillButton type="submit" tone="press" look="solid" size="lg" disabled={busy}>
              {busy ? "Making it…" : `Make ${to}’s paper`}
            </PillButton>
            <p className="t-sm mt-3 text-ink-3">$5 a month per paper after a free first week. Cancel any time.</p>
            <div className="mt-6">
              <SavePaper reason="So you can see their streak and change their paper from any device." />
            </div>
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
