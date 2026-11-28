import test from 'node:test';
import assert from 'node:assert/strict';
import { splitAmounts, splitStart, splitStep } from './split.ts';

const HOLD = { offerMinor: 100_000, chargedMinor: 103_000, workerShareMinor: 90_000 };

test('splitAmounts: matches migration 255 (staging run: 36,000 / 63,000 of 103,000)', () => {
  assert.deepEqual(splitAmounts(HOLD, 40_000), { partMinor: 40_000, workerMinor: 36_000, posterMinor: 63_000, taskdropMinor: 4_000 });
});

test('splitAmounts: all or nothing is not a split', () => {
  assert.equal(splitAmounts(HOLD, 0), null);
  assert.equal(splitAmounts(HOLD, 100_000), null);
  assert.equal(splitAmounts(HOLD, -5), null);
  assert.equal(splitAmounts(HOLD, Number.NaN), null);
});

test('splitAmounts: the three parts always add up to what the poster paid', () => {
  for (const part of [1, 333, 12_345, 50_000, 99_999]) {
    const s = splitAmounts(HOLD, part)!;
    assert.equal(s.workerMinor + s.posterMinor + s.taskdropMinor, HOLD.chargedMinor);
    assert.ok(s.workerMinor <= s.partMinor && s.taskdropMinor >= 0);
  }
});

test('splitStart / splitStep: half the price, on a step, inside the range', () => {
  assert.equal(splitStep(100_000), 5_000);
  assert.equal(splitStart(100_000), 50_000);
  assert.equal(splitStep(5_000), 100);
  const s = splitStart(300);
  assert.ok(s > 0 && s < 300);
});
