import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canAct, lockReason, wordMatches } from './roles.ts';

test('areas follow staff roles; Viewer can change nothing', () => {
  assert.equal(canAct('admin', 'admin'), true);
  assert.equal(canAct('finance', 'money'), true);
  assert.equal(canAct('finance', 'people'), false);
  assert.equal(canAct('sales', 'people'), true);
  assert.equal(canAct('sales', 'money'), false);
  assert.equal(canAct('support', 'admin'), false);
  for (const area of ['money', 'people', 'admin', 'any'] as const) assert.equal(canAct('viewer', area), false, area);
  assert.equal(canAct('sales', 'any'), true);
});

test('a locked button says why', () => {
  assert.equal(lockReason('admin', 'money'), null);
  assert.match(lockReason('viewer', 'any')!, /View only/);
  assert.match(lockReason('support', 'money')!, /Admin and Finance/);
});

test('type-to-confirm', () => {
  assert.equal(wordMatches(' decide ', 'DECIDE'), true);
  assert.equal(wordMatches('1,470', '1470'), true);
  assert.equal(wordMatches('₹1470', '1470'), true);
  assert.equal(wordMatches('147', '1470'), false);
  assert.equal(wordMatches('', ''), false);
});
