import assert from 'node:assert/strict';
import { test } from 'node:test';
import { alertFor } from './live-alerts.ts';
import type { LiveEvent } from './live-types.ts';

const ev = (kind: string, summary: Record<string, unknown>, record_id: string | null = 'r1'): LiveEvent => ({
  id: 7,
  kind,
  record_type: 'x',
  record_id,
  actor_id: null,
  summary,
  created_at: '2026-10-13T10:00:00Z',
});

const withdrawal = ev('withdrawal_requested', { who: 'Meena', amount_minor: 120000 });
const failed = ev('payout_status', { who: 'Meena', amount_minor: 120000, to: 'failed' });
const paid = ev('payout_status', { who: 'Meena', amount_minor: 120000, to: 'paid' });
const dispute = ev('task_status', { title: 'Paint', to: 'DISPUTED' });
const completed = ev('task_status', { title: 'Paint', to: 'COMPLETED' });
const help = ev('help_request', { who: 'Kiran', subject: 'Payment missing' });
const notice = ev('copyright_notice', { work: 'Sunset' });

test('things a person has to act on make a noise, with the plain sentence as the body', () => {
  assert.equal(alertFor(withdrawal, 'admin')?.title, 'Withdrawal requested');
  assert.equal(alertFor(withdrawal, 'admin')?.body, 'Meena asked to withdraw ₹1,200.00');
  assert.equal(alertFor(failed, 'admin')?.title, 'A payout failed');
  assert.equal(alertFor(dispute, 'admin')?.title, 'Dispute opened');
  assert.equal(alertFor(help, 'admin')?.title, 'New help request');
  assert.equal(alertFor(notice, 'admin')?.title, 'Copyright notice received');
});

test('failures, disputes and copyright notices are urgent; a request is not', () => {
  assert.equal(alertFor(failed, 'admin')?.urgent, true);
  assert.equal(alertFor(dispute, 'admin')?.urgent, true);
  assert.equal(alertFor(notice, 'admin')?.urgent, true);
  assert.equal(alertFor(withdrawal, 'admin')?.urgent, false);
  assert.equal(alertFor(help, 'admin')?.urgent, false);
});

test('good news and chatter stay quiet', () => {
  assert.equal(alertFor(paid, 'admin'), null);
  assert.equal(alertFor(completed, 'admin'), null);
  for (const kind of ['signup', 'task_posted', 'quote', 'proof', 'review', 'wallet_adjustment', 'something_new']) {
    assert.equal(alertFor(ev(kind, {}), 'admin'), null, kind);
  }
});

test('finance hears the money ones, support hears the people ones', () => {
  for (const e of [withdrawal, failed, dispute]) {
    assert.ok(alertFor(e, 'finance'), e.kind);
    assert.equal(alertFor(e, 'support'), null, e.kind);
  }
  for (const e of [help, notice]) {
    assert.ok(alertFor(e, 'support'), e.kind);
    assert.equal(alertFor(e, 'finance'), null, e.kind);
  }
});

test('a viewer can change nothing, so is told nothing', () => {
  for (const e of [withdrawal, failed, dispute, help, notice]) assert.equal(alertFor(e, 'viewer'), null, e.kind);
});

test('a notification links to where to act, and one thing never stacks twice', () => {
  const a = alertFor(dispute, 'admin');
  assert.equal(a?.href, '/tasks/r1');
  assert.equal(a?.tag, alertFor(dispute, 'admin')?.tag);
  assert.notEqual(a?.tag, alertFor(ev('task_status', { title: 'Paint', to: 'DISPUTED' }, 'r2'), 'admin')?.tag);
});

test('an event with no summary at all does not break', () => {
  const bare = { ...withdrawal, summary: undefined as unknown as Record<string, unknown> };
  assert.doesNotThrow(() => alertFor(bare, 'admin'));
  assert.doesNotMatch(alertFor(bare, 'admin')?.body ?? '', /undefined|null|NaN/);
});
