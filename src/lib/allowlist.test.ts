import assert from 'node:assert/strict';
import { test } from 'node:test';
import { allowlistCount, isEmailAllowed, parseAllowlist, parseEmailList, parsePhoneList } from './allowlist.ts';

test('a single email behaves as before', () => {
  assert.deepEqual(parseEmailList('Owner@Example.com'), ['owner@example.com']);
  const a = parseAllowlist('owner@example.com', '');
  assert.equal(isEmailAllowed(a, 'OWNER@example.com '), true);
  assert.equal(isEmailAllowed(a, 'other@example.com'), false);
  assert.equal(isEmailAllowed(a, null), false);
});

test('a comma-separated list is trimmed, lowercased, de-duplicated and blanks ignored', () => {
  assert.deepEqual(parseEmailList(' A@x.com, ,b@X.com,,a@x.com, '), ['a@x.com', 'b@x.com']);
  const a = parseAllowlist('a@x.com,b@x.com', undefined);
  assert.equal(isEmailAllowed(a, 'B@x.com'), true);
  assert.equal(isEmailAllowed(a, 'c@x.com'), false);
  assert.equal(allowlistCount(a), 2);
});

test('empty or missing values mean no allowlist: everyone with the database role may in', () => {
  for (const raw of [undefined, null, '', '  ', ' , ,']) {
    const a = parseAllowlist(raw, raw);
    assert.equal(allowlistCount(a), 0);
    assert.equal(isEmailAllowed(a, 'anyone@x.com'), true);
    assert.equal(isEmailAllowed(a, null), true);
  }
});

test('phones keep the last 10 digits, drop short ones, and match the placeholder email', () => {
  assert.deepEqual(parsePhoneList('+91 98765 43210, 12345, 9876543210, 91-80000-11111'), ['9876543210', '8000011111']);
  const a = parseAllowlist('', '+91 98765 43210');
  assert.equal(isEmailAllowed(a, 'p9876543210@phone.taskdrop.app'), true);
  assert.equal(isEmailAllowed(a, 'p9999999999@phone.taskdrop.app'), false);
});

test('emails and phones together', () => {
  const a = parseAllowlist('a@x.com, b@x.com', '9876543210');
  assert.equal(allowlistCount(a), 3);
  assert.equal(isEmailAllowed(a, 'p9876543210@phone.taskdrop.app'), true);
  assert.equal(isEmailAllowed(a, 'a@x.com'), true);
  assert.equal(isEmailAllowed(a, 'z@x.com'), false);
});

test('a phone-only list does not let a stray Google address in', () => {
  const a = parseAllowlist('', '9876543210');
  assert.equal(isEmailAllowed(a, 'someone@gmail.com'), false);
});
