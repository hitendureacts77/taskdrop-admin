// node --experimental-strip-types --test src/lib/mfa-route.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanCode, runMfa, type MfaApi } from './mfa-route.ts';

type Factor = { id: string; status: string; factor_type: string };

function fake(factors: Factor[], verifyError: string | null = null) {
  const calls: string[] = [];
  const api: MfaApi = {
    async listFactors() {
      calls.push('list');
      return { data: { all: factors, totp: factors.filter((f) => f.status === 'verified') }, error: null };
    },
    async unenroll({ factorId }) {
      calls.push(`unenroll:${factorId}`);
      return { error: null };
    },
    async enroll() {
      calls.push('enroll');
      return { data: { id: 'new', totp: { qr_code: 'data:image/svg+xml;utf-8,<svg/>', secret: 'KEY' } }, error: null };
    },
    async challengeAndVerify({ factorId, code }) {
      calls.push(`verify:${factorId}:${code}`);
      return { error: verifyError ? { message: verifyError } : null };
    },
  };
  return { api, calls };
}

test('setup clears half-finished factors, then returns the QR, key and new factor id', async () => {
  const { api, calls } = fake([{ id: 'old', status: 'unverified', factor_type: 'totp' }, { id: 'ok', status: 'verified', factor_type: 'totp' }]);
  const out = await runMfa({ action: 'setup' }, api, new Date('2026-11-05T10:00:00Z'));
  assert.equal(out.status, 200);
  assert.deepEqual(out.body, { ok: true, factorId: 'new', qr: 'data:image/svg+xml;utf-8,<svg/>', secret: 'KEY' });
  assert.deepEqual(calls, ['list', 'unenroll:old', 'enroll']);
});

test('factor names the verified authenticator, or says there is none', async () => {
  assert.deepEqual((await runMfa({ action: 'factor' }, fake([{ id: 'f1', status: 'verified', factor_type: 'totp' }]).api)).body, {
    ok: true,
    factorId: 'f1',
  });
  const none = await runMfa({ action: 'factor' }, fake([]).api);
  assert.equal(none.status, 404);
  assert.equal(none.body.ok, false);
});

test('verify checks the code on the server for one of this account factors', async () => {
  const { api, calls } = fake([{ id: 'f1', status: 'verified', factor_type: 'totp' }]);
  const out = await runMfa({ action: 'verify', factorId: 'f1', code: '123 456' }, api);
  assert.equal(out.status, 200);
  assert.deepEqual(out.body, { ok: true });
  assert.ok(calls.includes('verify:f1:123456'));
});

test('verify refuses a factor that is not on the account, and a malformed code, without calling Supabase verify', async () => {
  const { api, calls } = fake([{ id: 'f1', status: 'verified', factor_type: 'totp' }]);
  assert.equal((await runMfa({ action: 'verify', factorId: 'someone-else', code: '123456' }, api)).status, 400);
  assert.equal((await runMfa({ action: 'verify', factorId: 'f1', code: '12345' }, api)).status, 400);
  assert.equal((await runMfa({ action: 'verify', factorId: 'f1', code: 'abcdef' }, api)).status, 400);
  assert.ok(!calls.some((c) => c.startsWith('verify:')));
});

test('a wrong code says so in plain words', async () => {
  const out = await runMfa({ action: 'verify', factorId: 'f1', code: '000000' }, fake([{ id: 'f1', status: 'verified', factor_type: 'totp' }], 'Invalid TOTP code entered').api);
  assert.equal(out.status, 400);
  assert.match(String(out.body.message), /not right/);
});

test('an unknown action or a non-object body is refused', async () => {
  const { api, calls } = fake([]);
  assert.equal((await runMfa({ action: 'unenroll', factorId: 'x' }, api)).status, 400);
  assert.equal((await runMfa(null, api)).status, 400);
  assert.equal((await runMfa('setup', api)).status, 400);
  assert.deepEqual(calls, []);
});

test('cleanCode accepts six digits with spaces only', () => {
  assert.equal(cleanCode(' 123 456 '), '123456');
  assert.equal(cleanCode('1234567'), null);
  assert.equal(cleanCode(undefined), null);
});
