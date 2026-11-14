import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  STAFF_ROLES,
  asStaffRole,
  liveEventIsMoney,
  navCountsFor,
  roleLabel,
  staffCan,
  staffCanMarkAlerts,
  staffCanSee,
  staffRoleFromRead,
  type StaffArea,
  type StaffRole,
} from './staff-roles.ts';

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

test('asStaffRole keeps known roles; nothing stored is admin, an unknown value is viewer (B120)', () => {
  const roles: StaffRole[] = ['admin', 'finance', 'support', 'sales', 'viewer'];
  for (const r of roles) assert.equal(asStaffRole(r), r);
  // No admin_staff row: a full admin, as private.staff_can reads it.
  assert.equal(asStaffRole(undefined), 'admin');
  assert.equal(asStaffRole(null), 'admin');
  // A value the panel does not know never becomes a full admin.
  assert.equal(asStaffRole('owner'), 'viewer');
  assert.equal(asStaffRole(''), 'viewer');
  assert.equal(asStaffRole('ADMIN'), 'viewer');
});

test('staffRoleFromRead fails closed on a read error (B120)', () => {
  assert.equal(staffRoleFromRead({ data: null, error: { message: 'timeout' } }), null);
  assert.equal(staffRoleFromRead({ data: { staff_role: 'admin' }, error: { message: 'x' } }), null);
  assert.equal(staffRoleFromRead({ data: undefined, error: new Error('network') }), null);
});

test('staffRoleFromRead: only a real "no row" means a full admin (B120)', () => {
  assert.equal(staffRoleFromRead({ data: null, error: null }), 'admin');
  assert.equal(staffRoleFromRead({ data: { staff_role: 'sales', notify: true }, error: null }), 'sales');
  assert.equal(staffRoleFromRead({ data: { staff_role: 'admin' }, error: null }), 'admin');
  // A row without a role, or with one the panel does not know, is a Viewer.
  assert.equal(staffRoleFromRead({ data: {}, error: null }), 'viewer');
  assert.equal(staffRoleFromRead({ data: { staff_role: null }, error: null }), 'viewer');
  assert.equal(staffRoleFromRead({ data: { staff_role: 'owner' }, error: null }), 'viewer');
});

test('navCountsFor zeroes money counts for a role that may not see money (B129)', () => {
  const nav = { payouts: 3, disputes: 2, refunds: 4, support: 5 };
  assert.deepEqual(navCountsFor('sales', nav), { payouts: 0, disputes: 0, refunds: 0, support: 5 });
  for (const r of ['admin', 'finance', 'support', 'viewer'] as StaffRole[]) assert.deepEqual(navCountsFor(r, nav), nav);
});

test('only a view-only role may not mark team alerts read (B124)', () => {
  assert.equal(staffCanMarkAlerts('viewer'), false);
  for (const r of ['admin', 'finance', 'support', 'sales'] as StaffRole[]) assert.equal(staffCanMarkAlerts(r), true);
});
