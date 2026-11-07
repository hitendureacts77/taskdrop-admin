// node --experimental-strip-types --test src/lib/contact-mask.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contactTextFor, emailFor, maskContactText, maskEmail, maskPhone, phoneFor, staffSeesContacts } from './contact-mask.ts';
import type { StaffRole } from './staff-roles.ts';

const ROLES: StaffRole[] = ['admin', 'finance', 'support', 'sales', 'viewer'];

test('only Admin and Support see full contacts', () => {
  assert.deepEqual(ROLES.filter(staffSeesContacts), ['admin', 'support']);
});

test('an Indian number keeps only its last four digits', () => {
  assert.equal(maskPhone('919845012345'), '+91 ••••• •2345');
  assert.equal(maskPhone('+91 98450 12345'), '+91 ••••• •2345');
  assert.equal(maskPhone('9845012345'), '+91 ••••• •2345');
  const out = maskPhone('919845012345')!;
  assert.ok(!out.includes('98450'));
});

test('another country keeps only the last four digits too', () => {
  assert.equal(maskPhone('14155550123'), '+••••• •0123');
  assert.equal(maskPhone(''), '+•••••');
  assert.equal(maskPhone(null), null);
});

test('an email keeps its first letter and its domain', () => {
  assert.equal(maskEmail('asha@gmail.com'), 'a•••@gmail.com');
  assert.equal(maskEmail('p9845012345@phone.taskdrop.app'), 'p•••@phone.taskdrop.app');
  assert.equal(maskEmail('nonsense'), '•••');
  assert.equal(maskEmail(null), null);
});

test('a lead contact is masked by what it looks like', () => {
  assert.equal(maskContactText('asha@gmail.com'), 'a•••@gmail.com');
  assert.equal(maskContactText('98450 12345'), '+91 ••••• •2345');
  assert.equal(maskContactText('https://instagram.com/asha_k'), 'h•••');
  assert.equal(maskContactText('  '), null);
  assert.equal(maskContactText(null), null);
});

test('the role decides: full for Admin and Support, masked for everyone else', () => {
  for (const r of ROLES) {
    const full = staffSeesContacts(r);
    assert.equal(phoneFor(r, '919845012345'), full ? '919845012345' : '+91 ••••• •2345', r);
    assert.equal(emailFor(r, 'asha@gmail.com'), full ? 'asha@gmail.com' : 'a•••@gmail.com', r);
    assert.equal(contactTextFor(r, 'asha@gmail.com'), full ? 'asha@gmail.com' : 'a•••@gmail.com', r);
  }
});

test('a missing contact stays missing for every role', () => {
  for (const r of ROLES) {
    assert.equal(phoneFor(r, null), null);
    assert.equal(emailFor(r, undefined), null);
  }
});

import { exportContactCells } from './contact-mask.ts';
import { readFileSync } from 'node:fs';

const src = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('the People export gives full cells to Admin and Support and masked cells to the rest', () => {
  for (const r of ROLES) {
    const [email, phone] = exportContactCells(r, 'asha@gmail.com', '919845012345');
    if (staffSeesContacts(r)) {
      assert.deepEqual([email, phone], ['asha@gmail.com', '919845012345'], r);
    } else {
      assert.deepEqual([email, phone], ['a•••@gmail.com', '+91 ••••• •2345'], r);
      assert.ok(!email.includes('asha') && !phone.includes('98450'), r);
    }
  }
  assert.deepEqual(exportContactCells('viewer', null, undefined), ['', '']);
});

test('the server paths take the role, so a hand-made request cannot skip the mask', () => {
  // The CSV builder cannot be called without a role, and the route passes the signed-in staff member's own role.
  assert.ok(/exportCsv\(ids: string\[\], opts: \{ role: StaffRole/.test(src('./crm.ts')));
  assert.ok(src('./crm.ts').includes('exportContactCells(opts.role, email, phone)'));
  assert.ok(src('../app/api/crm/export/route.ts').includes('role: who.user.staffRole'));
  // The person page asks for full contacts only after the role check and the audit row.
  const page = src('../app/(dashboard)/users/[id]/page.tsx');
  assert.ok(/staffSeesContacts\(me\.staffRole\)[^\n]*logContactView\(id\)/.test(page));
  assert.ok(src('./data/users.ts').includes('contacts === \'full\' ? fullEmail : maskEmail(fullEmail)'));
  // Leads, team and copyright notices are masked where they are read.
  assert.ok(src('./leads.ts').includes('contactTextFor(role, r.contact)'));
  assert.ok(src('./admin-config.ts').includes('emailFor(role, a?.email)'));
  assert.ok(src('./copyright.ts').includes('emailFor(role, r.complainant_email)'));
});
