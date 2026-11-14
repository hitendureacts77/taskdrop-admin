// node --experimental-strip-types --test src/lib/login-errors.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LOGIN_ERRORS, loginErrorText } from './login-errors.ts';

test('known codes become fixed sentences', () => {
  for (const [code, text] of Object.entries(LOGIN_ERRORS)) assert.equal(loginErrorText(code), text);
});

test('the middleware sign-out sentences are kept', () => {
  const idle = 'You were signed out after 30 minutes without activity. Sign in again.';
  const max = 'Admin sessions last 12 hours. Sign in again.';
  assert.equal(loginErrorText(idle), idle);
  assert.equal(loginErrorText(max), max);
});

test('any other text in ?error= shows nothing (B130)', () => {
  for (const raw of [
    null,
    undefined,
    '',
    'Your account is locked. Call +91 98765 43210 to unlock it.',
    'toString',
    '__proto__',
    'constructor',
    'You were signed out after lots of minutes without activity. Sign in again.',
    'Admin sessions last 12 hours. Sign in again. Then visit evil.example',
    'Unable to exchange external code: bad_oauth_state',
  ]) {
    assert.equal(loginErrorText(raw), null, String(raw));
  }
});
