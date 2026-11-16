import assert from 'node:assert/strict';
import { test } from 'node:test';
import { alertsHeading, singularDigest } from './alerts-text.ts';

test('a lone 1 gets the singular word', () => {
  assert.equal(singularDigest('1 new people (10 in all)'), '1 new person (10 in all)');
  assert.equal(singularDigest('1 jobs posted, 1 finished'), '1 job posted, 1 finished');
  assert.equal(singularDigest('1 withdrawals waiting'), '1 withdrawal waiting');
  assert.equal(singularDigest('1 open disputes, 1 open help requests'), '1 open dispute, 1 open help request');
});

test('other counts are left alone', () => {
  assert.equal(singularDigest('11 new people (21 in all)'), '11 new people (21 in all)');
  assert.equal(singularDigest('0 new people, 2 jobs posted'), '0 new people, 2 jobs posted');
  assert.equal(singularDigest('1,1 new people'), '1,1 new people');
});

test('the heading agrees with the unread tab', () => {
  assert.equal(alertsHeading(100, 188, 'unread', 100).title, 'Showing the latest 100 of 188 unread');
  assert.equal(alertsHeading(5, 5, 'unread', 100).title, '5 unread alerts');
  assert.equal(alertsHeading(1, 1, 'unread', 100).title, '1 unread alert');
  assert.equal(alertsHeading(100, 188, 'all', 100).title, 'Showing the latest 100 alerts');
  assert.equal(alertsHeading(7, 0, 'all', 100).title, '7 alerts');
});
