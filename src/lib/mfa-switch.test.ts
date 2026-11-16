// node --experimental-strip-types --test src/lib/mfa-switch.test.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { mfaSwitchCheck } from './mfa-switch.ts';

test('turning the money code on is refused when this admin has no authenticator (B112)', () => {
  const r = mfaSwitchCheck({ turningOn: true, meEnrolled: false, withMfa: 0, total: 6 });
  assert.ok(r.refuse);
  assert.match(r.refuse!, /Security page/);
});

test('turning it on with an authenticator warns loudly when others have none', () => {
  const r = mfaSwitchCheck({ turningOn: true, meEnrolled: true, withMfa: 1, total: 6 });
  assert.equal(r.refuse, null);
  assert.match(r.warn ?? '', /5 of 6/);
  assert.equal(mfaSwitchCheck({ turningOn: true, meEnrolled: true, withMfa: 6, total: 6 }).warn, null);
});

test('nobody set up: the warning says so even before pressing', () => {
  const r = mfaSwitchCheck({ turningOn: true, meEnrolled: false, withMfa: 0, total: 6 });
  assert.match(r.warn ?? '', /No admin/);
});

test('turning it off is never blocked by this check', () => {
  assert.deepEqual(mfaSwitchCheck({ turningOn: false, meEnrolled: false, withMfa: 0, total: 6 }), { refuse: null, warn: null });
});

test('the server action applies the check, not just the page', () => {
  const src = readFileSync(new URL('./admin-actions.ts', import.meta.url), 'utf8');
  assert.match(src, /mfaSwitchCheck\(/);
});
