"use client";

import { api, ApiError } from "@/components/session/client";
import type { DeckCard, SwipeAction } from "./SwipeDeck";

// Onboarding calls (docs/API.md). Each degrades: the screen keeps working on local data if a call fails.

export type ServerParsed = {
  interests: string[];
  topics: string[];
  entities: string[];
  negatives: string[];
  negativeTopics: string[];
  role?: string | null;
  city?: string | null;
  goals?: string | null;
};

export async function fetchDeck(n = 12): Promise<DeckCard[] | null> {
  try {
    const r = await api<{ cards: { storyId: string; headline: string; dek?: string | null; category?: string | null; outlets?: number }[] }>(`/api/onboarding/deck?n=${n}`);
    if (!r.cards?.length) return null;
    return r.cards.map((c) => ({ storyId: c.storyId, headline: c.headline, dek: c.dek ?? "", kicker: c.category ?? "Today", outlets: c.outlets ?? 1 }));
  } catch {
    return null;
  }
}

export async function serverParse(text: string): Promise<ServerParsed | null> {
  try {
    const r = await api<{ parsed: ServerParsed }>("/api/onboarding/parse", { method: "POST", json: { text } });
    return r.parsed;
  } catch {
    return null;
  }
}

/** Records up to `maxMs` of audio and transcribes it on the server. Returns null when the browser should fall back to Web Speech. */
export async function recordAndTranscribe(signal: { stop?: () => void }, maxMs = 15000): Promise<string | null> {
  if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) return null;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<void>((res) => (rec.onstop = () => res()));
  rec.start();
  const timer = setTimeout(() => rec.state !== "inactive" && rec.stop(), maxMs);
  signal.stop = () => rec.state !== "inactive" && rec.stop();
  await done;
  clearTimeout(timer);
  stream.getTracks().forEach((t) => t.stop());
  const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
  const form = new FormData();
  form.append("file", blob, "sentence.webm");
  form.append("language", (navigator.language || "en").slice(0, 2));
  try {
    const r = await api<{ text: string }>("/api/transcribe", { method: "POST", body: form });
    return r.text;
  } catch (e) {
    if (e instanceof ApiError && e.body.useBrowserSpeech) return null;
    throw e;
  }
}

export type CompleteBody = {
  name: string;
  paperName: string;
  city?: string;
  tz: string;
  deliveryTime: string;
  size: "espresso" | "standard" | "long";
  tone: "straight" | "new" | "witty";
  calm: boolean;
  role?: string;
  extras: Partial<Record<"weather" | "prayer" | "markets" | "cricket" | "onThisDay" | "quiz" | "audio", boolean>>;
  interests: { chips: string[]; topics: string[]; entities: string[]; negatives: string[]; negativeTopics: string[] };
  swipes: { storyId: string; action: SwipeAction }[];
};

export async function completeOnboarding(body: CompleteBody): Promise<void> {
  await api("/api/onboarding/complete", { method: "POST", json: body });
  // A friend's shared story waiting to be claimed (from /s/[token]) joins the first paper.
  try {
    const share = localStorage.getItem("ep-share-claim");
    if (share) {
      await api(`/api/share/${share}/claim`, { method: "POST", json: {} }).catch(() => {});
      localStorage.removeItem("ep-share-claim");
    }
  } catch {}
}

export const EXTRA_KEYS: Record<string, keyof CompleteBody["extras"]> = {
  Weather: "weather",
  "Prayer times": "prayer",
  Markets: "markets",
  "Cricket scores": "cricket",
  "On this day": "onThisDay",
  "Daily quiz": "quiz",
};
