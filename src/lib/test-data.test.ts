import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hideTestFromCookie, isTestPhone, isTestRow, isTestTitle, isTestUserId, notTestIdFilter } from './test-data.ts';

test('fake seed ids, e2e titles and 98880 phones are test data', () => {
  assert.equal(isTestUserId('fa4e0001-0000-4000-8000-000000000001'), true);
  assert.equal(isTestUserId('FA4E0001-0000-4000-8000-000000000078'), true);
  assert.equal(isTestUserId('fa4e0002-0000-4000-8000-000000000001'), false);
  assert.equal(isTestUserId(null), false);
  assert.equal(isTestTitle('[e2e] dispute 12'), true);
  assert.equal(isTestTitle('[E2E] x'), true);
  assert.equal(isTestTitle('Fix my e2e tap'), false);
  assert.equal(isTestPhone('+91 98880 12345'), true);
  assert.equal(isTestPhone('9888012345'), true);
  assert.equal(isTestPhone('9876543210'), false);
  assert.equal(isTestRow({ posterId: 'fa4e0001-0000-4000-8000-000000000010' }), true);
  assert.equal(isTestRow({ title: 'Paint a wall', userId: '11111111-1111-1111-1111-111111111111' }), false);
});

test('only cookie value "1" hides', () => {
  assert.equal(hideTestFromCookie('1'), true);
  for (const v of [undefined, null, '', '0', 'true', 'yes']) assert.equal(hideTestFromCookie(v), false);
});

test('the id filter keeps nulls and refuses odd column names', () => {
  assert.equal(notTestIdFilter('poster_id'), 'poster_id.is.null,poster_id.lt.fa4e0001-0000-0000-0000-000000000000,poster_id.gt.fa4e0001-ffff-ffff-ffff-ffffffffffff');
  assert.throws(() => notTestIdFilter('id),or(x'));
});
