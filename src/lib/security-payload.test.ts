// node --experimental-strip-types --test src/lib/security-payload.test.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { safeExtra, shortId } from './security-payload.ts';

test('only role, action, reason and short ids leave for Sentry', () => {
  const out = safeExtra({
    role: 'support',
    action: 'people',
    reason: 'wrong_password',
    user: '3f2c9a10-6d2e-4b8e-9f41-0a1b2c3d4e5f',
    email: 'a.b@example.com',
    phone: '9876543210',
    password: 'hunter2',
    code: '123456',
    token: 'abc',
    username: 'someone',
  });
  assert.deepEqual(Object.keys(out).sort(), ['action', 'reason', 'role', 'user']);
  assert.equal(out.user, '3f2c9a10');
});

test('values are scrubbed and cut short even under an allowed key', () => {
  const out = safeExtra({ reason: 'mail a.b@example.com or 9876543210 ' + 'x'.repeat(300) });
  const r = String(out.reason);
  assert.ok(!r.includes('example.com') && !r.includes('9876543210'));
  assert.ok(r.length <= 120);
});

test('shortId keeps the first 8 characters only', () => {
  assert.equal(shortId('3f2c9a10-6d2e-4b8e-9f41-0a1b2c3d4e5f'), '3f2c9a10');
  assert.equal(shortId(''), '');
});

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('password failures, wrong codes, forbidden checks and staff refusals are reported (B127)', () => {
  assert.match(read('../app/api/auth/password/route.ts'), /securityEvent\('admin_password_signin_failed'/);
  assert.match(read('../app/api/auth/mfa/route.ts'), /securityEvent\('admin_mfa_code_failed'/);
  assert.match(read('./auth.ts'), /securityEvent\('admin_forbidden'/);
  assert.match(read('./staff.ts'), /securityEvent\('staff_gate_refused'/);
});

test('span scrubbing is on beforeSendSpan, which runs with span streaming (B127)', () => {
  // Server, edge and the Cloudflare Worker share src/lib/sentry-options.ts; the browser has its own init.
  for (const f of ['./sentry-options.ts', '../instrumentation-client.ts']) {
    const t = read(f);
    assert.match(t, /beforeSendSpan:/, f);
    assert.doesNotMatch(t, /beforeSendTransaction/, f);
  }
  for (const f of ['../sentry.server.config.ts', '../sentry.edge.config.ts', '../../worker.ts']) {
    assert.match(read(f), /sentryServerOptions\(/, f);
    assert.doesNotMatch(read(f), /beforeSendTransaction/, f);
  }
});

test('scrubSpan hides contact details in span names and attributes', async () => {
  const { scrubSpan } = await import('./sentry-span.ts');
  const out = scrubSpan({ name: 'GET /users?q=a.b@example.com', attributes: { 'http.url': '/x?phone=9876543210', email: 'a.b@example.com' } });
  const t = JSON.stringify(out);
  assert.ok(!t.includes('example.com') && !t.includes('9876543210'));
});
