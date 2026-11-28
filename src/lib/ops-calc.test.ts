import assert from 'node:assert/strict';
import { test } from 'node:test';
import { asRunKind, isRunStale, isStaffRefusal, latestPerKind, parseRunDetail, razorpayLine, safeSentryUrl, toolLinks } from './ops-calc.ts';

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

test('toolLinks shows a dashboard link only for an https URL', () => {
  const links = toolLinks({ SENTRY_PROJECT_URL: 'https://sentry.io/x/', INNGEST_DASHBOARD_URL: 'http://app.inngest.com', IMAGEKIT_DASHBOARD_URL: undefined });
  assert.deepEqual(
    links.map((l) => [l.envName, l.url]),
    [
      ['SENTRY_PROJECT_URL', 'https://sentry.io/x/'],
      ['INNGEST_DASHBOARD_URL', null],
      ['IMAGEKIT_DASHBOARD_URL', null],
    ],
  );
});

// ---- v2 Business reports helpers (ops-reports.ts) ----
import { changePct, chartBuckets, chartUnit, dayLabel, quotedShare, retentionTint } from './ops-reports.ts';

const dayRow = (day: string, funded: number, revenue: number) => ({ day, newPeople: 0, jobsPosted: 0, jobsFinished: 0, cancellations: 0, disputesDecided: 0, fundedMinor: funded, topupMinor: 0, revenueMinor: revenue });

test('chartUnit: day up to 30, week for 90, month for a year', () => {
  assert.equal(chartUnit(7), 'day');
  assert.equal(chartUnit(30), 'day');
  assert.equal(chartUnit(90), 'week');
  assert.equal(chartUnit(365), 'month');
});

test('dayLabel reads as "3 Nov"', () => {
  assert.equal(dayLabel('2026-11-03'), '3 Nov');
});

test('chartBuckets keeps one point per day for short ranges, in date order', () => {
  const b = chartBuckets([dayRow('2026-11-02', 200, 20), dayRow('2026-11-01', 100, 10)], 7);
  assert.deepEqual(b.map((x) => [x.label, x.fundedMinor, x.revenueMinor]), [['1 Nov', 100, 10], ['2 Nov', 200, 20]]);
});

test('chartBuckets groups 90 days into blocks of 7 from the first day', () => {
  const rows = Array.from({ length: 10 }, (_, i) => dayRow(`2026-11-${String(i + 1).padStart(2, '0')}`, 100, 5));
  const b = chartBuckets(rows, 90);
  assert.equal(b.length, 2);
  assert.equal(b[0]!.label, 'Week of 1 Nov');
  assert.equal(b[0]!.fundedMinor, 700);
  assert.equal(b[1]!.label, 'Week of 8 Nov');
  assert.equal(b[1]!.revenueMinor, 15);
});

test('chartBuckets groups a year by calendar month', () => {
  const b = chartBuckets([dayRow('2026-10-31', 1, 1), dayRow('2026-11-01', 2, 2), dayRow('2026-11-30', 3, 3)], 365);
  assert.deepEqual(b.map((x) => [x.label, x.fundedMinor]), [['Oct 2026', 1], ['Nov 2026', 5]]);
});

test('quotedShare accepts a fraction or a percent', () => {
  assert.equal(quotedShare(0.81), 0.81);
  assert.equal(quotedShare(81), 0.81);
  assert.equal(quotedShare(Number.NaN), 0);
});

test('retentionTint is 0..45 and 0 for an empty cell', () => {
  assert.equal(retentionTint(null), 0);
  assert.equal(retentionTint(1), 45);
  assert.equal(retentionTint(0.5), 23);
  assert.equal(retentionTint(2), 45);
});

test('changePct is null with nothing before', () => {
  assert.equal(changePct(5, 0), null);
  assert.equal(changePct(112, 100), 12);
  assert.equal(changePct(90, 100), -10);
});
