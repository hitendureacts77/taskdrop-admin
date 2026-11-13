import assert from 'node:assert/strict';
import { test } from 'node:test';
import { destinationOf, paidLine, payoutDestinations, savedUpiId, type DestSource } from './payout-dest.ts';

const base: DestSource = { snapshot: null, kind: null, upi_id: null, account_name: null, account_number: null, ifsc: null };

test('savedUpiId reads the saved label, plain or with the UPI prefix', () => {
  assert.equal(savedUpiId('seed.ravi@upi'), 'seed.ravi@upi');
  assert.equal(savedUpiId('UPI · ravi@okaxis'), 'ravi@okaxis');
  assert.equal(savedUpiId('Bank · Ravi · ••••1234'), null);
  assert.equal(savedUpiId('ra***@okaxis'), null);
  assert.equal(savedUpiId(null), null);
});

test('pays the UPI id saved on the withdrawal, not the account changed later (the bug)', () => {
  const p: DestSource = { ...base, snapshot: 'seed.ravi@upi', kind: 'upi', upi_id: 'ravi.e2e@okaxis' };
  assert.deepEqual(destinationOf(p), { how: 'UPI', vpa: 'seed.ravi@upi' });
  const d = payoutDestinations(p);
  assert.deepEqual(d.current, { how: 'UPI', vpa: 'ravi.e2e@okaxis' });
});

test('no warning when the saved and current UPI ids are the same (any case)', () => {
  const p: DestSource = { ...base, snapshot: 'UPI · Ravi@OkAxis', kind: 'upi', upi_id: 'ravi@okaxis' };
  assert.equal(payoutDestinations(p).current, null);
  assert.equal((payoutDestinations(p).primary as { vpa: string }).vpa, 'Ravi@OkAxis');
});

test('a bank label falls back to the account on file, with nothing to compare', () => {
  const p: DestSource = { ...base, snapshot: 'Bank · Ravi · ••••1234', kind: 'bank', account_name: 'Ravi', account_number: '1234567890', ifsc: 'HDFC0001' };
  assert.deepEqual(payoutDestinations(p), { primary: { how: 'Bank', name: 'Ravi', account: '1234567890', ifsc: 'HDFC0001' }, current: null });
});

test('missing account says why', () => {
  const d = destinationOf({ ...base, snapshot: 'ra***@okaxis' });
  assert.equal(d.how, 'MISSING');
});

test('saved UPI id with a bank account on file now offers the bank as the other choice', () => {
  const p: DestSource = { ...base, snapshot: 'ravi@okaxis', kind: 'bank', account_number: '99', account_name: 'R', ifsc: 'X' };
  assert.equal(destinationOf(p).how, 'UPI');
  assert.equal(payoutDestinations(p).current?.how, 'Bank');
});

test('paidLine says Not paid yet for an open withdrawal, whatever its via column holds', () => {
  assert.equal(paidLine('requested', 'razorpayx', true), 'Not paid yet · by hand');
  assert.equal(paidLine('processing', 'manual', true), 'Not paid yet · by hand');
  assert.equal(paidLine('requested', 'razorpayx', false), 'Not paid yet · RazorpayX sends it');
  assert.equal(paidLine('paid', 'razorpayx', false), 'By RazorpayX');
  assert.equal(paidLine('paid', 'manual', true), 'By hand');
  assert.equal(paidLine('failed', 'razorpayx', false), 'Not paid');
  assert.equal(paidLine('cancelled', null, true), 'Not paid');
});
