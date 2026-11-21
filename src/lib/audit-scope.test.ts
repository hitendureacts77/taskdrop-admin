// node --experimental-strip-types --test src/lib/audit-scope.test.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { HEARTBEAT_SETTINGS, asAuditScope, isHeartbeat, notHeartbeatOr } from './audit-scope.ts';

test('the default list hides heartbeats; staff-only and everything are opt-in (B117)', () => {
  assert.equal(asAuditScope(undefined), 'default');
  assert.equal(asAuditScope('nonsense'), 'default');
  assert.equal(asAuditScope('staff'), 'staff');
  assert.equal(asAuditScope('all'), 'all');
});

test('the snapshot marker is a heartbeat; a real settings change is not', () => {
  assert.ok(HEARTBEAT_SETTINGS.includes('public_snapshots_last_ok'));
  assert.equal(isHeartbeat({ table: 'settings', targetId: 'public_snapshots_last_ok' }), true);
  assert.equal(isHeartbeat({ table: 'settings', targetId: 'service_fee_pct' }), false);
  assert.equal(isHeartbeat({ table: 'payouts', targetId: 'public_snapshots_last_ok' }), false);
});

test('the database filter keeps every row except heartbeat settings', () => {
  const parts = notHeartbeatOr().split(',');
  assert.ok(parts.includes('target_table.neq.settings'));
  assert.ok(parts.includes('target_table.is.null'));
  assert.ok(parts.some((p) => p.startsWith('target_id.not.in.(') && p.includes('public_snapshots_last_ok')));
});

test('the audit page reads the scope and never deletes rows', () => {
  const page = readFileSync(new URL('../app/(dashboard)/settings/audit/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /asAuditScope\(/);
  const cfg = readFileSync(new URL('./admin-config.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(cfg, /from\('admin_audit_log'\)\s*\.delete/);
  assert.match(cfg, /notHeartbeatOr\(\)/);
});
