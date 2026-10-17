/**
 * Pure parsing for the panel's sign-in allowlist (env ADMIN_EMAIL / ADMIN_PHONE).
 * Each accepts one value or a comma-separated list. No imports, so it can be
 * unit-tested on its own.
 */

export type Allowlist = { emails: string[]; phones: string[] };

const digits10 = (s: string | undefined | null) => String(s ?? '').replace(/[^0-9]/g, '').slice(-10);

/** "a@x.com, B@x.com,,a@x.com" -> ["a@x.com", "b@x.com"]: trimmed, lowercase, no blanks, no repeats. */
export function parseEmailList(raw: string | undefined | null): string[] {
  const out = String(raw ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(out)];
}

/** Phones reduce to their last 10 digits; anything that does not end up with 10 digits is dropped. */
export function parsePhoneList(raw: string | undefined | null): string[] {
  const out = String(raw ?? '')
    .split(',')
    .map((s) => digits10(s))
    .filter((d) => d.length === 10);
  return [...new Set(out)];
}

export function parseAllowlist(emailRaw: string | undefined | null, phoneRaw: string | undefined | null): Allowlist {
  return { emails: parseEmailList(emailRaw), phones: parsePhoneList(phoneRaw) };
}

/** True when there is any allowlist at all; false means the database admin role alone decides. */
export const allowlistActive = (a: Allowlist) => a.emails.length + a.phones.length > 0;

/** How many accounts the allowlist names. */
export const allowlistCount = (a: Allowlist) => a.emails.length + a.phones.length;

/** The placeholder email an admin made with a mobile number sits on. */
export const phoneEmail = (phone10: string) => `p${phone10}@phone.taskdrop.app`;

export function isEmailAllowed(a: Allowlist, email: string | null | undefined): boolean {
  if (!allowlistActive(a)) return true;
  const e = (email ?? '').trim().toLowerCase();
  if (!e) return false;
  return a.emails.includes(e) || a.phones.some((p) => e === phoneEmail(p));
}
