"use client";

import { api, ApiError } from "@/components/session/client";

// Follow & Ask (backend: src/follow, docs/API.md). Answers come only from stories in the press.

export type AskSource = { storyId?: string; headline?: string; name: string; url: string };
export type AskResult = { answer: string; sentences?: { text: string; sources: number[] }[]; sources: AskSource[]; covered: boolean; watchId?: string; needsPlus?: boolean };
export type FollowUpdate = { summary: string; sources: AskSource[]; created_at: string };
export type Follow = {
  id: string;
  kind: "ask" | "story";
  question: string;
  answer?: string | null;
  sources?: AskSource[];
  created_at: string;
  latestUpdate?: FollowUpdate | null;
};
/** "Since you asked": what changed for a reader's follows, carried on the edition. */
export type EditionUpdate = { watchId: string; question: string; summary: string; sources: AskSource[]; storyId?: string };

export type FollowResult = { ok: true; watchId?: string } | { ok: false; needsPlus: boolean; message: string };

const asFollowError = (e: unknown): FollowResult => ({
  ok: false,
  needsPlus: e instanceof ApiError && (e.status === 402 || !!e.body.needsPlus),
  message: e instanceof Error ? e.message : "Couldn’t follow that right now.",
});

export async function ask(question: string, follow = false): Promise<AskResult> {
  return api<AskResult>("/api/ask", { method: "POST", json: { question, follow } });
}

export async function followStory(storyId: string): Promise<FollowResult> {
  try {
    const r = await api<{ watchId?: string; id?: string }>("/api/follow", { method: "POST", json: { storyId } });
    return { ok: true, watchId: r.watchId ?? r.id };
  } catch (e) {
    return asFollowError(e);
  }
}

export async function followQuestion(question: string): Promise<FollowResult> {
  try {
    const r = await api<{ watchId?: string; id?: string }>("/api/follow", { method: "POST", json: { question } });
    return { ok: true, watchId: r.watchId ?? r.id };
  } catch (e) {
    return asFollowError(e);
  }
}

export async function listFollows(): Promise<Follow[]> {
  const r = await api<{ follows?: Follow[]; watches?: Follow[] }>("/api/follows");
  return r.follows ?? r.watches ?? [];
}

export async function unfollow(id: string): Promise<void> {
  await api(`/api/follow/${id}`, { method: "DELETE" });
}

/** Editions built after Follow & Ask carry `updates`; older snapshots don't. */
export const editionUpdates = (e: object): EditionUpdate[] => {
  const u = (e as { updates?: unknown }).updates;
  return Array.isArray(u) ? (u as EditionUpdate[]) : [];
};
