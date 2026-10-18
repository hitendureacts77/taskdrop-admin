import assert from 'node:assert/strict';
import { test } from 'node:test';
import { asRunKind, isRunStale, isStaffRefusal, latestPerKind, parseRunDetail, razorpayLine, safeSentryUrl } from './ops-calc.ts';

test('parseRunDetail reads internal and razorpay rows and ignores junk', () => {
  const internal = parseRunDetail('internal', [
    { check_code: 'escrow_mismatch', severity: 'high', ref_type: 'task', ref_id: 't1', amount_minor: '12500', at: '2026-10-16T10:00:00Z', detail: 'Escrow differs' },
    null,
    'x',
    { check_code: 'c2', amount_minor: null },
  ]);
  assert.equal(internal.length, 3 - 1);
  assert.deepEqual(internal[0], { kind: 'internal', code: 'escrow_mismatch', severity: 'high', refType: 'task', refId: 't1', amountMinor: 12500, at: '2026-10-16T10:00:00Z', detail: 'Escrow differs' });
  assert.equal(internal[1]!.kind === 'internal' && internal[1]!.amountMinor, null);
  const rz = parseRunDetail('razorpay', [{ payment: 'p1', ref: 'plink_1', ours: 'captured', theirs: 'created', note: 'not paid there' }]);
  assert.deepEqual(rz, [{ kind: 'razorpay', payment: 'p1', ref: 'plink_1', ours: 'captured', theirs: 'created', note: 'not paid there' }]);
  assert.deepEqual(parseRunDetail('internal', null), []);
  assert.deepEqual(parseRunDetail('razorpay', { a: 1 }), []);
});

test('razorpayLine reads as a sentence', () => {
  assert.equal(razorpayLine({ ours: 'paid', theirs: 'created', note: 'Razorpay shows it unpaid' }), 'ours paid, Razorpay created: Razorpay shows it unpaid');
  assert.equal(razorpayLine({ ours: '', theirs: 'x', note: '' }), 'ours unknown, Razorpay x');
});

test('asRunKind accepts only the two kinds', () => {
  assert.equal(asRunKind('internal'), 'internal');
  assert.equal(asRunKind('razorpay'), 'razorpay');
  assert.equal(asRunKind('other'), null);
});

test('latestPerKind picks the newest run of each kind', () => {
  const l = latestPerKind([
    { kind: 'internal', ranAt: '2026-10-15T21:00:00Z' },
    { kind: 'razorpay', ranAt: '2026-10-16T21:00:00Z' },
    { kind: 'internal', ranAt: '2026-10-16T21:00:00Z' },
  ]);
  assert.equal(l.internal?.ranAt, '2026-10-16T21:00:00Z');
  assert.equal(l.razorpay?.ranAt, '2026-10-16T21:00:00Z');
  assert.deepEqual(latestPerKind([]), {});
});

test('isRunStale is true with no run or after 36 hours', () => {
  const now = new Date('2026-10-17T12:00:00Z');
  assert.equal(isRunStale(null, now), true);
  assert.equal(isRunStale('garbage', now), true);
  assert.equal(isRunStale('2026-10-17T00:00:00Z', now), false);
  assert.equal(isRunStale('2026-10-16T00:30:00Z', now), false);
  assert.equal(isRunStale('2026-10-15T23:00:00Z', now), true);
});

test('safeSentryUrl allows only https links', () => {
  assert.equal(safeSentryUrl('https://sentry.io/organizations/x/projects/y/'), 'https://sentry.io/organizations/x/projects/y/');
  assert.equal(safeSentryUrl('http://sentry.io/x'), null);
  assert.equal(safeSentryUrl('javascript:alert(1)'), null);
  assert.equal(safeSentryUrl('  '), null);
  assert.equal(safeSentryUrl(undefined), null);
});

test('isStaffRefusal spots the role refusal but not real failures', () => {
  assert.equal(isStaffRefusal("Your staff role (support) can't see this.", '42501'), true);
  assert.equal(isStaffRefusal('Your staff role (support) can’t do this.'), true);
  assert.equal(isStaffRefusal('connection reset'), false);
});
