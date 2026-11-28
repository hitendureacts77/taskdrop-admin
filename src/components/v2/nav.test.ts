import assert from 'node:assert/strict';
import { test } from 'node:test';
import { v2ActiveHref, v2Crumbs, v2NavFor } from './nav.ts';

test('Sales sees no Money group, no Business reports and no Settings', () => {
  const nav = v2NavFor('sales');
  const hrefs = nav.flatMap((g) => g.items.map((i) => i.href));
  assert.equal(nav.some((g) => g.title === 'Money'), false);
  assert.equal(hrefs.includes('/reports'), false);
  assert.equal(hrefs.includes('/settings/team'), false);
  assert.equal(hrefs.includes('/crm'), true);
});

test('Viewer, Finance, Support and Admin see every item', () => {
  for (const role of ['viewer', 'finance', 'support', 'admin'] as const) {
    const hrefs = v2NavFor(role).flatMap((g) => g.items.map((i) => i.href));
    assert.ok(hrefs.includes('/payouts') && hrefs.includes('/settings/team'), role);
  }
});

test('active item and breadcrumbs', () => {
  assert.equal(v2ActiveHref('/payouts/abc'), '/payouts');
  assert.equal(v2ActiveHref('/settings/audit'), '/settings/team');
  assert.equal(v2ActiveHref('/crm/leads'), '/crm/leads');
  assert.equal(v2ActiveHref('/money/entries'), '/money');
  assert.deepEqual(v2Crumbs('/'), []);
  assert.deepEqual(v2Crumbs('/payouts/abc'), [{ label: 'Payouts', href: '/payouts' }, { label: 'Details' }]);
  assert.deepEqual(v2Crumbs('/settings/audit'), [{ label: 'Settings', href: '/settings/team' }, { label: 'Audit log' }]);
  assert.deepEqual(v2Crumbs('/settings/team'), [{ label: 'Team & access' }]);
  assert.deepEqual(v2Crumbs('/crm/leads'), [{ label: 'Customer hub', href: '/crm' }, { label: 'Leads' }]);
});
