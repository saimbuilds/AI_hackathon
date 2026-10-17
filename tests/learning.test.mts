import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyEvents, dailyDecay, eventWeight, type LearnEvent, type LearnState } from '../src/learning/update';
import { dot, normalize } from '../src/lib/vec';

const unit = (...xs: number[]) => normalize(Float32Array.from(xs));
const base = (over: Partial<LearnState> = {}): LearnState => ({
  vecLong: unit(1, 0, 0), vecShort: unit(1, 0, 0), topicBeta: {}, muted: { topics: [], sources: [], stories: [] }, streak: 0, lastReadOn: null, ...over,
});
const ev = (type: LearnEvent['type'], over: Partial<LearnEvent> = {}): LearnEvent => ({ type, storyVec: null, topics: [], meta: {}, ...over });

test('server decides the weight; dwell only counts past 20 s; "already knew" teaches nothing', () => {
  assert.equal(eventWeight('more', {}), 4);
  assert.equal(eventWeight('skip', {}), -0.7);
  assert.equal(eventWeight('dwell', { seconds: 5 }), 0);
  assert.equal(eventWeight('dwell', { seconds: 31 }), 1.5);
  assert.equal(eventWeight('less', { reason: 'topic' }), -3);
  assert.equal(eventWeight('less', { reason: 'already-knew' }), 0);
});

test('"more like this" pulls both vectors toward the story, fast vector more than slow', () => {
  const f1 = unit(0, 1, 0);
  const before = base();
  const after = applyEvents(before, [ev('more', { storyVec: f1, topics: ['f1'] })], '2026-10-17');
  assert.ok(dot(after.vecLong!, f1) > dot(before.vecLong!, f1));
  assert.ok(dot(after.vecShort!, f1) > dot(after.vecLong!, f1));
  assert.ok(after.topicBeta.f1[0] > 1 && after.topicBeta.f1[1] === 1);
});

test('"less like this" pushes away and raises the topic beta; reason "topic" pushes harder', () => {
  const gossip = unit(0.6, 0.8, 0);
  const plain = applyEvents(base(), [ev('less', { storyVec: gossip, topics: ['celebrity'], meta: { reason: 'source' } })], '2026-10-17');
  const topic = applyEvents(base(), [ev('less', { storyVec: gossip, topics: ['celebrity'], meta: { reason: 'topic' } })], '2026-10-17');
  assert.ok(dot(plain.vecShort!, gossip) < dot(base().vecShort!, gossip));
  assert.ok(plain.topicBeta.celebrity[1] > 1);
  assert.ok(topic.topicBeta.celebrity[1] > plain.topicBeta.celebrity[1]);
});

test('"already knew" changes nothing about taste', () => {
  const s = applyEvents(base(), [ev('less', { storyVec: unit(0, 1, 0), topics: ['ai'], meta: { reason: 'already-knew' } })], '2026-10-17');
  assert.deepEqual(s.topicBeta, {});
  assert.ok(Math.abs(dot(s.vecLong!, unit(1, 0, 0)) - 1) < 1e-6);
});

test('a first positive signal seeds an empty vector; a first negative cannot', () => {
  const seeded = applyEvents(base({ vecLong: null, vecShort: null }), [ev('save', { storyVec: unit(0, 0, 1) })], '2026-10-17');
  assert.ok(seeded.vecLong && dot(seeded.vecLong, unit(0, 0, 1)) > 0.99);
  const none = applyEvents(base({ vecLong: null, vecShort: null }), [ev('skip', { storyVec: unit(0, 0, 1) })], '2026-10-17');
  assert.equal(none.vecLong, null);
});

test('vectors stay unit length after many events', () => {
  const evs = Array.from({ length: 50 }, (_, i) => ev(i % 2 ? 'more' : 'less', { storyVec: unit(Math.sin(i), Math.cos(i), 0.3) }));
  const s = applyEvents(base(), evs, '2026-10-17');
  assert.ok(Math.abs(Math.hypot(...s.vecLong!) - 1) < 1e-5);
  assert.ok(Math.abs(Math.hypot(...s.vecShort!) - 1) < 1e-5);
});

test('mute adds to the muted lists and hammers the topic', () => {
  const s = applyEvents(base(), [ev('mute', { meta: { target: 'topic', value: 'celebrity' } }), ev('mute', { meta: { target: 'source', value: 'src-1' } }), ev('mute', { meta: { target: 'topic', value: 'celebrity' } })], '2026-10-17');
  assert.deepEqual(s.muted.topics, ['celebrity']);
  assert.deepEqual(s.muted.sources, ['src-1']);
  assert.ok(s.topicBeta.celebrity[1] > 5);
});

test('streak: consecutive days grow it, a gap resets it, the same day counts once', () => {
  let s = applyEvents(base(), [ev('caught_up')], '2026-10-15');
  assert.equal(s.streak, 1);
  s = applyEvents(s, [ev('caught_up'), ev('caught_up')], '2026-10-16');
  assert.equal(s.streak, 2);
  s = applyEvents(s, [ev('caught_up')], '2026-10-16');
  assert.equal(s.streak, 2);
  s = applyEvents(s, [ev('caught_up')], '2026-10-19');
  assert.equal(s.streak, 1);
});

test('daily decay relaxes topic preferences toward the prior and the fast vector toward the slow one', () => {
  const s = dailyDecay(base({ vecLong: unit(1, 0, 0), vecShort: unit(0, 1, 0), topicBeta: { f1: [9, 1], dull: [1, 5] } }));
  assert.ok(s.topicBeta.f1[0] < 9 && s.topicBeta.f1[0] > 1);
  assert.ok(s.topicBeta.dull[1] < 5);
  assert.ok(dot(s.vecShort!, unit(1, 0, 0)) > 0);
});

test('memo evidence: top and skipped topics need real evidence, and the template memo reads naturally', async () => {
  const { evidenceFrom, templateMemo } = await import('../src/learning/nightly');
  const e = evidenceFrom({ f1: [8, 1], ai: [6, 2], celebrity: [1, 6], thin: [1, 1.5], 'pakistan-economy': [5, 2] }, ['A headline'], 12);
  assert.deepEqual(e.top, ['Formula 1', 'AI', "Pakistan's economy"]);
  assert.deepEqual(e.skips, ['celebrity']);
  assert.equal(templateMemo(e), "You follow Formula 1, AI and Pakistan's economy more than other subjects. You tend to skip celebrity.");
  assert.equal(templateMemo(evidenceFrom({}, [], 0)), null);
});
