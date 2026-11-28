import assert from 'node:assert/strict';
import { test } from 'node:test';
import { moveAmountMinor, moveStatus, noteMatches, splitExplained, withdrawalMoney } from './money-calc.ts';

// Numbers from the live walk: ready 1,43,301 + clearing 9,945 + on the way 4,900 = 1,58,146 rupees.
const pos = { earningsMinor: 14330100, clearingMinor: 994500, inFlightMinor: 490000 };

test('ready to withdraw is only the earnings people can still ask for', () => {
  assert.equal(withdrawalMoney(pos).askMinor, 14330100);
});

test('what the payout account must cover right now is ready earnings plus withdrawals on the way, not clearing money', () => {
  assert.equal(withdrawalMoney(pos).coverMinor, 14330100 + 490000);
});

test('clearing and on-the-way are reported separately', () => {
  const w = withdrawalMoney(pos);
  assert.equal(w.clearingMinor, 994500);
  assert.equal(w.onTheWayMinor, 490000);
});

// B137: every read error used to look like "migration 066 not applied". Only a missing function says that now.
import { readFileSync } from 'node:fs';
import { positionProblem } from './money-calc.ts';

test('the money position names the real error, and blames migration 066 only when the function is missing', () => {
  assert.equal(positionProblem({ message: 'Could not find the function public.admin_money_position without parameters in the schema cache', code: 'PGRST202' }), 'The money position function is missing on this database (migration 066).');
  assert.equal(positionProblem({ message: 'function public.admin_money_position() does not exist', code: '42883' }), 'The money position function is missing on this database (migration 066).');
  assert.equal(positionProblem({ message: 'Admins only', code: 'P0001' }), 'Could not read the money position: Admins only');
  assert.equal(positionProblem({ message: 'upstream request timeout' }), 'Could not read the money position: upstream request timeout');
  assert.equal(positionProblem(null), null);
  const src = readFileSync(new URL('./data/payouts.ts', import.meta.url), 'utf8');
  assert.ok(!/if \(error\) return null;/.test(src.slice(src.indexOf('getMoneyPosition'))), 'no error is swallowed as null');
  assert.ok(readFileSync(new URL('../components/views/PayoutsView.tsx', import.meta.url), 'utf8').includes('positionError'));
});

test('noteMatches ties a note to one Money check line', () => {
  const id = '3f2b1c4d-0000-4000-8000-000000000001';
  const line = { code: 'no_commission', refType: 'task', refId: id, at: '2026-11-20T10:00:00Z' };
  assert.equal(noteMatches(line, { code: 'no_commission', refType: 'task', refId: id.toUpperCase(), at: null }), true);
  assert.equal(noteMatches(line, { code: 'never_paid', refType: 'task', refId: id, at: null }), false);
  assert.equal(noteMatches(line, { code: 'no_commission', refType: 'payout', refId: id, at: null }), false);
  const loose = { code: 'never_paid', refType: 'payment', refId: '', at: '2026-11-01T10:00:00.000Z' };
  assert.equal(noteMatches(loose, { code: 'never_paid', refType: 'payment', refId: null, at: '2026-11-01T10:00:00+00:00' }), true);
  assert.equal(noteMatches(loose, { code: 'never_paid', refType: 'payment', refId: null, at: '2026-11-02T10:00:00Z' }), false);
  assert.equal(noteMatches(loose, { code: 'never_paid', refType: 'payment', refId: id, at: null }), false);
});

test('splitExplained moves explained lines out of the open list', () => {
  const a = { code: 'x', refType: 'task', refId: '3f2b1c4d-0000-4000-8000-00000000000a', at: null };
  const b = { code: 'x', refType: 'task', refId: '3f2b1c4d-0000-4000-8000-00000000000b', at: null };
  const r = splitExplained([a, b], [{ code: 'x', refType: 'task', refId: b.refId, at: null, note: 'test' }]);
  assert.deepEqual(r.open, [a]);
  assert.equal(r.explained[0]?.note.note, 'test');
});

test('moveStatus and moveAmountMinor say what a Plan B hold is doing', () => {
  assert.deepEqual(moveStatus({ status: 'failed', failedFrom: 'refund_asked', attempts: 2 }), { label: 'Failed · try 2 of 5', tone: 'bad', move: 'refund' });
  assert.equal(moveStatus({ status: 'release_asked', failedFrom: null, attempts: 0 }).label, 'Sending');
  assert.equal(moveStatus({ status: 'released', failedFrom: null, attempts: 0 }).tone, 'ok');
  assert.equal(moveStatus({ status: 'expired', failedFrom: null, attempts: 0 }).move, 'none');
  assert.equal(moveAmountMinor({ status: 'failed', failedFrom: 'release_asked', releaseMinor: 135000, refundMinor: 0, chargedMinor: 154500 }), 135000);
  assert.equal(moveAmountMinor({ status: 'split', failedFrom: null, releaseMinor: 50000, refundMinor: 40000, chargedMinor: 100000 }), 90000);
});
