"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, browserClient, token, hasStoredSession } from "@/components/session/client";
import { useClientValue } from "@/components/ui/useStored";
import { useUser, isSaved, signOut } from "@/components/session/auth";
import { SavePaper } from "@/components/session/SavePaper";
import { listFollows, type Follow } from "@/components/follow/api";
import { PillButton } from "@/components/ui/PillButton";

type Profile = {
  name: string | null;
  paper_name: string | null;
  city: string | null;
  tz: string;
  delivery_time: string;
  size: string;
  tone: string;
  calm: boolean;
  streak: number | null;
  email: string | null;
  email_opt_in: boolean;
  plan: "free" | "plus" | null;
  memo: string | null;
  interests: { chips?: string[]; negatives?: string[] } | null;
};
type EditionRow = { id: string; date: string; number: number };
type Gift = { giftId: string; token: string; url: string; forName: string; relation: string; language: string; largePrint: boolean; latestEdition: EditionRow | null };
type Data = { profile: Profile | null; editions: EditionRow[]; follows: Follow[]; gifts: Gift[] };

const SIZE: Record<string, string> = { espresso: "Espresso, about 5 stories", standard: "Standard, about 10 stories", long: "Long read, about 15 stories" };
const TONE: Record<string, string> = { straight: "Straight", new: "New to this", witty: "Witty" };

async function load(): Promise<Data> {
  const sb = browserClient();
  if (!sb || !(await token(false))) return { profile: null, editions: [], follows: [], gifts: [] };
  const [p, e, f, g] = await Promise.all([
    sb.from("profiles").select("name,paper_name,city,tz,delivery_time,size,tone,calm,streak,email,email_opt_in,plan,memo,interests").maybeSingle(),
    sb.from("editions").select("id,date,number").order("date", { ascending: false }).order("number", { ascending: false }).limit(60),
    listFollows().catch(() => [] as Follow[]),
    api<{ gifts: Gift[] }>("/api/gifts").then((r) => r.gifts).catch(() => [] as Gift[]),
  ]);
  return { profile: (p.data as Profile | null) ?? null, editions: (e.data as EditionRow[] | null) ?? [], follows: f, gifts: g };
}

function Card({ title, children, bg = "var(--sheet)", className = "" }: { title: string; children: React.ReactNode; bg?: string; className?: string }) {
  return (
    <section className={`rounded-[var(--r-lg)] p-6 md:p-8 ${className}`} style={{ background: bg }}>
      <h2 className="t-sm text-ink-3">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** One place for a reader's paper: today's edition, habit, settings, follows, gifts, plan and account. */
export function Dashboard() {
  const router = useRouter();
  const session = useClientValue(hasStoredSession, false);
  const user = useUser();
  const [data, setData] = useState<Data | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let live = true;
    load().then((d) => live && setData(d));
    return () => {
      live = false;
    };
  }, [session]);

  if (!session || (data && !data.profile)) {
    return (
      <div className="container-page mt-16">
        <div className="max-w-[640px] rounded-[var(--r-lg)] bg-sheet p-8 md:p-10">
          <h2 className="t-lg">You don’t have a paper yet.</h2>
          <p className="t-body-lg mt-3 text-ink-2">It takes about 90 seconds: your name, one sentence about you, and a few headlines to keep or pass.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <PillButton href="/start" tone="press" look="solid">
              Print my paper
            </PillButton>
          </div>
          <div className="mt-8 border-t border-line pt-6">
            <SavePaper reason="Already have a paper on another device? Sign in to bring it here." />
          </div>
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="container-page mt-16 grid gap-3 md:grid-cols-3" aria-busy="true">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-56 animate-pulse rounded-[var(--r-lg)] bg-sheet" />
        ))}
      </div>
    );
  }

  const p = data.profile!;
  const latest = data.editions[0];
  const chips = p.interests?.chips ?? [];
  const followLimit = p.plan === "plus" ? null : 3;

  return (
    <div className="container-page mt-16 grid gap-3 md:grid-cols-6">
      {/* Today */}
      <Card title="Today" bg="var(--sun)" className="md:col-span-4">
        {latest ? (
          <>
            <p className="font-blackletter text-[clamp(2rem,1.4rem+2vw,3rem)] leading-none" translate="no">
              {p.paper_name ?? "Your paper"}
            </p>
            <p className="t-body mt-3">
              Edition No. {latest.number},{" "}
              {new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(new Date(`${latest.date}T00:00:00Z`))}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <PillButton href={`/paper?e=${latest.id}`} tone="press" look="solid">
                Read it
              </PillButton>
              <PillButton href={`/paper/end?e=${latest.id}`} tone="sun">
                The Daily 3
              </PillButton>
              <PillButton href={`/print/${latest.id}`} tone="ink" look="on-color">
                PDF
              </PillButton>
            </div>
          </>
        ) : (
          <>
            <p className="t-lg">Your first paper isn’t printed yet.</p>
            <div className="mt-6">
              <PillButton href="/press" tone="press" look="solid">
                Print it now
              </PillButton>
            </div>
          </>
        )}
      </Card>

      {/* Habit */}
      <Card title="Your streak" className="md:col-span-2">
        <p className="t-num text-[4.5rem] leading-[0.85] font-medium tracking-[-0.06em]">{p.streak ?? 0}</p>
        <p className="t-body mt-3 text-ink-2">
          {p.streak === 1 ? "day" : "days"} in a row. {data.editions.length} {data.editions.length === 1 ? "paper" : "papers"} printed so far.
        </p>
        <Link href="/archive" className="tbtn mt-3">
          Archive
        </Link>
      </Card>

      {/* Settings */}
      <Card title="How your paper reads" className="md:col-span-3">
        <dl className="t-body grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
          <dt className="text-ink-3">Arrives</dt>
          <dd>
            {p.delivery_time.slice(0, 5)} {p.city ? `in ${p.city}` : ""}
          </dd>
          <dt className="text-ink-3">Length</dt>
          <dd>{SIZE[p.size] ?? p.size}</dd>
          <dt className="text-ink-3">Voice</dt>
          <dd>
            {TONE[p.tone] ?? p.tone}
            {p.calm ? ", calm mode" : ""}
          </dd>
          <dt className="text-ink-3">Email</dt>
          <dd>{p.email && p.email_opt_in ? `Every morning to ${p.email}` : "Not by email. Read it here."}</dd>
        </dl>
        {chips.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-1.5">
            {chips.slice(0, 10).map((c) => (
              <span key={c} className="chip !bg-newsprint">
                {c}
              </span>
            ))}
          </div>
        )}
        {p.memo && <p className="mt-5 font-serif text-[1.05rem] leading-[1.45] text-ink-2 italic">“{p.memo}”</p>}
        <Link href="/start" className="tbtn mt-4">
          Change my answers
        </Link>
      </Card>

      {/* Following */}
      <Card title={`Following ${data.follows.length}${followLimit ? ` of ${followLimit}` : ""}`} className="md:col-span-3">
        {data.follows.length ? (
          <ul className="space-y-3">
            {data.follows.slice(0, 4).map((f) => (
              <li key={f.id}>
                <p className="font-serif text-[1.1rem] leading-[1.25]">{f.question}</p>
                {f.latestUpdate && <p className="t-sm mt-1 text-ink-2">Update: {f.latestUpdate.summary}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="t-body text-ink-2">Ask a question in your paper, or follow a story, and changes open tomorrow’s edition.</p>
        )}
        <Link href="/following" className="tbtn mt-4">
          Everything you follow
        </Link>
      </Card>

      {/* Gifts */}
      <Card title="Papers you give" bg="var(--cyan)" className="md:col-span-4">
        {data.gifts.length ? (
          <ul className="space-y-3">
            {data.gifts.map((g) => (
              <li key={g.giftId} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-md)] bg-sheet p-4">
                <div>
                  <p className="t-md">The {g.forName} Times</p>
                  <p className="t-sm text-ink-3">
                    For your {g.relation}, {g.language === "ur" ? "in Urdu" : "in English"}
                    {g.largePrint ? ", large print" : ""}
                    {g.latestEdition ? `. Latest: No. ${g.latestEdition.number}` : ". Not printed yet"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a href={`/gift/${g.token}`} className="chip !h-10 !px-4" data-tone="sun">
                    Open
                  </a>
                  <button
                    type="button"
                    className="chip !h-10 !px-4"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(g.url);
                        setCopied(g.giftId);
                        setTimeout(() => setCopied(null), 1600);
                      } catch {}
                    }}
                  >
                    {copied === g.giftId ? "Copied" : "Copy link"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="t-body">A paper for your parents, in their language and type size, signed from you.</p>
        )}
        <div className="mt-5">
          <PillButton href="/gift" tone="ink" look="on-color" size="sm">
            {data.gifts.length ? "Make another" : "Make a gift paper"}
          </PillButton>
        </div>
      </Card>

      {/* Plan */}
      <Card title="Your plan" className="md:col-span-2">
        <p className="t-lg">{p.plan === "plus" ? "Endpaper+" : "Free"}</p>
        <p className="t-body mt-2 text-ink-2">
          {p.plan === "plus" ? "Unlimited follows, audio and your newsletters." : "Your daily paper and 3 follows. Endpaper+ adds unlimited follows, audio and your newsletters."}
        </p>
        {p.plan !== "plus" && (
          <div className="mt-5">
            <PillButton href="/pricing" tone="press" size="sm">
              See Endpaper+
            </PillButton>
          </div>
        )}
      </Card>

      {/* Account */}
      <Card title="Account" className="md:col-span-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            {isSaved(user) ? (
              <>
                <p className="t-body">Saved to {user!.email}. Your paper follows you to any device.</p>
                <button type="button" className="tbtn mt-2" onClick={() => signOut().then(() => router.push("/"))}>
                  Sign out
                </button>
              </>
            ) : (
              <SavePaper reason="Right now this paper lives in this browser. Save it to keep your streak and read it on your phone." />
            )}
          </div>
          <div className="flex flex-wrap items-start gap-2 md:justify-end">
            <PillButton href="/privacy#delete" tone="sun" size="sm">
              Download or delete my data
            </PillButton>
          </div>
        </div>
      </Card>
    </div>
  );
}
