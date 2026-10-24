import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTierList } from './tiers.ts';

test('sorts, de-duplicates and accepts commas or spaces', () => {
  assert.deepEqual(parseTierList('150, 50 80,80', 10, 5000), [50, 80, 150]);
});

test('refuses empty input, decimals, words and out-of-range values', () => {
  assert.equal(typeof parseTierList('', 10, 5000), 'string');
  assert.equal(typeof parseTierList('50.5', 10, 5000), 'string');
  assert.equal(typeof parseTierList('fifty', 10, 5000), 'string');
  assert.equal(typeof parseTierList('5', 10, 5000), 'string');
  assert.equal(typeof parseTierList('6000', 10, 5000), 'string');
});

test('allows six options and refuses seven', () => {
  assert.deepEqual(parseTierList('1 2 3 4 5 6', 1, 30), [1, 2, 3, 4, 5, 6]);
  assert.equal(typeof parseTierList('1 2 3 4 5 6 7', 1, 30), 'string');
});
