/**
 * What the "+ Add admin" box was given: a person id, a Google/e-mail address
 * or an @username. Pure, so it can be unit-tested.
 */

export type WhoKind = 'uuid' | 'email' | 'username';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function classifyWho(raw: string): { kind: WhoKind; value: string } | null {
  const v = raw.trim();
  if (!v) return null;
  if (UUID.test(v)) return { kind: 'uuid', value: v };
  // "@asha" starts with @; an address has one in the middle.
  if (!v.startsWith('@') && EMAIL.test(v)) return { kind: 'email', value: v.toLowerCase() };
  const name = v.replace(/^@/, '').trim();
  return name ? { kind: 'username', value: name } : null;
}
