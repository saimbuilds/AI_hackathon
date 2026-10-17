"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { BRAND } from "@/lib/brand";
import type { PaperData } from "@/components/paper/FrontPage";
import { FrontPage } from "@/components/paper/FrontPage";
import { Nav } from "@/components/ui/Nav";
import { PillButton } from "@/components/ui/PillButton";
import { Close, Mic, Plus } from "@/components/ui/icons";
import { useSavedName } from "@/components/home/useSavedName";
import { useClientValue, writeStored } from "@/components/ui/useStored";
import { parseSentence, guessCity } from "./parse";
import { SwipeDeck, type DeckCard, type SwipeAction } from "./SwipeDeck";
import { fetchDeck, serverParse, recordAndTranscribe, completeOnboarding, EXTRA_KEYS, type ServerParsed, type CompleteBody } from "./api";
import { signInWithGoogle } from "@/components/session/auth";
import { token } from "@/components/session/client";

const DRAFT_KEY = "ep-onboarding-draft";

const STEPS = ["Your paper", "About you", "Today’s headlines", "How it reads"] as const;
const SIZES = [
  { id: "espresso", label: "Espresso", note: "5 stories, 3 min", stories: 5, min: 3 },
  { id: "standard", label: "Standard", note: "10 stories, 6 min", stories: 10, min: 6 },
  { id: "long", label: "Long read", note: "15 stories, 12 min", stories: 15, min: 12 },
] as const;
const TONES = [
  { id: "straight", label: "Straight", note: "Just the facts" },
  { id: "new", label: "New to this", note: "Explains the background" },
  { id: "witty", label: "Witty", note: "A little personality" },
] as const;
const EXTRAS = ["Weather", "Prayer times", "Markets", "Cricket scores", "On this day", "Daily quiz"] as const;
const EXAMPLES = [
  "I’m a software engineer in Islamabad into AI, startups and cricket, but no celebrity news.",
  "Final-year student in Lahore, follow the economy and Formula 1, less politics please.",
];

type Profile = {
  name: string | null; // null until the reader edits it: shows the remembered name
  city: string | null; // null until edited: shows the city guessed from the time zone
  sentence: string;
  interests: string[];
  negatives: string[];
  role?: string;
  swipes: { storyId: string; action: SwipeAction }[];
  size: (typeof SIZES)[number]["id"];
  tone: (typeof TONES)[number]["id"];
  deliveryTime: string;
  extras: string[];
  calm: boolean;
  email: string;
};

function Chip({ label, onRemove, tone }: { label: string; onRemove: () => void; tone?: "press" }) {
  return (
    <span className="chip !h-10 !pr-1.5 !pl-4 text-[0.95rem]" data-tone={tone}>
      {label}
      <button type="button" onClick={onRemove} className="grid h-7 w-7 place-items-center rounded-full hover:bg-[rgb(28_29_26/0.08)]" aria-label={`Remove ${label}`}>
        <Close size={11} />
      </button>
    </span>
  );
}

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: readonly { id: T; label: string; note: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <fieldset>
      <legend className="t-sm text-ink-3">{label}</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {options.map((o) => (
          <label
            key={o.id}
            className={`cursor-pointer rounded-[var(--r-sm)] p-4 transition-colors ${value === o.id ? "bg-ink text-[var(--on-dark)]" : "bg-sheet hover:bg-newsprint-2"}`}
          >
            <input type="radio" className="sr-only" checked={value === o.id} onChange={() => onChange(o.id)} name={label} />
            <span className="t-body block font-semibold">{o.label}</span>
            <span className="t-sm block opacity-70">{o.note}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Onboarding({ deck: fallbackDeck, preview }: { deck: DeckCard[]; preview: PaperData }) {
  const router = useRouter();
  const [savedName, setSavedName] = useSavedName();
  const [step, setStep] = useState(0);
  const [listening, setListening] = useState(false);
  const [deck, setDeck] = useState<DeckCard[]>(fallbackDeck);
  const [server, setServer] = useState<ServerParsed | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsGoogle, setNeedsGoogle] = useState(false);
  const recording = useRef<{ stop?: () => void } | null>(null);
  const [newChip, setNewChip] = useState("");
  const [p, setP] = useState<Profile>({
    name: null,
    city: null,
    sentence: "",
    interests: [],
    negatives: [],
    swipes: [],
    size: "standard",
    tone: "straight",
    deliveryTime: "07:00",
    extras: ["Weather", "On this day", "Daily quiz"],
    calm: false,
    email: "",
  });
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((x) => ({ ...x, [k]: v }));
  const startedAt = useRef(0);
  // Start an anonymous session and swap in today's real deck as soon as it arrives.
  useEffect(() => {
    startedAt.current = Date.now();
    let live = true;
    token()
      .then(() => fetchDeck(12))
      .then((cards) => live && cards && setDeck(cards));
    return () => {
      live = false;
    };
  }, []);

  const guessedCity = useClientValue(guessCity, "");
  const name = p.name ?? savedName;
  const city = p.city ?? guessedCity;

  // Read the sentence as it's typed, keeping chips the reader removed out.
  const removed = useRef(new Set<string>());
  const setSentence = (text: string) =>
    setP((x) => {
      if (!text.trim()) return { ...x, sentence: text };
      const r = parseSentence(text);
      return {
        ...x,
        sentence: text,
        interests: [...new Set([...x.interests, ...r.interests])].filter((t) => !removed.current.has(t)),
        negatives: [...new Set([...x.negatives, ...r.negatives])].filter((t) => !removed.current.has(`-${t}`)),
        role: r.role ?? x.role,
        city: x.city ?? r.city ?? null,
      };
    });

  // The server read (LLM or its heuristic) refines the chips a moment after typing stops.
  const parseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const askServer = (text: string) => {
    if (parseTimer.current) clearTimeout(parseTimer.current);
    if (text.trim().length < 12) return;
    parseTimer.current = setTimeout(async () => {
      const r = await serverParse(text);
      if (!r) return;
      setServer(r);
      setP((x) => ({
        ...x,
        interests: [...new Set([...x.interests, ...r.interests])].filter((t) => !removed.current.has(t)).slice(0, 15),
        negatives: [...new Set([...x.negatives, ...r.negatives])].filter((t) => !removed.current.has(`-${t}`)).slice(0, 10),
        role: x.role ?? r.role ?? undefined,
        city: x.city ?? r.city ?? null,
      }));
    }, 700);
  };
  const onSentence = (text: string) => {
    setSentence(text);
    askServer(text);
  };

  // The live preview: every answer changes the page on the right.
  const kept = p.swipes.filter((s) => s.action !== "no").map((s) => deck.find((d) => d.storyId === s.storyId)!).filter(Boolean);
  const loved = p.swipes.filter((s) => s.action === "love").map((s) => deck.find((d) => d.storyId === s.storyId)!).filter(Boolean);
  const size = SIZES.find((s) => s.id === p.size)!;
  const live: PaperData = useMemo(() => {
    const lead = loved[0] ?? kept[0];
    const side = [...loved, ...kept].filter((c) => c !== lead).slice(0, 3);
    return {
      ...preview,
      paperName: BRAND.defaultPaperName(name.trim() || null),
      city: city || preview.city,
      stats: `${size.stories} stories, ${size.min} min`,
      lead: lead ? { kicker: lead.kicker, headline: lead.headline, dek: lead.dek } : preview.lead,
      side: side.length ? side.map((c) => ({ kicker: c.kicker, headline: c.headline })) : preview.side,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, city, p.swipes, p.size, preview]);

  const browserSpeech = () => {
    type SR = { lang: string; interimResults: boolean; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void; start: () => void };
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) return setListening(false);
    const rec = new Ctor();
    rec.lang = navigator.language || "en-GB";
    rec.interimResults = true;
    let heard = "";
    rec.onresult = (e) => {
      heard = Array.from(e.results).map((r) => r[0].transcript).join(" ");
      setSentence(heard);
    };
    rec.onend = () => {
      setListening(false);
      askServer(heard);
    };
    rec.start();
  };
  const listen = async () => {
    if (listening) return recording.current?.stop?.();
    setListening(true);
    setError(null);
    try {
      recording.current = {};
      const text = await recordAndTranscribe(recording.current);
      if (text === null) return browserSpeech();
      onSentence(text);
      setListening(false);
    } catch {
      setListening(false);
      setError("Couldn’t hear that. Check the microphone permission, or type it instead.");
    }
  };

  const canNext = step === 0 ? name.trim().length > 0 : step === 1 ? p.interests.length > 0 || p.sentence.trim().length > 8 : true;
  const finish = async (forSomeoneElse: boolean) => {
    setSavedName(name.trim());
    setBusy(true);
    setError(null);
    try {
      localStorage.setItem("ep-profile", JSON.stringify({ ...p, name: name.trim(), city, seconds: Math.round((Date.now() - startedAt.current) / 1000) }));
    } catch {}
    const body: CompleteBody = {
        name: name.trim(),
        paperName: BRAND.defaultPaperName(name.trim()),
        city: city || undefined,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        deliveryTime: p.deliveryTime,
        size: p.size,
        tone: p.tone,
        calm: p.calm,
        ...(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email) ? { email: p.email, emailOptIn: true } : {}),
        role: p.role?.slice(0, 80),
        extras: Object.fromEntries(Object.entries(EXTRA_KEYS).map(([label, k]) => [k, p.extras.includes(label)])),
        interests: {
          chips: p.interests.slice(0, 15),
          topics: (server?.topics ?? []).slice(0, 10),
          entities: (server?.entities ?? []).slice(0, 12),
          negatives: p.negatives.slice(0, 10),
          negativeTopics: (server?.negativeTopics ?? []).slice(0, 8),
        },
        swipes: p.swipes.slice(0, 30),
    };
    // No anonymous session available: keep the answers and finish after Google brings the reader back.
    if (!(await token())) {
      writeStored(DRAFT_KEY, JSON.stringify({ body, forSomeoneElse }));
      setBusy(false);
      setNeedsGoogle(true);
      return;
    }
    try {
      await completeOnboarding(body);
      router.push(forSomeoneElse ? "/gift" : "/press");
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Couldn’t save your answers. Try again.");
    }
  };

  // Back from Google with saved answers: complete onboarding and go straight to the press.
  useEffect(() => {
    if (!new URLSearchParams(location.search).has("resume")) return;
    let draft: { body: CompleteBody; forSomeoneElse: boolean } | null = null;
    try {
      draft = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null");
    } catch {}
    if (!draft) return;
    const d = draft;
    let live = true;
    token(false).then(async (t) => {
      if (!t || !live) return;
      try {
        await completeOnboarding(d.body);
        writeStored(DRAFT_KEY, null);
        router.replace(d.forSomeoneElse ? "/gift" : "/press");
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : "Couldn’t save your answers. Try again.");
      }
    });
    return () => {
      live = false;
    };
  }, [router]);

  return (
    <div className="min-h-dvh bg-newsprint">
      <Nav cta={null} />
      <main id="main" className="grid min-h-dvh lg:grid-cols-2">
        {/* ---------- Questions ---------- */}
        <section className="flex flex-col px-[var(--gutter)] pt-[calc(var(--nav-h)+var(--nav-top)+32px)] pb-10 md:px-12 lg:px-16" aria-labelledby="step-title">
          <ol className="flex gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
            {STEPS.map((s, i) => (
              <li key={s} className="flex-1">
                <span className={`block h-1.5 rounded-full transition-colors duration-300 ${i <= step ? "bg-ink" : "bg-newsprint-3"}`} />
                <span className={`t-xs mt-2 hidden sm:block ${i === step ? "text-ink" : "text-ink-3"}`}>{s}</span>
              </li>
            ))}
          </ol>
          {/* Phones: the preview pane is hidden, so the masthead itself shows the paper taking shape */}
          <p className="mt-6 flex items-baseline justify-between gap-3 rounded-[var(--r-sm)] bg-sun px-4 py-3 lg:hidden" aria-hidden>
            <span className="truncate font-blackletter text-[1.7rem] leading-none" translate="no">
              {live.paperName}
            </span>
            <span className="t-xs flex-none">{live.stats}</span>
          </p>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
              transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
              className="mt-10 flex-1 md:mt-12"
            >
              {step === 0 && (
                <>
                  <h1 id="step-title" className="t-lg max-w-[13ch]">
                    Whose paper is this?
                  </h1>
                  <p className="t-body-lg mt-5 max-w-[40ch] text-ink-2">Your first name goes on the masthead. Your city sets the weather and the local pages.</p>
                  <div className="mt-10 grid max-w-[520px] gap-3">
                    <label className="block">
                      <span className="t-sm text-ink-3">First name</span>
                      <input className="field mt-1.5" value={name} onChange={(e) => set("name", e.target.value.slice(0, 18))} placeholder="Your first name" autoComplete="given-name" autoFocus />
                    </label>
                    <label className="block">
                      <span className="t-sm text-ink-3">City</span>
                      <input className="field mt-1.5" value={city} onChange={(e) => set("city", e.target.value)} placeholder="Islamabad" autoComplete="address-level2" />
                    </label>
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <h1 id="step-title" className="t-lg max-w-[15ch]">
                    Tell us about you in one sentence.
                  </h1>
                  <p className="t-body-lg mt-5 max-w-[42ch] text-ink-2">What you do, what you follow, and what you’d rather not read about. Type it or say it.</p>
                  <div className="relative mt-8 max-w-[620px]">
                    <textarea
                      className="field min-h-[132px] resize-none pr-16 leading-[1.45]"
                      value={p.sentence}
                      onChange={(e) => onSentence(e.target.value)}
                      placeholder={EXAMPLES[0]}
                      aria-label="One sentence about you"
                    />
                    <button
                      type="button"
                      onClick={listen}
                      className={`menu-disc absolute right-3 bottom-3 ${listening ? "!bg-press" : "!bg-newsprint"}`}
                      aria-label={listening ? "Stop recording" : "Say it instead"}
                      aria-pressed={listening}
                    >
                      <Mic />
                    </button>
                  </div>
                  {!p.sentence && (
                    <div className="mt-3 flex max-w-[620px] flex-wrap gap-2">
                      {EXAMPLES.map((ex) => (
                        <button key={ex} type="button" className="chip !h-auto !py-2 text-left !whitespace-normal" data-tone="line" onClick={() => onSentence(ex)}>
                          {ex}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-8 max-w-[620px]">
                    <p className="t-sm text-ink-3">More of</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {p.interests.map((t) => (
                        <Chip
                          key={t}
                          label={t}
                          onRemove={() => {
                            removed.current.add(t);
                            set("interests", p.interests.filter((x) => x !== t));
                          }}
                        />
                      ))}
                      <form
                        className="flex"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const v = newChip.trim();
                          if (v && !p.interests.includes(v)) set("interests", [...p.interests, v]);
                          setNewChip("");
                        }}
                      >
                        <label className="chip !h-10 gap-1 !pr-2 !pl-3" data-tone="line">
                          <Plus size={12} />
                          <input value={newChip} onChange={(e) => setNewChip(e.target.value)} placeholder="Add a topic" className="w-28 bg-transparent outline-none placeholder:text-ink-3" aria-label="Add a topic" />
                        </label>
                      </form>
                    </div>
                    {p.negatives.length > 0 && (
                      <>
                        <p className="t-sm mt-5 text-ink-3">Less of</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {p.negatives.map((t) => (
                            <Chip
                              key={t}
                              label={t}
                              tone="press"
                              onRemove={() => {
                                removed.current.add(`-${t}`);
                                set("negatives", p.negatives.filter((x) => x !== t));
                              }}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <h1 id="step-title" className="t-lg max-w-[16ch]">
                    Twelve of today’s headlines. Keep or pass?
                  </h1>
                  <p className="t-body-lg mt-5 mb-10 max-w-[42ch] text-ink-2">Real stories from this morning’s press. Swipe right to keep, left to pass, up for the ones you love.</p>
                  <SwipeDeck cards={deck} onSwipe={(c, a) => setP((x) => ({ ...x, swipes: [...x.swipes, { storyId: c.storyId, action: a }] }))} />
                </>
              )}

              {step === 3 && (
                <>
                  <h1 id="step-title" className="t-lg max-w-[14ch]">
                    How should it read?
                  </h1>
                  <div className="mt-10 grid max-w-[680px] gap-8">
                    <Segmented label="Length" value={p.size} options={SIZES} onChange={(v) => set("size", v)} />
                    <Segmented label="Voice" value={p.tone} options={TONES} onChange={(v) => set("tone", v)} />
                    <fieldset>
                      <legend className="t-sm text-ink-3">On your doorstep at</legend>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {["06:00", "07:00", "08:00", "09:00"].map((t) => (
                          <button key={t} type="button" aria-pressed={p.deliveryTime === t} onClick={() => set("deliveryTime", t)} className={`chip t-num !h-11 !px-5 text-[1rem] ${p.deliveryTime === t ? "!bg-ink !text-[var(--on-dark)]" : ""}`}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                    <fieldset>
                      <legend className="t-sm text-ink-3">Extras</legend>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {EXTRAS.map((x) => {
                          const on = p.extras.includes(x);
                          return (
                            <button key={x} type="button" aria-pressed={on} onClick={() => set("extras", on ? p.extras.filter((e) => e !== x) : [...p.extras, x])} className="chip !h-11 !px-4 text-[0.95rem]" data-tone={on ? "sun" : undefined}>
                              {x}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>
                    <label className="flex cursor-pointer items-start gap-4 rounded-[var(--r-sm)] bg-sheet p-4">
                      <input type="checkbox" checked={p.calm} onChange={(e) => set("calm", e.target.checked)} className="mt-1 h-5 w-5 accent-[var(--ink)]" />
                      <span>
                        <span className="t-body block font-semibold">Calm mode</span>
                        <span className="t-sm block text-ink-3">Leaves out graphic stories and frames hard news with what’s being done about it.</span>
                      </span>
                    </label>
                    <div className="rounded-[var(--r-sm)] bg-sheet p-4">
                      <label className="block">
                        <span className="t-body block font-semibold">Send it to my inbox at {p.deliveryTime}</span>
                        <span className="t-sm block text-ink-3">One email a morning with your front page. Unsubscribe in one click. Leave it empty to read here only.</span>
                        <input
                          type="email"
                          className="field mt-3 !bg-newsprint"
                          value={p.email}
                          onChange={(e) => set("email", e.target.value.trim())}
                          placeholder="you@example.com"
                          autoComplete="email"
                          inputMode="email"
                        />
                      </label>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {error && (
            <p className="t-body mt-8 rounded-[var(--r-sm)] bg-sheet p-4" role="alert">
              {error}
            </p>
          )}
          {needsGoogle && (
            <div className="mt-8 max-w-[520px] rounded-[var(--r-md)] bg-sheet p-6" role="alert">
              <p className="t-md">One last step: sign in to print it.</p>
              <p className="t-body mt-2 text-ink-2">Your answers are saved. Continue with Google and your first paper prints straight after.</p>
              <div className="mt-5">
                <PillButton
                  tone="ink"
                  onClick={async () => {
                    const msg = await signInWithGoogle("/start?resume=1");
                    if (msg) setError(msg);
                  }}
                >
                  Continue with Google
                </PillButton>
              </div>
            </div>
          )}
          <div className="mt-12 flex flex-wrap items-center justify-between gap-3">
            <button type="button" className="tbtn" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} style={{ visibility: step === 0 ? "hidden" : undefined }}>
              Back
            </button>
            {step < 3 ? (
              <PillButton tone="press" look="solid" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
                {step === 2 ? (p.swipes.length < 4 ? "Skip the rest" : "Next") : "Next"}
              </PillButton>
            ) : (
              <div className="flex flex-wrap gap-2">
                <PillButton tone="sun" onClick={() => finish(true)} disabled={busy}>
                  It’s for someone I love
                </PillButton>
                <PillButton tone="press" look="solid" onClick={() => finish(false)} disabled={busy}>
                  {busy ? "Saving…" : "Print my paper"}
                </PillButton>
              </div>
            )}
          </div>
        </section>

        {/* ---------- Live preview ---------- */}
        <aside className="relative hidden overflow-hidden bg-sun lg:block" aria-label="Your paper, as you build it">
          <div className="sticky top-0 flex h-dvh flex-col items-center justify-center px-12 pt-[calc(var(--nav-h)+var(--nav-top))]">
            <div className="w-full max-w-[560px] rotate-[-2deg]">
              <FrontPage data={live} crop animateMasthead />
            </div>
            <p className="t-sm mt-6 text-ink-2">
              {p.interests.length ? `Your beat: ${p.interests.slice(0, 4).join(", ")}` : "Your paper updates as you answer."}
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
