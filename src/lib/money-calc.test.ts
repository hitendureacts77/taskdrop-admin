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
