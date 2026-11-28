import assert from 'node:assert/strict';
import { test } from 'node:test';
import { alertKind, alertLink, alertsHeading, groupAlerts, plainAlertBody, singularDigest } from './alerts-text.ts';

test('alert kinds read as plain words', () => {
  assert.equal(alertKind('payout_failed').label, 'Payout failed');
  assert.equal(alertKind('self_dealing').label, 'Possible self-dealing');
  assert.equal(alertKind('outbox_stuck').label, 'Background jobs not receiving events');
  assert.equal(alertKind('something_new').label, 'Other alert');
});

test('alerts link to the thing they are about', () => {
  const t = '7e9239c5-9345-4d1d-9da4-e96cd585654a';
  assert.deepEqual(alertLink('support', { ticket_id: t }), { href: `/support/${t}`, label: 'Open the help request' });
  assert.deepEqual(alertLink('dispute', { task_id: t }), { href: `/tasks/${t}`, label: 'Open the job' });
  assert.deepEqual(alertLink('self_dealing', { taskId: t }), { href: `/tasks/${t}`, label: 'Open the job' });
  assert.deepEqual(alertLink('withdrawal', { payout_id: t }), { href: `/payouts/${t}`, label: 'Open the withdrawal' });
  assert.equal(alertLink('withdrawal', { payout_id: t }, false), null);
  assert.equal(alertLink('reconcile', {}, false), null);
  assert.equal(alertLink('self_dealing', { taskId: 'not-an-id' }), null);
  assert.deepEqual(alertLink('support', { ticket_id: '../x' }), { href: '/support', label: 'Open Help requests' });
  assert.equal(alertLink('job_failed', {})?.href, '/settings/health');
});

test('alert text drops raw ids', () => {
  assert.equal(
    plainAlertBody('On job fe16ebe9-6476-4cac-88e4-1f7985f7f6c0 the poster and the worker use the same device.'),
    'On this job the poster and the worker use the same device.',
  );
  assert.equal(plainAlertBody('Run 926470b2-6425-4700-abb1-26e8b14556f1 found 3.'), 'Run found 3.');
});

test('noisy alerts are grouped under the newest', () => {
  const g = groupAlerts([
    { kind: 'self_dealing', title: 'a' },
    { kind: 'support', title: 'b' },
    { kind: 'self_dealing', title: 'c' },
    { kind: 'support', title: 'd' },
    { kind: 'job_failed', title: 'x' },
    { kind: 'job_failed', title: 'y' },
  ]);
  assert.deepEqual(
    g.map((x) => [x.head.title, x.rest.length]),
    [
      ['a', 1],
      ['b', 0],
      ['d', 0],
      ['x', 0],
      ['y', 0],
    ],
  );
});

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
