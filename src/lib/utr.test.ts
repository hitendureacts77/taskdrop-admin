import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkReference, referenceRule } from './utr.ts';

test('a UPI reference is 12 digits; a space or x is refused (the bug)', () => {
  assert.equal(checkReference('upi', ' ').ok, false);
  assert.equal(checkReference('upi', 'x').ok, false);
  assert.equal(checkReference('upi', '12345').ok, false);
  assert.equal(checkReference('upi', '62410098331A').ok, false);
  assert.deepEqual(checkReference('upi', ' 624100983317 '), { ok: true, value: '624100983317' });
});

test('a bank reference is 8 to 22 letters and digits', () => {
  assert.equal(checkReference('bank', 'abc').ok, false);
  assert.equal(checkReference('bank', 'SBIN123 456').ok, false);
  assert.deepEqual(checkReference('bank', 'SBIN526123456789'), { ok: true, value: 'SBIN526123456789' });
  assert.deepEqual(checkReference('bank', '624100983317'), { ok: true, value: '624100983317' });
});

test('another way needs a few real characters', () => {
  assert.equal(checkReference('other', '   ').ok, false);
  assert.equal(checkReference('other', 'ab').ok, false);
  assert.deepEqual(checkReference('other', ' cash, receipt 14 '), { ok: true, value: 'cash, receipt 14' });
});

test('the browser pattern accepts exactly what the server accepts', () => {
  for (const ch of ['upi', 'bank', 'other'] as const) {
    const re = new RegExp(`^(?:${referenceRule(ch).pattern})$`);
    for (const s of [' ', 'x', '624100983317', ' 624100983317 ', 'SBIN526123456789', 'cash, receipt 14', 'ab']) {
      assert.equal(re.test(s), checkReference(ch, s).ok, `${ch} ${JSON.stringify(s)}`);
    }
  }
});
