"use client";

import type { EventType, ReaderEvent } from "@/types/events";
import { token } from "@/components/session/client";
import { writeStored } from "@/components/ui/useStored";

// Batches reader events and posts them to /api/events (contract: src/types/events.ts).
// Fire-and-forget: a failing endpoint never breaks reading. The server's streak is stored for the last page.
const queue: ReaderEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
export const SAMPLE_EDITION_ID = "c038b80c-eb78-4317-ad6a-9eae883cee20"; // the fixture edition: never sent

async function flush() {
  timer = null;
  const events = queue.splice(0, 100).filter((e) => e.editionId !== SAMPLE_EDITION_ID);
  if (!events.length) return;
  const t = await token(false).catch(() => null);
  if (!t) return; // no session: nothing to learn from
  try {
    const res = await fetch("/api/events", {
      method: "POST",
      keepalive: true,
      headers: { "content-type": "application/json", authorization: `Bearer ${t}` },
      body: JSON.stringify({ events }),
    });
    if (res.ok) {
      const j = (await res.json()) as { streak?: number };
      if (typeof j.streak === "number") writeStored("ep-server-streak", String(j.streak));
    }
  } catch {}
}

export function track(editionId: string, type: EventType, storyId?: string, meta: ReaderEvent["meta"] = {}) {
  queue.push({ editionId, type, storyId, meta, at: new Date().toISOString() });
  if (process.env.NODE_ENV !== "production") console.debug("[event]", type, storyId ?? "", meta);
  if (!timer) timer = setTimeout(() => void flush(), type === "caught_up" ? 200 : 1500);
}

if (typeof window !== "undefined") {
  addEventListener("pagehide", () => void flush());
}
