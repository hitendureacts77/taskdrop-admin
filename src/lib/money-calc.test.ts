import assert from 'node:assert/strict';
import { test } from 'node:test';
import { withdrawalMoney } from './money-calc.ts';

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
