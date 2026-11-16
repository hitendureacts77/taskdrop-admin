import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeOpenProblems, lockedLateWithdrawals, reconcileSubject, moneyHealthLine, activityTotal, formatMinutes, formatWait, funnelSteps, marketplaceShown, previousWindow, rate, retentionGrid, totalDaily, type DailyRow, type MarketplaceRow, type StaffPerf } from './growth-calc.ts';

const day = (o: Partial<DailyRow>): DailyRow => ({ day: '2026-10-01', newPeople: 0, jobsPosted: 0, jobsFinished: 0, cancellations: 0, disputesDecided: 0, fundedMinor: 0, topupMinor: 0, revenueMinor: 0, ...o });

test('rate is null, not zero, when there is nothing to divide by', () => {
  assert.equal(rate(0, 0), null);
  assert.equal(rate(1, 4), 0.25);
});

test('totalDaily adds the days and works out take rate and cancel rate', () => {
  const t = totalDaily([day({ fundedMinor: 100000, revenueMinor: 13000, jobsPosted: 10, cancellations: 1, jobsFinished: 8 }), day({ fundedMinor: 100000, revenueMinor: 13000, jobsPosted: 10, cancellations: 3, jobsFinished: 8 })]);
  assert.equal(t.fundedMinor, 200000);
  assert.equal(t.revenueMinor, 26000);
  assert.equal(t.takeRate, 0.13);
  assert.equal(t.cancelRate, 0.2);
  assert.equal(t.finishRate, 0.8);
});

test('totalDaily of nothing has no rates', () => {
  const t = totalDaily([]);
  assert.equal(t.takeRate, null);
  assert.equal(t.cancelRate, null);
});

test('previousWindow is the same length, ending the day before', () => {
  assert.deepEqual(previousWindow('2026-10-08', '2026-10-14'), { from: '2026-10-01', to: '2026-10-07' });
  assert.deepEqual(previousWindow('2026-10-01', '2026-10-01'), { from: '2026-09-30', to: '2026-09-30' });
});

test('funnelSteps gives share of joined and share kept from the step before', () => {
  const s = funnelSteps({ joined: 100, engaged: 50, funded: 20, completed: 10, repeat: 5 });
  assert.equal(s[0]!.ofPrevious, null);
  assert.equal(s[1]!.ofJoined, 0.5);
  assert.equal(s[2]!.ofPrevious, 0.4);
  assert.equal(s[4]!.ofJoined, 0.05);
  assert.equal(funnelSteps({ joined: 0, engaged: 0, funded: 0, completed: 0, repeat: 0 })[1]!.ofJoined, null);
});

test('retentionGrid fills a row per sign-up week and leaves unreached weeks empty', () => {
  const g = retentionGrid(
    [
      { cohortWeek: '2026-09-28', weekOffset: 0, cohortSize: 10, active: 5 },
      { cohortWeek: '2026-09-28', weekOffset: 1, cohortSize: 10, active: 2 },
      { cohortWeek: '2026-09-21', weekOffset: 0, cohortSize: 4, active: 4 },
      { cohortWeek: '2026-09-21', weekOffset: 99, cohortSize: 4, active: 1 },
    ],
    3,
  );
  assert.deepEqual(g.map((r) => r.week), ['2026-09-21', '2026-09-28']);
  assert.deepEqual(g[1]!.cells, [0.5, 0.2, null, null]);
  assert.equal(g[0]!.cells[0], 1);
});

test('formatMinutes reads naturally', () => {
  assert.equal(formatMinutes(null), '—');
  assert.equal(formatMinutes(12.4), '12 min');
  assert.equal(formatMinutes(90), '1.5 h');
  assert.equal(formatMinutes(2880), '2.0 days');
});

test('activityTotal adds what a person did but not what they own', () => {
  const p: StaffPerf = { userId: 'u', tasksDone: 2, tasksOnTime: 1, tasksOpen: 9, tasksOverdue: 3, notes: 3, ticketReplies: 4, reportsHandled: 1, disputesDecided: 0, suspensions: 1, broadcasts: 0, customersOwned: 50, firstResponseMinutes: null };
  assert.equal(activityTotal(p), 11);
});

test('marketplaceShown works out the fill rate and offer rate, and a quiet group has none', () => {
  const row = (o: Partial<MarketplaceRow>): MarketplaceRow => ({ kind: 'category', label: 'X', posted: 0, withOffer: 0, filled: 0, medianFirstOfferSeconds: null, p90FirstOfferSeconds: null, ...o });
  const shown = marketplaceShown([row({ label: 'Few', posted: 2, withOffer: 1, filled: 1 }), row({ label: 'Many', posted: 10, withOffer: 8, filled: 3 }), row({ label: 'Silent', posted: 0 }), row({ kind: 'area', label: 'Elsewhere', posted: 99 })], 'category');
  assert.deepEqual(shown.map((r) => r.label), ['Many', 'Few', 'Silent']);
  assert.equal(shown[0]?.fillRate, 0.3);
  assert.equal(shown[0]?.offerRate, 0.8);
  assert.equal(shown[2]?.fillRate, null);
  assert.equal(shown[2]?.offerRate, null);
});

test('formatWait reads in the unit a person would use', () => {
  assert.equal(formatWait(null), '—');
  assert.equal(formatWait(45), '45 sec');
  assert.equal(formatWait(720), '12 min');
  assert.equal(formatWait(12600), '3.5 h');
  assert.equal(formatWait(3 * 86400), '3.0 days');
});

test('mergeOpenProblems keeps old open problems outside the window and does not repeat rows', () => {
  const row = (code: string, refId: string, at: string) => ({ code, refType: 'payout', refId, at });
  const inWindow = [row('payout_waiting_long', 'a', '2026-11-01T00:00:00Z'), row('finished_without_commission', 'x', '2026-11-05T00:00:00Z')];
  const anyDate = [
    row('payout_waiting_long', 'a', '2026-11-01T00:00:00Z'),
    row('payout_waiting_long', 'old', '2026-10-04T00:00:00Z'),
    row('finished_without_commission', 'older', '2026-09-01T00:00:00Z'),
  ];
  const merged = mergeOpenProblems(inWindow, anyDate);
  assert.deepEqual(merged.map((r) => r.refId), ['x', 'a', 'old']);
});

// A1-3: the Money check names the job, the person and the amount.
test('reconcileSubject names the job, the people and the amount for a job row', () => {
  const ctx = {
    tasks: new Map([['t1', { title: 'Bookshelf assembled', poster: 'Asha', worker: 'Ravi', amountMinor: 120000 }]]),
    payouts: new Map<string, { person: string }>(),
    payments: new Map<string, { person: string; taskId: string | null }>(),
  };
  const s = reconcileSubject({ refType: 'task', refId: 't1', amountMinor: null }, ctx);
  assert.equal(s.subject, 'Job “Bookshelf assembled” · poster Asha · worker Ravi');
  assert.equal(s.href, '/tasks/t1');
  assert.equal(s.amountMinor, 120000);
});

test('reconcileSubject keeps the amount the check already has, and names a withdrawal and a payment', () => {
  const ctx = {
    tasks: new Map([['t2', { title: 'Paint a wall', poster: 'Meera', worker: null, amountMinor: 50000 }]]),
    payouts: new Map([['p1', { person: 'Ravi' }]]),
    payments: new Map([['pay1', { person: 'Meera', taskId: 't2' }], ['pay2', { person: 'Kiran', taskId: null }]]),
  };
  assert.equal(reconcileSubject({ refType: 'task', refId: 't2', amountMinor: 7000 }, ctx).amountMinor, 7000);
  const w = reconcileSubject({ refType: 'payout', refId: 'p1', amountMinor: 30000 }, ctx);
  assert.equal(w.subject, 'Withdrawal by Ravi');
  assert.equal(w.href, '/payouts/p1');
  const p = reconcileSubject({ refType: 'payment', refId: 'pay1', amountMinor: 1000 }, ctx);
  assert.equal(p.subject, 'Payment by Meera for “Paint a wall”');
  assert.equal(p.href, '/tasks/t2');
  assert.equal(reconcileSubject({ refType: 'payment', refId: 'pay2', amountMinor: 1000 }, ctx).subject, 'Payment by Kiran');
});

test('reconcileSubject says plainly when the record could not be found', () => {
  const ctx = { tasks: new Map(), payouts: new Map(), payments: new Map() };
  assert.equal(reconcileSubject({ refType: 'task', refId: 'x', amountMinor: null }, ctx).subject, 'Job (no longer readable)');
});

test('lockedLateWithdrawals adds the withdrawal somebody claimed and never paid', () => {
  const now = Date.parse('2026-11-16T10:00:00Z');
  const queue = [
    { id: 'a', status: 'processing', amount_minor: 30000, requested_at: '2026-10-04T10:00:00Z', display_name: 'workerPro' },
    { id: 'b', status: 'processing', amount_minor: 100, requested_at: '2026-11-15T10:00:00Z', display_name: 'New' },
    { id: 'c', status: 'requested', amount_minor: 500, requested_at: '2026-10-01T10:00:00Z', display_name: 'Already listed' },
    { id: 'd', status: 'processing', amount_minor: 900, requested_at: '2026-10-02T10:00:00Z', display_name: 'Listed twice' },
  ];
  const rows = lockedLateWithdrawals(queue, now, new Set(['payout_waiting_long|payout|d']));
  assert.deepEqual(rows.map((r) => r.refId), ['a']);
  assert.equal(rows[0]!.code, 'payout_waiting_long');
  assert.equal(rows[0]!.amountMinor, 30000);
  assert.match(rows[0]!.detail, /claimed/i);
});

test('moneyHealthLine never says all is well while the Money check has open problems', () => {
  assert.equal(moneyHealthLine(0), null);
  assert.equal(moneyHealthLine(null), null);
  assert.match(moneyHealthLine(1)!, /1 open problem in the Money check/);
  assert.match(moneyHealthLine(90)!, /90 open problems in the Money check/);
});
