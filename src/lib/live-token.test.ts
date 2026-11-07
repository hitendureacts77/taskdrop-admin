// node --experimental-strip-types --test src/lib/live-token.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { liveTokenResponse, parseLiveToken, tokenIsFresh } from './live-token.ts';

const admin = { status: 'ok' as const, user: { id: 'u1' } };
const yes = async () => true;
const session = (s: unknown) => async () => s as { access_token?: string; expires_at?: number } | null;

test('a signed-in admin gets the access token and its expiry, never the refresh token', async () => {
  const out = await liveTokenResponse(admin, yes, session({ access_token: 'at', refresh_token: 'rt', expires_at: 2000 }));
  assert.equal(out.status, 200);
  assert.deepEqual(out.body, { ok: true, token: 'at', expiresAt: 2000 });
  assert.ok(!JSON.stringify(out.body).includes('rt'));
});

test('signed out is 401 and not an admin is 403, without reading the session', async () => {
  let read = false;
  const s = async () => {
    read = true;
    return { access_token: 'at', expires_at: 1 };
  };
  assert.equal((await liveTokenResponse({ status: 'unauthenticated' }, yes, s)).status, 401);
  assert.equal((await liveTokenResponse({ status: 'forbidden' }, yes, s)).status, 403);
  assert.equal(read, false);
});

test('over the limit is 429; the limit is counted per staff member', async () => {
  let key = '';
  const out = await liveTokenResponse(admin, async (id) => ((key = id), false), session({ access_token: 'at', expires_at: 1 }));
  assert.equal(out.status, 429);
  assert.equal(key, 'u1');
  assert.equal(out.body.token, undefined);
});

test('no session or a broken one is 401', async () => {
  assert.equal((await liveTokenResponse(admin, yes, session(null))).status, 401);
  assert.equal((await liveTokenResponse(admin, yes, session({ access_token: '', expires_at: 5 }))).status, 401);
  assert.equal((await liveTokenResponse(admin, yes, session({ access_token: 'at' }))).status, 401);
});

test('a held token is reused until a minute before it ends', () => {
  const now = 1_000_000_000;
  assert.equal(tokenIsFresh(null, now), false);
  assert.equal(tokenIsFresh({ token: 'at', expiresAt: now / 1000 + 600 }, now), true);
  assert.equal(tokenIsFresh({ token: 'at', expiresAt: now / 1000 + 30 }, now), false);
  assert.equal(tokenIsFresh({ token: '', expiresAt: now / 1000 + 600 }, now), false);
});

test('the browser accepts only a well-formed answer', () => {
  assert.deepEqual(parseLiveToken({ ok: true, token: 'at', expiresAt: 5 }), { token: 'at', expiresAt: 5 });
  assert.equal(parseLiveToken({ ok: false }), null);
  assert.equal(parseLiveToken({ ok: true, token: '', expiresAt: 5 }), null);
  assert.equal(parseLiveToken({ ok: true, token: 'at', expiresAt: '5' }), null);
  assert.equal(parseLiveToken(null), null);
});
