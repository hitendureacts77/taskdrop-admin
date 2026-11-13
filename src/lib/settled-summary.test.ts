import assert from 'node:assert/strict';
import { test } from 'node:test';
import { settledSummary } from './settled-summary.ts';

test('the paid sum follows the same rows the Paid tab counts, not the all-time total', () => {
  const rows = [
    { status: 'failed', amount_minor: 500 },
    { status: 'cancelled', amount_minor: 700 },
  ];
  assert.deepEqual(settledSummary(rows), { paidMinor: 0, paidCount: 0 });
});

test('adds up only paid rows in the window', () => {
  const rows = [
    { status: 'paid', amount_minor: 60000 },
    { status: 'paid', amount_minor: 40000 },
    { status: 'failed', amount_minor: 500 },
  ];
  assert.deepEqual(settledSummary(rows), { paidMinor: 100000, paidCount: 2 });
});
