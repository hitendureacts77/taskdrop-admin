/**
 * Who may see a person's full phone number and email, and what everyone else gets instead (security hunt H33).
 *
 * Only the Admin and Support staff roles see or export full contacts; Finance, Sales and Viewer get masked values. The
 * masking happens on the server, where the contact is read (data layer, CSV builders), never only in a component, so a
 * hand-made request cannot get the full value. Pure and import-free so it can be unit-tested on its own.
 */

import type { StaffRole } from './staff-roles.ts';

/** The roles that work with customers' contact details day to day. */
export function staffSeesContacts(role: StaffRole): boolean {
  return role === 'admin' || role === 'support';
}

const DOT = '•';

/** "919845012345" or "+91 98450 12345" -> "+91 ••••• •2345". Anything else keeps only its last 4 digits. */
export function maskPhone(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return `+${DOT.repeat(5)}`;
  const last = digits.slice(-4);
  const local = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits.length === 10 ? digits : null;
  if (local) return `+91 ${DOT.repeat(5)} ${DOT}${last}`;
  return `+${DOT.repeat(5)} ${DOT}${last}`;
}

/** "asha@gmail.com" -> "a•••@gmail.com". The first letter and the domain stay; the rest of the name goes. */
export function maskEmail(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const v = String(raw).trim();
  const at = v.lastIndexOf('@');
  if (at < 1) return `${DOT.repeat(3)}`;
  return `${v[0]}${DOT.repeat(3)}${v.slice(at)}`;
}

/**
 * A lead's contact is free text (a phone, an email or a link). Emails and phone-like text are masked as above; any
 * other text (a link, a handle) keeps only its first character.
 */
export function maskContactText(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const v = String(raw).trim();
  if (!v) return null;
  if (/^[^@\s]+@[^@\s]+$/.test(v)) return maskEmail(v);
  const digits = v.replace(/\D/g, '');
  if (digits.length >= 7 && /^[+\d\s().-]+$/.test(v)) return maskPhone(v);
  return `${v[0]}${DOT.repeat(3)}`;
}

/** The phone to hand to a screen or a spreadsheet: as stored for roles that may see it, masked for the rest. */
export function phoneFor(role: StaffRole, raw: string | null | undefined): string | null {
  if (raw == null) return null;
  return staffSeesContacts(role) ? raw : maskPhone(raw);
}

export function emailFor(role: StaffRole, raw: string | null | undefined): string | null {
  if (raw == null) return null;
  return staffSeesContacts(role) ? raw : maskEmail(raw);
}

export function contactTextFor(role: StaffRole, raw: string | null | undefined): string | null {
  if (raw == null) return null;
  return staffSeesContacts(role) ? raw : maskContactText(raw);
}

/** The Email and Phone cells of a People spreadsheet row: full for Admin and Support, masked for the other roles. */
export function exportContactCells(role: StaffRole, email: string | null | undefined, phone: string | null | undefined): [string, string] {
  return [emailFor(role, email) ?? '', phoneFor(role, phone) ?? ''];
}
