/**
 * Who may press which v2 button (design: act(..., {area})). The panel's own
 * rules in staff-roles.ts decide; this only words them for a locked button.
 * The server action must still check (requireAdmin + staffCan): this is UI only.
 *
 *   money  -> Admin, Finance            (payouts, refunds, disputes, wallet, promotions stop)
 *   people -> Admin, Support, Sales     (help requests, CRM, suspend/warn, copyright, moderation)
 *   admin  -> Admin                     (settings, switches, team, delete account)
 *   any    -> every role except Viewer  (tags, notes, follow-ups, alert switch)
 */
import { roleLabel, staffCan, type StaffRole } from '../../lib/staff-roles.ts';

export type V2Area = 'money' | 'people' | 'admin' | 'any';

export function canAct(role: StaffRole, area: V2Area): boolean {
  if (area === 'any') return role !== 'viewer';
  return staffCan(role, area);
}

const WHO: Record<V2Area, string> = {
  money: 'Admin and Finance',
  people: 'Admin, Support and Sales',
  admin: 'Admin',
  any: 'every role except Viewer',
};

/** null when the role may act; otherwise the sentence shown on hover of the locked button. */
export function lockReason(role: StaffRole, area: V2Area): string | null {
  if (canAct(role, area)) return null;
  if (role === 'viewer') return 'View only: your role (Viewer) sees everything and changes nothing.';
  return `Only ${WHO[area]} can do this. Your role is ${roleLabel(role)}.`;
}

/** Type-to-confirm check: words ignore case and outer spaces; amounts ignore commas and a rupee sign. */
export function wordMatches(typed: string, word: string): boolean {
  const norm = (s: string) => s.trim().replace(/^₹\s*/, '').replace(/,/g, '').toUpperCase();
  return word.trim() !== '' && norm(typed) === norm(word);
}
