// node --experimental-strip-types --test src/lib/audit-target.test.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { auditPersonId, personAuditOr } from './audit-target.ts';

const P = '3f2c9a10-6d2e-4b8e-9f41-0a1b2c3d4e5f';
const ROW = '11111111-2222-4333-8444-555555555555';

test('a suspension row names the person from its user_id, not the row id', () => {
  assert.equal(auditPersonId({ table: 'user_suspensions', targetId: ROW, before: null, after: { id: ROW, user_id: P } }), P);
  assert.equal(auditPersonId({ table: 'user_suspensions', targetId: ROW, before: { id: ROW, user_id: P }, after: null }), P);
});

test('"opened a person page" rows (user:<id>) and warnings (plain id) name the person', () => {
  assert.equal(auditPersonId({ table: 'event', targetId: `user:${P}`, before: null, after: null }), P);
  assert.equal(auditPersonId({ table: 'event', targetId: P, before: null, after: null }), P);
});

test('a one-person message names them; settings and payouts by id do not', () => {
  assert.equal(auditPersonId({ table: 'crm_broadcasts', targetId: ROW, before: null, after: { to_user: P } }), P);
  assert.equal(auditPersonId({ table: 'crm_broadcasts', targetId: ROW, before: null, after: { to_user: null } }), null);
  assert.equal(auditPersonId({ table: 'settings', targetId: 'public_snapshots_last_ok', before: null, after: { value: 1 } }), null);
  assert.equal(auditPersonId({ table: 'event', targetId: 'export:crm', before: null, after: null }), null);
});

test("a person's Audit tab asks for every row that names them", () => {
  const f = personAuditOr(P);
  for (const part of [`target_id.eq.${P}`, `target_id.eq.user:${P}`, `after->>user_id.eq.${P}`, `before->>user_id.eq.${P}`, `after->>to_user.eq.${P}`]) {
    assert.ok(f.split(',').includes(part), part);
  }
  assert.throws(() => personAuditOr('x,target_id.neq.0'));
});

test('adding and removing a tag write an audit line (B108)', () => {
  const src = readFileSync(new URL('./crm-actions.ts', import.meta.url), 'utf8');
  assert.match(src, /'crm\.tag_add'/);
  assert.match(src, /'crm\.tag_remove'/);
});

test('audit rows read as plain words on the person page', async () => {
  const { auditWords } = await import('./audit-target.ts');
  assert.equal(auditWords('INSERT user_suspensions', 'user_suspensions', {}), 'Suspended them');
  assert.equal(auditWords('crm.tag_add', 'event', { 'crm.tag_add': 'Tagged a person' }), 'Tagged a person');
  assert.equal(auditWords('people.view_contact', 'event', {}), 'people view contact');
});
