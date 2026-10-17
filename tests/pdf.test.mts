import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signPrintToken, verifyPrintToken } from '../src/pdf/token';
import { pdfResponse, safeName } from '../src/pdf/http';

const A = '06b8eeb2-c09e-4465-af7d-60e680452ab0';
const B = '372cf072-227b-4c32-b479-ef9fe80c4b41';

test('a print token verifies for its own edition only', () => {
  const t = signPrintToken(A);
  assert.ok(verifyPrintToken(A, t));
  assert.ok(!verifyPrintToken(B, t), 'token for edition A must not open edition B');
});

test('tokens expire', () => {
  const now = Date.now();
  const t = signPrintToken(A, 60, now);
  assert.ok(verifyPrintToken(A, t, now + 30_000));
  assert.ok(!verifyPrintToken(A, t, now + 61_000));
});

test('tampered, malformed and empty tokens are rejected', () => {
  const [exp, sig] = signPrintToken(A).split('.');
  assert.ok(!verifyPrintToken(A, `${Number(exp) + 3600}.${sig}`), 'extending the expiry breaks the signature');
  assert.ok(!verifyPrintToken(A, `${exp}.${sig.slice(0, -2)}xx`));
  for (const bad of ['', 'x', '1.abc', '.', `${exp}.`]) assert.ok(!verifyPrintToken(A, bad), bad);
});

test('download names are safe and headers are right', () => {
  assert.equal(safeName('The Saim Times', '2026-10-17'), 'The-Saim-Times-2026-10-17.pdf');
  assert.equal(safeName('../../etc/passwd "x"', '2026-10-17'), 'etcpasswd-x-2026-10-17.pdf');
  assert.equal(safeName('', '2026-10-17'), 'paper-2026-10-17.pdf');
  const r = pdfResponse(Buffer.from('%PDF-1.4'), 'a.pdf', false);
  assert.equal(r.headers.get('content-type'), 'application/pdf');
  assert.equal(r.headers.get('content-disposition'), 'attachment; filename="a.pdf"');
  assert.equal(pdfResponse(Buffer.from('x'), 'a.pdf', true).headers.get('content-disposition'), 'inline; filename="a.pdf"');
});
