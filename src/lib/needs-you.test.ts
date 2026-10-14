import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  copyrightNeed,
  describeSla,
  disputeNeed,
  helpNeed,
  needsSummary,
  payoutNeed,
  rankNeeds,
  refundNeed,
  slaOf,
  waitingFor,
  type NeedsItem,
} from './needs-you.ts';

const NOW = Date.parse('2026-10-13T12:00:00Z');
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();
const item = (kind: NeedsItem['kind'], hours: number, id = kind + hours): NeedsItem => ({
  id,
  kind,
  title: id,
  sub: '',
  since: hoursAgo(hours),
  href: '/x',
  area: 'money',
});

test('a withdrawal has 24 hours; a dispute has 48', () => {
  assert.equal(slaOf(item('payout', 1), NOW).state, 'ok');
  assert.equal(slaOf(item('dispute', 30), NOW).state, 'ok');
  assert.equal(slaOf(item('payout', 25), NOW).state, 'late');
  assert.equal(slaOf(item('dispute', 49), NOW).state, 'late');
});

test('the last quarter of the window is "soon"', () => {
  assert.equal(slaOf(item('payout', 17), NOW).state, 'ok'); // 7 h left of 24
  assert.equal(slaOf(item('payout', 18), NOW).state, 'soon'); // exactly 6 h left
  assert.equal(slaOf(item('payout', 23.9), NOW).state, 'soon');
  assert.equal(slaOf(item('dispute', 36), NOW).state, 'soon'); // 12 h left of 48
  assert.equal(slaOf(item('dispute', 35), NOW).state, 'ok');
});

test('exactly at the deadline is not yet late; a second after is', () => {
  const atDue = { kind: 'help' as const, since: hoursAgo(24) };
  assert.equal(slaOf(atDue, NOW).state, 'soon');
  assert.equal(slaOf(atDue, NOW + 1000).state, 'late');
});

test('a missing or unreadable date counts as just now, never as overdue', () => {
  assert.equal(slaOf({ kind: 'payout', since: '' }, NOW).state, 'ok');
  assert.equal(slaOf({ kind: 'payout', since: 'not a date' }, NOW).state, 'ok');
});

test('ranking: most overdue first, then about to be, then the oldest of the rest', () => {
  const ranked = rankNeeds(
    [item('help', 2, 'fresh help'), item('payout', 30, 'very late payout'), item('dispute', 40, 'dispute 8h left'), item('help', 25, 'late help'), item('payout', 20, 'payout soon')],
    NOW,
  );
  assert.deepEqual(
    ranked.map((r) => r.id),
    ['very late payout', 'late help', 'payout soon', 'dispute 8h left', 'fresh help'],
  );
});

test('a late dispute does not jump a later payout just because its window is longer', () => {
  // dispute: 50 h old, 2 h late. payout: 30 h old, 6 h late. The payout is more overdue.
  const ranked = rankNeeds([item('dispute', 50, 'dispute'), item('payout', 30, 'payout')], NOW);
  assert.deepEqual(ranked.map((r) => r.id), ['payout', 'dispute']);
});

test('ties are broken by age, then id, so the order never flickers', () => {
  const a = item('help', 5, 'b');
  const b = item('help', 5, 'a');
  assert.deepEqual(rankNeeds([a, b], NOW).map((r) => r.id), ['a', 'b']);
  assert.deepEqual(rankNeeds([b, a], NOW).map((r) => r.id), ['a', 'b']);
});

test('the summary counts late and soon', () => {
  const s = needsSummary(rankNeeds([item('payout', 30), item('payout', 20), item('payout', 1), item('help', 26)], NOW));
  assert.deepEqual(s, { total: 4, late: 2, soon: 1 });
});

test('deadlines read in plain words', () => {
  assert.equal(describeSla(slaOf(item('payout', 19), NOW)), '5 h left');
  assert.equal(describeSla(slaOf(item('payout', 26), NOW)), '2 h late');
  assert.equal(describeSla(slaOf(item('payout', 23.5), NOW)), '30 min left');
  assert.equal(describeSla(slaOf(item('payout', 100), NOW)), '3 days late');
  assert.equal(describeSla(slaOf(item('payout', 24.001), NOW)), 'just overdue');
});

test('waiting time reads in plain words', () => {
  assert.equal(waitingFor(hoursAgo(0), NOW), 'just now');
  assert.equal(waitingFor(hoursAgo(0.5), NOW), '30 min');
  assert.equal(waitingFor(hoursAgo(5), NOW), '5 h');
  assert.equal(waitingFor(hoursAgo(96), NOW), '4 days');
  // A clock a little ahead of the server never shows a negative wait.
  assert.equal(waitingFor(new Date(NOW + 60_000).toISOString(), NOW), 'just now');
});

test('the sentences name the person and the rupees, and link to where to act', () => {
  const p = payoutNeed({ id: 'p1', name: 'Meena', amountMinor: 120000, since: hoursAgo(1), stageLabel: 'Pay by hand' });
  assert.equal(p.title, 'Withdrawal of ₹1,200.00 by Meena');
  assert.equal(p.href, '/payouts/p1');
  assert.equal(p.area, 'money');

  const r = refundNeed({ taskId: 't1', poster: 'Ravi', dueMinor: 45000, title: 'Fix tap', since: null }, new Date(NOW).toISOString());
  assert.equal(r.title, 'Send ₹450.00 back to Ravi');
  assert.equal(r.since, new Date(NOW).toISOString());

  const d = disputeNeed({ taskId: 't2', title: 'Paint', poster: 'Asha', worker: 'Dev', frozenMinor: 80000, since: hoursAgo(3) });
  assert.equal(d.sub, 'Asha and Dev · ₹800.00 frozen');
  assert.equal(d.href, '/tasks/t2');
  assert.match(disputeNeed({ taskId: 't3', title: 'x', poster: 'A', worker: null, frozenMinor: 0, since: hoursAgo(1) }).sub, /nothing frozen/);

  const h = helpNeed({ id: 'h1', user: 'Kiran', subject: 'Payment missing', since: hoursAgo(1) });
  assert.equal(h.title, 'Reply to Kiran');
  assert.equal(h.area, 'people');

  const c = copyrightNeed({ id: 'c1', complainant: 'Acme Photos', work: 'Sunset', since: hoursAgo(1) });
  assert.equal(c.sub, 'Acme Photos · about “Sunset”');
});

test('missing names never read as "undefined" or "null"', () => {
  const all = [
    payoutNeed({ id: '1', name: null, amountMinor: 100, since: hoursAgo(1), stageLabel: '' }),
    refundNeed({ taskId: '2', poster: null, dueMinor: 100, title: '', since: null }, new Date(NOW).toISOString()),
    disputeNeed({ taskId: '3', title: '', poster: null, worker: null, frozenMinor: 0, since: hoursAgo(1) }),
    helpNeed({ id: '4', user: null, subject: '', since: hoursAgo(1) }),
    copyrightNeed({ id: '5', complainant: null, work: null, since: hoursAgo(1) }),
  ];
  for (const n of all) assert.doesNotMatch(`${n.title} ${n.sub}`, /undefined|null|NaN/, n.kind);
});
