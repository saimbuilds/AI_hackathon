import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isDue, localClock } from '../src/email/deliver';
import { esc, renderEmail, unsubscribeToken, verifyUnsubscribeToken } from '../src/email/render';
import { EditionSchema } from '../src/types/edition';

const p = (over = {}) => ({ tz: 'Asia/Karachi', delivery_time: '07:00:00', email: 'a@b.co', email_opt_in: true, ...over });
// 2026-10-17 02:30 UTC = 07:30 in Karachi (UTC+5)
const t = (iso: string) => Date.parse(iso);

test('local clock follows the reader time zone', () => {
  assert.deepEqual(localClock('Asia/Karachi', t('2026-10-17T02:30:00Z')), { date: '2026-10-17', minutes: 7 * 60 + 30 });
  assert.equal(localClock('Asia/Karachi', t('2026-10-16T20:00:00Z')).date, '2026-10-17'); // already tomorrow there
  assert.equal(localClock('America/New_York', t('2026-10-17T02:30:00Z')).date, '2026-10-16');
});

test('due from the delivery time for a 3 hour grace window, only for opted-in readers with an address', () => {
  assert.equal(isDue(p(), t('2026-10-17T01:59:00Z')), false); // 06:59
  assert.equal(isDue(p(), t('2026-10-17T02:00:00Z')), true); // 07:00
  assert.equal(isDue(p(), t('2026-10-17T04:30:00Z')), true); // 09:30, a missed hourly run still delivers
  assert.equal(isDue(p(), t('2026-10-17T05:00:00Z')), false); // 10:00, too late
  assert.equal(isDue(p({ email_opt_in: false }), t('2026-10-17T02:30:00Z')), false);
  assert.equal(isDue(p({ email: null }), t('2026-10-17T02:30:00Z')), false);
  assert.equal(isDue(p({ tz: 'Not/AZone' }), t('2026-10-17T02:30:00Z')), false);
});

test('unsubscribe tokens verify, and tampering fails', () => {
  const id = '06b8eeb2-c09e-4465-af7d-60e680452ab0';
  const tok = unsubscribeToken(id);
  assert.equal(verifyUnsubscribeToken(tok), id);
  assert.equal(verifyUnsubscribeToken(tok.slice(0, -2) + 'xx'), null);
  assert.equal(verifyUnsubscribeToken(`${Buffer.from('other-user').toString('base64url')}.${tok.split('.')[1]}`), null);
  assert.equal(verifyUnsubscribeToken('garbage'), null);
});

test('email renders from the fixture edition, escapes content, carries the unsubscribe link', () => {
  const ed = EditionSchema.parse(JSON.parse(readFileSync('fixtures/edition.sample.json', 'utf8')));
  ed.lead.headline = 'Trump <script>alert(1)</script> & friends';
  const m = renderEmail(ed, '06b8eeb2-c09e-4465-af7d-60e680452ab0');
  assert.ok(m.subject.startsWith(`${ed.paperName}:`));
  assert.ok(!m.html.includes('<script>'));
  assert.ok(m.html.includes('&lt;script&gt;'));
  assert.ok(m.html.includes('/api/unsubscribe?t='));
  assert.ok(m.html.includes(`${ed.city} Edition`));
  assert.ok(m.text.includes('Three things to remember'));
  assert.equal(esc('a&b<"c">'), 'a&amp;b&lt;&quot;c&quot;&gt;');
});

test('localInstant converts a local wall-clock time to the right UTC instant', async () => {
  const { localInstant } = await import('../src/edition/backfill');
  assert.equal(new Date(localInstant('2026-10-17', '07:00', 'Asia/Karachi')).toISOString(), '2026-10-17T02:00:00.000Z');
  assert.equal(new Date(localInstant('2026-10-17', '07:00', 'UTC')).toISOString(), '2026-10-17T07:00:00.000Z');
  assert.equal(new Date(localInstant('2026-01-15', '07:00', 'America/New_York')).toISOString(), '2026-01-15T12:00:00.000Z'); // EST
  assert.equal(new Date(localInstant('2026-07-15', '07:00', 'America/New_York')).toISOString(), '2026-07-15T11:00:00.000Z'); // EDT
});
