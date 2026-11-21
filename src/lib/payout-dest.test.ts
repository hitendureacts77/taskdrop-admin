import assert from 'node:assert/strict';
import { test } from 'node:test';
import { destinationOf, manualPayLabel, paidLine, payoutDestinations, savedUpiId, type DestSource, destinationKind } from './payout-dest.ts';

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

test('a bank label pays the account on file when its last 4 digits match', () => {
  const p: DestSource = { ...base, snapshot: 'Bank · Ravi · ••••7890', kind: 'bank', account_name: 'Ravi', account_number: '1234567890', ifsc: 'HDFC0001' };
  assert.deepEqual(payoutDestinations(p), { primary: { how: 'Bank', name: 'Ravi', account: '1234567890', ifsc: 'HDFC0001' }, current: null });
});

test('a bank label whose account was replaced is not paid silently; the new account is only offered', () => {
  const p: DestSource = { ...base, snapshot: 'Bank · Ravi · ••••1234', kind: 'bank', account_name: 'Ravi', account_number: '5555500009', ifsc: 'HDFC0001' };
  const d = payoutDestinations(p);
  assert.equal(d.primary.how, 'MISSING');
  assert.equal(d.current?.how, 'Bank');
  const toUpi = payoutDestinations({ ...base, snapshot: 'Bank · Ravi · ••••1234', kind: 'upi', upi_id: 'new@okaxis' });
  assert.equal(toUpi.primary.how, 'MISSING');
  assert.deepEqual(toUpi.current, { how: 'UPI', vpa: 'new@okaxis' });
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

test('manualPayLabel stops claiming someone is paying once the lock is a day old', () => {
  const now = Date.parse('2026-11-13T12:00:00Z');
  assert.deepEqual(manualPayLabel('processing', '2026-11-13T06:00:00Z', now), { label: 'You’re paying', tone: 'blue' });
  assert.deepEqual(manualPayLabel('processing', '2026-10-04T12:00:00Z', now), { label: 'Locked 40 days: pay or give back', tone: 'red' });
  assert.deepEqual(manualPayLabel('processing', '2026-11-12T11:00:00Z', now), { label: 'Locked 1 day: pay or give back', tone: 'red' });
  assert.deepEqual(manualPayLabel('requested', '2026-10-04T12:00:00Z', now), { label: 'Waiting', tone: 'gold' });
});

test('destinationKind says UPI or Bank without the id or the account (A1-7)', () => {
  assert.equal(destinationKind('UPI · ravi.e2e@okaxis'), 'UPI');
  assert.equal(destinationKind('8074413313@ybl'), 'UPI');
  assert.equal(destinationKind('Bank · Ravi · ••••1234'), 'Bank');
  assert.equal(destinationKind('50100234567890'), null);
  assert.equal(destinationKind(null), null);
});

import { maskDestinationLabel, maskQueuedDestination } from './payout-dest.ts';

test('masking a destination hides the UPI id and the bank account', () => {
  assert.equal(maskDestinationLabel('UPI · asha@ybl'), 'UPI · a••••@ybl');
  assert.equal(maskDestinationLabel('asha@ybl'), 'UPI · a••••@ybl');
  assert.equal(maskDestinationLabel('Bank · Asha · ••••1234'), 'Bank · ••••1234');
  assert.equal(maskDestinationLabel(null), null);
  const m = maskQueuedDestination({ snapshot: 'UPI · asha@ybl', kind: 'upi', upi_id: 'asha@ybl', account_name: null, account_number: null, ifsc: null });
  assert.equal(m.upi_id, null);
  assert.ok(!JSON.stringify(m).includes('asha@'));
  const b = maskQueuedDestination({ snapshot: null, kind: 'bank', upi_id: null, account_name: 'Asha', account_number: '123456789012', ifsc: 'HDFC0001234' });
  assert.equal(b.snapshot, 'Bank · ••••9012');
  assert.equal(b.ifsc, null);
  assert.equal(b.account_number, null);
});
