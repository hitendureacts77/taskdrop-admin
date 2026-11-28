import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inr } from './format.ts';
import { auditChanges, auditReason, auditSentence, cleanSearch, diffMaps, parseDetailChanges, readableValue, searchKeys, settingLabel } from './audit-words.ts';

const EVENTS = { 'user.warn': 'Warned a person' };
const row = (o: Partial<Parameters<typeof auditSentence>[0]>) => ({ action: 'UPDATE x', table: null, targetId: null, before: null, after: null, detail: null, ...o });

test('settings rows read as a plain change', () => {
  const r = row({ action: 'UPDATE settings', table: 'settings', targetId: 'admin_session_idle_minutes', before: { key: 'admin_session_idle_minutes', value: 90 }, after: { key: 'admin_session_idle_minutes', value: 30 } });
  assert.equal(auditSentence(r, EVENTS), 'Changed "Idle sign-out (minutes)"');
  assert.deepEqual(auditChanges(r), [{ label: 'Idle sign-out (minutes)', before: '90', after: '30' }]);
});

test('unknown setting keys lose their underscores', () => {
  assert.equal(settingLabel('ad_click_viewer_promo_day'), 'Ad click viewer promo day');
  assert.equal(settingLabel(null), 'a setting');
});

test('booleans, money and basis points are readable', () => {
  assert.equal(readableValue(true), 'On');
  assert.equal(readableValue(null), '');
  assert.equal(readableValue(147000, 'minor'), inr(147000));
  assert.ok(inr(147000).includes('1,470'));
  assert.equal(readableValue(250, 'bps'), '2.5%');
});

test('noise keys are left out and ids never show', () => {
  const r = row({ action: 'INSERT dispute_decisions', table: 'dispute_decisions', after: { id: 'x', task_id: 't', outcome: 'worker', worker_paid_minor: 9000, created_at: '2026-11-21T15:04:30Z', note: 'ok' } });
  const labels = auditChanges(r).map((c) => c.label);
  assert.deepEqual(labels, ['Decision', 'Worker gets', 'Note']);
  assert.equal(auditSentence(r, EVENTS), 'Decided a dispute: pay the worker');
  assert.equal(auditReason(r), 'ok');
});

test('app switch lines parse the reason and each change', () => {
  const d = 'reason: phase 1 live check: restore; banner_text: Phase 1 check banner -> null; banner_level: warning -> info';
  const p = parseDetailChanges(d);
  assert.equal(p.reason, 'phase 1 live check: restore');
  assert.deepEqual(p.changes, [
    { label: 'Banner text', before: 'Phase 1 check banner', after: '' },
    { label: 'Banner level', before: 'warning', after: 'info' },
  ]);
  const r = row({ action: 'app_control_changed', table: 'event', targetId: 'app_controls:android', detail: d });
  assert.equal(auditSentence(r, EVENTS), 'Changed app switches (Android)');
  assert.equal(auditReason(r), 'phase 1 live check: restore');
});

test('staff actions use the event words', () => {
  assert.equal(auditSentence(row({ action: 'user.warn', table: 'event' }), EVENTS), 'Warned a person');
  assert.equal(auditSentence(row({ action: 'crm.export', table: 'event' }), EVENTS), 'Exported a customer list');
  assert.equal(auditSentence(row({ action: 'some.new_thing', table: 'event' }), EVENTS), 'Some new thing');
});

test('roles read as given or taken away', () => {
  assert.equal(auditSentence(row({ action: 'DELETE user_roles', table: 'user_roles', before: { role: 'poster' } }), EVENTS), 'Took away the poster role');
  assert.equal(auditSentence(row({ action: 'INSERT user_roles', table: 'user_roles', after: { role: 'admin' } }), EVENTS), 'Gave the admin role');
});

test('diffMaps keys the change list by label', () => {
  assert.deepEqual(diffMaps([{ label: 'Status', before: 'requested', after: 'paid' }]), { before: { Status: 'requested' }, after: { Status: 'paid' } });
});

test('search words map to keys and actions', () => {
  assert.deepEqual(searchKeys('idle sign-out', EVENTS).settingKeys, ['admin_session_idle_minutes']);
  assert.ok(searchKeys('warned', EVENTS).actions.includes('user.warn'));
  assert.deepEqual(searchKeys('  ', EVENTS), { settingKeys: [], actions: [] });
});

test('cleanSearch strips filter syntax', () => {
  assert.equal(cleanSearch('a,b(c)*"d"\\e'), 'a b c d e');
  assert.equal(cleanSearch(42), '');
  assert.equal(cleanSearch('x'.repeat(80)).length, 60);
});
