// Online learning from reading signals. Pure functions, no I/O.
//   vec_long  : who you are         (slow, eta 0.05)
//   vec_short : what you're into now (fast, eta 0.3, decays daily toward vec_long)
//   topic_beta: Beta(alpha, beta) per topic; positives raise alpha, negatives raise beta
//   muted     : topics / sources the reader switched off
import { EVENT_WEIGHTS, type EventType, type ReaderEvent } from '../types/events';
import { addScaled, normalize } from '../lib/vec';

export const ETA_LONG = 0.05;
export const ETA_SHORT = 0.3;
export const TOPIC_STEP = 0.35; // alpha/beta increment per unit of event weight
export const DECAY = 0.97; // daily pull of topic_beta toward the uniform prior

export type LearnState = {
  vecLong: Float32Array | null;
  vecShort: Float32Array | null;
  topicBeta: Record<string, [number, number]>;
  muted: { topics: string[]; sources: string[]; stories: string[] };
  streak: number;
  lastReadOn: string | null; // YYYY-MM-DD in the reader's time zone
};

export type LearnEvent = { type: EventType; storyVec: Float32Array | null; topics: string[]; meta: ReaderEvent['meta'] };

// The server decides the weight; whatever the client sends is ignored.
export function eventWeight(type: EventType, meta: ReaderEvent['meta']): number {
  if (type === 'dwell') return (meta.seconds ?? 0) > 20 ? EVENT_WEIGHTS.dwell : 0;
  if (type === 'less' && meta.reason === 'already-knew') return 0; // they know it: that says nothing about taste
  return EVENT_WEIGHTS[type];
}

const dayBefore = (d: string) => new Date(Date.parse(`${d}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

// Move a taste vector toward (w > 0) or away from (w < 0) a story. With no vector yet, only a positive signal can seed one.
function pull(vec: Float32Array | null, story: Float32Array, eta: number, w: number): Float32Array | null {
  if (!vec) return w > 0 ? Float32Array.from(story) : null;
  const out = Float32Array.from(vec);
  addScaled(out, story, eta * w);
  return normalize(out);
}

export function applyEvents(state: LearnState, events: LearnEvent[], today: string): LearnState {
  const s: LearnState = {
    ...state,
    vecLong: state.vecLong ? Float32Array.from(state.vecLong) : null,
    vecShort: state.vecShort ? Float32Array.from(state.vecShort) : null,
    topicBeta: Object.fromEntries(Object.entries(state.topicBeta).map(([k, v]) => [k, [...v] as [number, number]])),
    muted: { topics: [...state.muted.topics], sources: [...state.muted.sources], stories: [...state.muted.stories] },
  };
  const bump = (topic: string, a: number, b: number) => {
    const cur = s.topicBeta[topic] ?? [1, 1];
    s.topicBeta[topic] = [cur[0] + a, cur[1] + b];
  };

  for (const e of events) {
    const w = eventWeight(e.type, e.meta);

    if (e.storyVec && w !== 0) {
      s.vecLong = pull(s.vecLong, e.storyVec, ETA_LONG, w);
      s.vecShort = pull(s.vecShort, e.storyVec, ETA_SHORT, w);
    }
    if (w !== 0) {
      for (const t of e.topics) {
        if (w > 0) bump(t, w * TOPIC_STEP, 0);
        else bump(t, 0, -w * TOPIC_STEP);
      }
    }

    if (e.type === 'less') {
      if (e.meta.reason === 'topic') for (const t of e.topics) bump(t, 0, 3); // "not this subject": say it loudly
    }
    if (e.type === 'mute' && e.meta.value) {
      const list = e.meta.target === 'source' ? s.muted.sources : s.muted.topics;
      if (!list.includes(e.meta.value)) list.push(e.meta.value);
      if (e.meta.target === 'topic') bump(e.meta.value, 0, 4);
    }
    if (e.type === 'caught_up') {
      if (s.lastReadOn !== today) s.streak = s.lastReadOn === dayBefore(today) ? s.streak + 1 : 1; // once per day
      s.lastReadOn = today;
    }
  }
  return s;
}

// Nightly: topic preferences relax toward the prior, and the fast vector drifts back to the slow one.
export function dailyDecay(state: LearnState): LearnState {
  const topicBeta = Object.fromEntries(Object.entries(state.topicBeta).map(([t, [a, b]]) => [t, [1 + (a - 1) * DECAY, 1 + (b - 1) * DECAY] as [number, number]]));
  let vecShort = state.vecShort;
  if (state.vecShort && state.vecLong) {
    const mix = new Float32Array(state.vecShort.length);
    addScaled(mix, state.vecShort, 0.8);
    addScaled(mix, state.vecLong, 0.2);
    vecShort = normalize(mix);
  }
  return { ...state, topicBeta, vecShort };
}
