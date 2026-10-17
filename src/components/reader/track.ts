"use client";

import type { EventType, ReaderEvent } from "@/types/events";

// Batches reader events and posts them to /api/events (contract: src/types/events.ts).
// Fire-and-forget: a missing or failing endpoint never breaks reading.
let queue: ReaderEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  timer = null;
  if (!queue.length) return;
  const events = queue.splice(0, 100);
  const body = JSON.stringify({ events });
  try {
    const token = localStorage.getItem("ep-token");
    // No session yet (the API needs one): keep a short local log instead of sending.
    if (!token) {
      const log = JSON.parse(localStorage.getItem("ep-events") ?? "[]") as ReaderEvent[];
      localStorage.setItem("ep-events", JSON.stringify([...log, ...events].slice(-200)));
      return;
    }
    fetch("/api/events", {
      method: "POST",
      keepalive: true,
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body,
    }).catch(() => {});
  } catch {}
}

export function track(editionId: string, type: EventType, storyId?: string, meta: ReaderEvent["meta"] = {}) {
  queue.push({ editionId, type, storyId, meta, at: new Date().toISOString() });
  if (process.env.NODE_ENV !== "production") console.debug("[event]", type, storyId ?? "", meta);
  if (!timer) timer = setTimeout(flush, 1500);
}

if (typeof window !== "undefined") {
  addEventListener("pagehide", flush);
}
