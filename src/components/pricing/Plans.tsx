"use client";

import { useState } from "react";
import { PillButton } from "@/components/ui/PillButton";
import { Check } from "@/components/ui/icons";

type Plan = {
  id: "free" | "plus" | "gift" | "teams";
  name: string;
  price: string;
  per: string;
  local?: string;
  bg: string;
  points: string[];
  cta: string;
};

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    per: "forever",
    bg: "var(--sheet)",
    points: ["Your daily paper, about ten stories", "Ask the news, and follow 3 questions", "PDF to print or forward", "Archive, streak and the Daily 3"],
    cta: "Print my paper",
  },
  {
    id: "plus",
    name: "Endpaper+",
    price: "$4",
    per: "a month",
    local: "PKR 399 in Pakistan",
    bg: "var(--sun)",
    points: ["Unlimited follows and “since you asked” alerts", "Audio edition for the commute", "Your newsletters, folded into the paper", "Sunday long read and monthly Wrapped"],
    cta: "Join Endpaper+",
  },
  {
    id: "gift",
    name: "Gift",
    price: "$5",
    per: "a month per paper",
    local: "or $49 a year",
    bg: "var(--cyan)",
    points: ["A paper for someone else", "Urdu or English, large print", "WhatsApp, email or print delivery", "See their streak from your account"],
    cta: "Make a gift paper",
  },
  {
    id: "teams",
    name: "Teams",
    price: "$8",
    per: "a seat a month",
    bg: "var(--press)",
    points: ["A shared brief on your industry", "Competitors, regulation, deals", "Delivered to Slack at 9", "A team Daily 3"],
    cta: "Join the waitlist",
  },
];

/** Four plans. Plus and Teams are fake doors for now: we count the interest before we build. */
export function Plans() {
  const [interest, setInterest] = useState<Plan["id"] | null>(null);
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);

  return (
    <div className="container-page mt-16">
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((p) => (
          <li key={p.id} className="flex min-h-[520px] flex-col rounded-[var(--r-lg)] p-7" style={{ background: p.bg }}>
            <h2 className="t-md">{p.name}</h2>
            <p className="mt-8 flex items-baseline gap-2">
              <span className="t-num text-[4.5rem] leading-[0.85] font-medium tracking-[-0.06em]">{p.price}</span>
              <span className="t-body opacity-75">{p.per}</span>
            </p>
            <p className="t-sm mt-2 min-h-[1.4em] opacity-75">{p.local}</p>
            <ul className="mt-8 flex-1 space-y-3">
              {p.points.map((x) => (
                <li key={x} className="t-body flex gap-3">
                  <span className="mt-1 grid h-5 w-5 flex-none place-items-center rounded-full bg-ink text-[var(--on-dark)]">
                    <Check size={10} />
                  </span>
                  {x}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              {p.id === "free" ? (
                <PillButton href="/start" tone="sun" look="ink">
                  {p.cta}
                </PillButton>
              ) : p.id === "gift" ? (
                <PillButton href="/gift" tone="sun">
                  {p.cta}
                </PillButton>
              ) : (
                <PillButton
                  tone={p.id === "plus" ? "press" : "sun"}
                  onClick={() => {
                    setInterest(p.id);
                    setSaved(false);
                    try {
                      const k = "ep-interest";
                      const prev = JSON.parse(localStorage.getItem(k) ?? "[]") as string[];
                      localStorage.setItem(k, JSON.stringify([...prev, `${p.id}:${new Date().toISOString()}`]));
                    } catch {}
                  }}
                >
                  {p.cta}
                </PillButton>
              )}
            </div>
          </li>
        ))}
      </ul>

      {interest && (
        <div className="mt-6 rounded-[var(--r-lg)] bg-ink p-7 text-[var(--on-dark)] md:p-10" role="status">
          {saved ? (
            <p className="t-md text-[var(--on-dark)]">Thanks. That tells us to build {interest === "plus" ? "Endpaper+" : "Teams"} next.</p>
          ) : (
            <form
              className="grid items-end gap-4 md:grid-cols-[1fr_auto]"
              onSubmit={(e) => {
                e.preventDefault();
                if (!email.includes("@")) return;
                try {
                  localStorage.setItem("ep-waitlist", JSON.stringify({ plan: interest, email, at: new Date().toISOString() }));
                } catch {}
                setSaved(true);
              }}
            >
              <label>
                <span className="t-md block text-[var(--on-dark)]">{interest === "plus" ? "Endpaper+ opens soon." : "Teams is in private testing."} Want to be first?</span>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="field mt-4 max-w-[420px] text-ink" autoComplete="email" />
              </label>
              <PillButton type="submit" tone="sun" look="solid">
                Tell me when it opens
              </PillButton>
            </form>
          )}
        </div>
      )}

      <section className="mt-24 grid gap-10 md:grid-cols-12" aria-labelledby="why-title">
        <h2 id="why-title" className="t-xl md:col-span-5">
          Why it can stay free
        </h2>
        <div className="t-body-lg space-y-5 text-ink-2 md:col-span-6 md:col-start-7">
          <p>The expensive work, reading and checking every story, happens once overnight and is shared by every reader. Your paper only adds the last step: choosing and framing it for you.</p>
          <p>That costs about a quarter of a cent per edition. We never sell ads against your attention, so we have no reason to keep you reading past the last page.</p>
        </div>
      </section>
    </div>
  );
}
