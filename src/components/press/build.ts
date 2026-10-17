"use client";

import { BuildProgressSchema, type BuildProgress } from "@/types/events";
import { browserClient, token } from "@/components/session/client";

export type PressEvent = BuildProgress | { step: "needs-onboarding" };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// The same steps the real press streams, for builds without a configured backend (local demos only).
async function* simulate(forName: string): AsyncGenerator<PressEvent> {
  yield { step: "reading", articles: 1243, sources: 212 };
  await wait(900);
  yield { step: "reading", articles: 3214, sources: 530 };
  await wait(1100);
  yield { step: "clustering", stories: 311 };
  await wait(1300);
  yield { step: "picking", picked: 14, forName };
  await wait(1200);
  yield { step: "layout" };
  await wait(900);
  yield { step: "note" };
  await wait(900);
  yield { step: "done", editionId: "c038b80c-eb78-4317-ad6a-9eae883cee20" };
}

/** POST /api/edition/build as an SSE stream over fetch (EventSource can't send the bearer token). */
export async function* buildStream(forName: string, opts: { giftId?: string; rebuild?: boolean } = {}): AsyncGenerator<PressEvent> {
  if (!browserClient()) return yield* simulate(forName);
  const t = await token(false);
  if (!t) return yield { step: "needs-onboarding" };

  let res: Response;
  try {
    res = await fetch("/api/edition/build", {
      method: "POST",
      headers: { authorization: `Bearer ${t}`, "content-type": "application/json" },
      body: JSON.stringify({ rebuild: !!opts.rebuild, ...(opts.giftId ? { giftId: opts.giftId } : {}) }),
    });
  } catch {
    return yield { step: "error", message: "The press can’t be reached. Check your connection", retryable: true };
  }
  if (!res.ok || !res.body) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; retryAfterSeconds?: number };
    if (res.status === 404 && !opts.giftId) return yield { step: "needs-onboarding" };
    const message = body.error ?? `The press answered ${res.status}`;
    return yield { step: "error", message: message.replace(/\.$/, ""), retryable: res.status >= 500 || res.status === 409 };
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const l of lines) {
      if (!l.startsWith("data:")) continue;
      try {
        const parsed = BuildProgressSchema.safeParse(JSON.parse(l.slice(5)));
        if (parsed.success) yield parsed.data;
      } catch {}
    }
  }
}
