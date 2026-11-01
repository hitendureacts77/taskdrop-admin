// node --experimental-strip-types --test src/lib/scrub.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { scrubEvent, scrubText } from './scrub.ts';

// Built at run time so this file holds no secret-shaped text.
const jwt = ['{"alg":"HS256"}', '{"role":"anon"}'].map((p) => Buffer.from(p).toString('base64url')).join('.') + '.c2lnbmF0dXJl';

test('hides emails, phone numbers, tokens and keys in text', () => {
  const out = scrubText(`user a.b@example.com called +91 98765 43210 and 9876543210 with Bearer abcdefgh12345678 ${jwt} rzp_test_THROWAWAYKEY01`);
  for (const bad of ['a.b@example.com', '98765', '9876543210', 'abcdefgh12345678', jwt, 'THROWAWAYKEY01']) {
    assert.ok(!out.includes(bad), `still contains ${bad}`);
  }
  assert.match(out, /\[email\].*\[phone\].*\[phone\]/);
});

test('leaves ids, amounts and ordinary words alone', () => {
  const t = 'task 3f2c9a10-6d2e-4b8e-9f41-0a1b2c3d4e5f paid 2500.50 in 12 ms on POST /rest/v1/tasks';
  assert.equal(scrubText(t), t);
});

test('removes sensitive fields and the person\'s contact details from an event', () => {
  const out = scrubEvent({
    message: 'failed for 9876543210',
    user: { id: 'u1', email: 'x@y.in', ip_address: '1.2.3.4', username: 'bob' },
    request: { url: 'https://x.test/a?t=1', headers: { Authorization: 'Bearer abcdefgh12345678', Accept: 'json' }, cookies: 'a=b' },
    extra: { phone: '9876543210', note: 'mail me at q@w.com' },
  }) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- a test reading a free-form event
  assert.equal(out.message, 'failed for [phone]');
  assert.deepEqual(out.user, { id: 'u1' });
  assert.equal(out.request.headers.Authorization, undefined);
  assert.equal(out.request.headers.Accept, 'json');
  assert.equal(out.extra.phone, undefined);
  assert.equal(out.extra.note, 'mail me at [email]');
});

