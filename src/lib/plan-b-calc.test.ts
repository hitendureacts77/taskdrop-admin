import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flowLabel, holdStateLabel, isPlanBMissing, parseOverview, providerLabel } from './plan-b-calc.ts';

test('parseOverview reads the database answer', () => {
  const o = parseOverview({
    flow: 'plan_b', provider: 'razorpay_route', paused: true, paused_since: '2026-11-19T10:00:00Z', counts: { held: '3', failed: 1 }, held_minor: '25000',
    stuck: [{ hold_id: 'h1', task_id: 't1', from: 'releasing', note: 'bank said no', attempts: 2, updated_at: '2026-11-19T11:00:00Z' }, { note: 'no id' }],
    matches: [{ day: '2026-11-18', provider: 'razorpay_route', ours_minor: 100, theirs_minor: 90, diff_minor: 10, ok: false, detail: 'x', created_at: null }],
  });
  assert.equal(o.paused, true);
  assert.equal(o.counts.held, 3);
  assert.equal(o.heldMinor, 25000);
  assert.equal(o.stuck.length, 1);
  assert.equal(o.matches[0]?.ok, false);
});

test('parseOverview survives junk', () => {
  const o = parseOverview(null);
  assert.equal(o.flow, 'wallet');
  assert.equal(o.provider, 'simulated');
  assert.deepEqual(o.stuck, []);
});

test('missing-function detection and labels', () => {
  assert.equal(isPlanBMissing('Could not find the function public.admin_plan_b_overview', 'PGRST202'), true);
  assert.equal(isPlanBMissing('function admin_plan_b_overview() does not exist', '42883'), true);
  assert.equal(isPlanBMissing('Enter your authenticator code', null), false);
  assert.equal(holdStateLabel('awaiting_payment'), 'Waiting for payment');
  assert.equal(providerLabel('simulated'), 'Simulated (staging test)');
  assert.equal(flowLabel('wallet'), 'Wallet');
});
