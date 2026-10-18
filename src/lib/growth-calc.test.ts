import assert from 'node:assert/strict';
import { test } from 'node:test';
import { activityTotal, formatMinutes, funnelSteps, previousWindow, rate, retentionGrid, totalDaily, type DailyRow, type StaffPerf } from './growth-calc.ts';

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
