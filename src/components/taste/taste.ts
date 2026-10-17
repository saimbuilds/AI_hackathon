"use client";

import { api, browserClient, token } from "@/components/session/client";

// "What your paper has learned about you". Prefers GET /api/me/taste (backend-computed); until that is
// live it derives the same picture from the reader's own rows under RLS: profiles.topic_beta (a Beta
// posterior per topic), interests (what they told us) and the last day of events (what changed).

export type TasteTopic = {
  slug: string;
  label: string;
  /** 0..1, how much this reader reads the topic (Beta mean). */
  score: number;
  /** 0..1, how sure the paper is (evidence behind the score). */
  confidence: number;
  /** They named it at onboarding. */
  stated: boolean;
};
export type TasteChange = { label: string; dir: "up" | "down"; why: string };
export type Taste = { topics: TasteTopic[]; avoided: TasteTopic[]; changes: TasteChange[]; memo: string | null; signals: number; headline?: string };

const LABELS: Record<string, string> = {
  ai: "AI", f1: "Formula 1", "us-politics": "US politics", "uk-politics": "UK politics", "law-justice": "Law and justice", "pakistan-economy": "Pakistan’s economy",
  "pakistan-politics": "Pakistani politics", "pakistan-society": "Pakistani society", "jobs-careers": "Jobs and careers", "global-economy": "The global economy",
  "russia-ukraine": "The war in Ukraine", "middle-east": "The Middle East", "south-asia": "South Asia", "latin-america": "Latin America", "consumer-tech": "Consumer tech",
  "positive-news": "Good news", "mental-health": "Mental health", "real-estate": "Real estate", "social-media": "Social media", geopolitics: "World affairs",
};
const PROPER = /^(Pakistan|Pakistani|Pakistan’s|India|China|Europe|Africa|South|Latin|Middle|Formula|Olympics)/;
/** "US politics" and "Pakistani politics" stay, "Cricket" becomes "cricket": for labels inside a sentence. */
export const inSentence = (label: string) => (/^[A-Z][a-z]/.test(label) && !PROPER.test(label) ? label.charAt(0).toLowerCase() + label.slice(1) : label);
export const topicLabel = (slug: string) => {
  if (LABELS[slug]) return LABELS[slug];
  const s = slug.replace(/-/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const WEIGHT: Record<string, number> = { more: 1, save: 0.6, read_end: 0.4, click_original: 0.3, open: 0.15, less: -1, skip: -0.2, mute: -1 };
const WHY: Record<string, string> = { more: "you asked for more", save: "you saved one", read_end: "you read to the end", click_original: "you read the original", open: "you opened it", less: "you asked for less", skip: "you skipped it", mute: "you muted it" };

type Beta = Record<string, [number, number]>;
type Interests = { topics?: string[]; negativeTopics?: string[] } | null;

function fromBeta(beta: Beta, interests: Interests): Pick<Taste, "topics" | "avoided"> {
  const stated = new Set(interests?.topics ?? []);
  const all = Object.entries(beta)
    .filter(([, v]) => Array.isArray(v) && v.length === 2)
    .map(([slug, [a, b]]) => ({
      slug,
      label: topicLabel(slug),
      score: a / (a + b),
      // A fresh topic starts near 2 pseudo-reads; about 10 is "sure".
      confidence: Math.max(0.08, Math.min(1, (a + b - 1.5) / 9)),
      stated: stated.has(slug),
    }));
  return {
    topics: all.filter((t) => t.score >= 0.5).sort((x, y) => y.score * (0.5 + y.confidence) - x.score * (0.5 + x.confidence)),
    avoided: all.filter((t) => t.score < 0.5).sort((x, y) => x.score - y.score),
  };
}

async function changesSinceYesterday(): Promise<{ changes: TasteChange[]; signals: number }> {
  const sb = browserClient();
  if (!sb) return { changes: [], signals: 0 };
  const since = new Date(Date.now() - 36 * 3600_000).toISOString();
  const { data: ev } = await sb.from("events").select("type,story_id").gte("created_at", since).in("type", Object.keys(WEIGHT)).limit(400);
  const rows = (ev ?? []) as { type: string; story_id: string | null }[];
  const ids = [...new Set(rows.map((r) => r.story_id).filter((x): x is string => !!x))];
  if (!ids.length) return { changes: [], signals: rows.length };
  const { data: st } = await sb.from("stories").select("id,topics").in("id", ids.slice(0, 150));
  const topicsOf = new Map(((st ?? []) as { id: string; topics: string[] | null }[]).map((s) => [s.id, s.topics ?? []]));
  const net = new Map<string, { w: number; top: string; topW: number }>();
  for (const r of rows) {
    const w = WEIGHT[r.type] ?? 0;
    for (const t of (r.story_id && topicsOf.get(r.story_id)) || []) {
      const cur = net.get(t) ?? { w: 0, top: r.type, topW: 0 };
      cur.w += w;
      if (Math.abs(w) > Math.abs(cur.topW)) {
        cur.top = r.type;
        cur.topW = w;
      }
      net.set(t, cur);
    }
  }
  const changes = [...net.entries()]
    .filter(([, v]) => Math.abs(v.w) >= 0.4)
    .sort((a, b) => Math.abs(b[1].w) - Math.abs(a[1].w))
    .slice(0, 4)
    .map(([slug, v]) => ({ label: topicLabel(slug), dir: v.w > 0 ? ("up" as const) : ("down" as const), why: WHY[v.top] ?? "your reading" }));
  return { changes, signals: rows.length };
}

function templateMemo(t: Pick<Taste, "topics" | "avoided">): string | null {
  const top = t.topics.slice(0, 3).map((x) => inSentence(x.label));
  const skip = t.avoided.slice(0, 2).map((x) => inSentence(x.label));
  if (!top.length) return null;
  const list = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}` : xs[0]);
  return `You read ${list(top)} more than anything else.${skip.length ? ` You pass on ${list(skip)}.` : ""}`;
}

const STRENGTH: Record<string, number> = { new: 0.25, growing: 0.55, strong: 0.9 };

/** GET /api/me/taste (docs/API.md "Learning made visible"). */
function fromEndpoint(r: Record<string, unknown>): Taste | null {
  const likes = Array.isArray(r.likes) ? (r.likes as Record<string, unknown>[]) : [];
  if (!likes.length) return null;
  const avoids = Array.isArray(r.avoids) ? (r.avoids as Record<string, unknown>[]) : [];
  const topics: TasteTopic[] = likes.map((o) => ({
    slug: String(o.topic),
    label: typeof o.label === "string" ? o.label : topicLabel(String(o.topic)),
    score: Math.max(0.05, Math.min(1, Number(o.score) || 0.5)),
    confidence: STRENGTH[String(o.strength)] ?? 0.4,
    stated: o.origin === "you said",
  }));
  const avoided: TasteTopic[] = avoids.map((o) => ({ slug: String(o.topic), label: typeof o.label === "string" ? o.label : topicLabel(String(o.topic)), score: 0.15, confidence: 0.6, stated: !!o.muted }));
  const changes: TasteChange[] = likes
    .map((o) => ({ o, d: Number(o.last24h) || 0 }))
    .filter((x) => Math.abs(x.d) >= 0.3)
    .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
    .slice(0, 4)
    .map(({ o, d }) => ({ label: typeof o.label === "string" ? o.label : topicLabel(String(o.topic)), dir: d > 0 ? ("up" as const) : ("down" as const), why: d > 0 ? "from what you read" : "from what you passed on" }));
  const sig = r.signals as { total?: number } | undefined;
  return { topics, avoided, changes, memo: typeof r.memo === "string" ? r.memo : null, signals: Number(sig?.total) || 0, headline: typeof r.headline === "string" ? r.headline : undefined };
}

let cached: { at: number; p: Promise<Taste | null> } | null = null;

export function loadTaste(): Promise<Taste | null> {
  if (cached && Date.now() - cached.at < 20_000) return cached.p;
  const p = (async () => {
    if (!(await token(false))) return null;
    try {
      const r = await api<Record<string, unknown>>("/api/me/taste");
      const t = fromEndpoint(r);
      if (t) return t;
    } catch {}
    const sb = browserClient();
    if (!sb) return null;
    const [{ data }, ch] = await Promise.all([sb.from("profiles").select("topic_beta,interests,memo").maybeSingle(), changesSinceYesterday().catch(() => ({ changes: [], signals: 0 }))]);
    if (!data) return null;
    const row = data as { topic_beta: Beta | null; interests: Interests; memo: string | null };
    const t = fromBeta(row.topic_beta ?? {}, row.interests);
    return { ...t, ...ch, memo: row.memo ?? templateMemo(t) };
  })();
  cached = { at: Date.now(), p };
  return p;
}

/** Forget the cached picture after the reader teaches the editor something. */
export function invalidateTaste() {
  cached = null;
}
