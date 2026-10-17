import assert from 'node:assert/strict';
import { test } from 'node:test';
import { asStaffRole, staffCan, type StaffArea, type StaffRole } from './staff-roles.ts';

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

test('viewer changes nothing', () => {
  for (const a of AREAS) assert.equal(staffCan('viewer', a), false);
});

test('asStaffRole keeps known narrower roles and falls back to admin', () => {
  const narrower: StaffRole[] = ['finance', 'support', 'viewer'];
  for (const r of narrower) assert.equal(asStaffRole(r), r);
  assert.equal(asStaffRole(undefined), 'admin');
  assert.equal(asStaffRole('owner'), 'admin');
});
