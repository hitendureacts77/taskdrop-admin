import assert from 'node:assert/strict';
import { test } from 'node:test';
import { STAFF_ROLES, asStaffRole, liveEventIsMoney, roleLabel, staffCan, staffCanSee, type StaffArea, type StaffRole } from './staff-roles.ts';

const AREAS: StaffArea[] = ['money', 'people', 'admin'];

test('admin may do everything', () => {
  for (const a of AREAS) assert.equal(staffCan('admin', a), true);
});

test('finance only changes money', () => {
  assert.deepEqual(AREAS.filter((a) => staffCan('finance', a)), ['money']);
});

test('support only changes people', () => {
  assert.deepEqual(AREAS.filter((a) => staffCan('support', a)), ['people']);
});

test('sales changes people only, never money or admin', () => {
  assert.deepEqual(AREAS.filter((a) => staffCan('sales', a)), ['people']);
  assert.equal(staffCan('sales', 'money'), false);
  assert.equal(staffCan('sales', 'admin'), false);
});

test('sales is a listed role with a label', () => {
  assert.equal(roleLabel('sales'), 'Sales');
  assert.ok(STAFF_ROLES.some((r) => r.value === 'sales' && r.short.length > 0));
});

test('viewer changes nothing', () => {
  for (const a of AREAS) assert.equal(staffCan('viewer', a), false);
});

test('only sales is kept from seeing money and settings', () => {
  const roles: StaffRole[] = ['admin', 'finance', 'support', 'viewer'];
  for (const r of roles) {
    assert.equal(staffCanSee(r, 'money'), true);
    assert.equal(staffCanSee(r, 'settings'), true);
  }
  assert.equal(staffCanSee('sales', 'money'), false);
  assert.equal(staffCanSee('sales', 'settings'), false);
});

test('money live events are recognised', () => {
  assert.equal(liveEventIsMoney('withdrawal_requested', {}), true);
  assert.equal(liveEventIsMoney('payout_status', { to: 'paid' }), true);
  assert.equal(liveEventIsMoney('wallet_adjustment', {}), true);
  assert.equal(liveEventIsMoney('task_status', { to: 'DISPUTED' }), true);
  assert.equal(liveEventIsMoney('task_status', { to: 'COMPLETED' }), false);
  assert.equal(liveEventIsMoney('signup', {}), false);
  assert.equal(liveEventIsMoney('task_posted', null), false);
});

test('asStaffRole keeps known narrower roles and falls back to admin', () => {
  const narrower: StaffRole[] = ['finance', 'support', 'sales', 'viewer'];
  for (const r of narrower) assert.equal(asStaffRole(r), r);
  assert.equal(asStaffRole(undefined), 'admin');
  assert.equal(asStaffRole('owner'), 'admin');
});
