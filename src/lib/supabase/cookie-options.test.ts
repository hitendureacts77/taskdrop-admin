// node --experimental-strip-types --test src/lib/supabase/cookie-options.test.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { adminAuthCookieBase, adminAuthCookieOptions, adminCookieMaxAgeSeconds } from './cookie-options.ts';

// What @supabase/ssr 0.12 hands to setAll for a write and for a removal (its defaults).
const LIB_WRITE = { path: '/', sameSite: 'lax' as const, httpOnly: false, maxAge: 400 * 24 * 60 * 60 };
const LIB_REMOVE = { ...LIB_WRITE, maxAge: 0 };
const TWELVE_HOURS = 12 * 60 * 60;

test('a login cookie write is HttpOnly, Secure in production, SameSite=Lax, path / and 12 hours', () => {
  const o = adminAuthCookieOptions(LIB_WRITE, true);
  assert.equal(o.httpOnly, true);
  assert.equal(o.secure, true);
  assert.equal(o.sameSite, 'lax');
  assert.equal(o.path, '/');
  assert.equal(o.maxAge, TWELVE_HOURS);
  assert.equal(o.expires, undefined);
});

test('outside production the cookie is still HttpOnly but not Secure (plain http on localhost)', () => {
  const o = adminAuthCookieOptions(LIB_WRITE, false);
  assert.equal(o.httpOnly, true);
  assert.equal(o.secure, false);
  assert.equal(o.maxAge, TWELVE_HOURS);
});

test('the library cannot widen it: httpOnly:false, a long max-age or a far expiry are overridden', () => {
  const far = new Date(Date.now() + 400 * 86_400_000);
  const o = adminAuthCookieOptions({ ...LIB_WRITE, httpOnly: false, secure: false, sameSite: 'none', expires: far }, true);
  assert.equal(o.httpOnly, true);
  assert.equal(o.secure, true);
  assert.equal(o.sameSite, 'lax');
  assert.equal(o.maxAge, TWELVE_HOURS);
  assert.equal(o.expires, undefined);
  assert.equal(adminAuthCookieOptions(undefined, true).maxAge, TWELVE_HOURS);
});

test('a removal stays a removal (sign-out clears the cookie)', () => {
  assert.equal(adminAuthCookieOptions(LIB_REMOVE, true).maxAge, 0);
  assert.equal(adminAuthCookieOptions({ ...LIB_WRITE, maxAge: undefined, expires: new Date(0) }, true).maxAge, 0);
  // Same name, path and flags as the write, so the browser replaces it.
  const o = adminAuthCookieOptions(LIB_REMOVE, true);
  assert.equal(o.path, '/');
  assert.equal(o.httpOnly, true);
});

test('max-age follows ADMIN_SESSION_HOURS when shorter, never more than 12 hours', () => {
  assert.equal(adminCookieMaxAgeSeconds(undefined), TWELVE_HOURS);
  assert.equal(adminCookieMaxAgeSeconds(''), TWELVE_HOURS);
  assert.equal(adminCookieMaxAgeSeconds('nonsense'), TWELVE_HOURS);
  assert.equal(adminCookieMaxAgeSeconds('0'), TWELVE_HOURS);
  assert.equal(adminCookieMaxAgeSeconds('8'), 8 * 3600);
  assert.equal(adminCookieMaxAgeSeconds('48'), TWELVE_HOURS);
  assert.equal(adminAuthCookieOptions(LIB_WRITE, true, '4').maxAge, 4 * 3600);
});

test('the base options for createServerClient are HttpOnly and Lax', () => {
  assert.deepEqual(adminAuthCookieBase(true), { path: '/', sameSite: 'lax', httpOnly: true, secure: true });
});

test('both cookie writers use these options, and no page script uses the browser client for the session', () => {
  const src = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
  const mw = src('../../middleware.ts');
  assert.match(mw, /response\.cookies\.set\(name, value, adminCookieWrite\(options\)\)/);
  assert.match(mw, /cookieOptions: adminAuthCookieBase\(/);
  const server = src('./server.ts');
  assert.match(server, /cookieStore\.set\(name, value, adminCookieWrite\(options\)\)/);
  assert.match(server, /cookieOptions: adminAuthCookieBase\(/);
  for (const file of ['../../components/LiveProvider.tsx', '../../components/MfaPanel.tsx']) {
    assert.ok(!src(file).includes('supabase/browser'), `${file} must not use the browser Supabase client`);
  }
  assert.ok(!src('../../components/LiveProvider.tsx').includes('supabase.auth'), 'LiveProvider must not touch supabase.auth');
});
