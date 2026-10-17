/**
 * Staff roles (migration 089 in the TaskDrop app repo). Every admin holds the
 * 'admin' role in user_roles; admin_staff narrows what they may change. The
 * database enforces the same table (private.staff_can); the panel checks first
 * to say so plainly, and is the only check for refunds and RazorpayX, which
 * run through edge functions.
 */

export type StaffRole = 'admin' | 'finance' | 'support' | 'sales' | 'viewer';
export type StaffArea = 'money' | 'people' | 'admin';

export const STAFF_ROLES: { value: StaffRole; label: string; short: string }[] = [
  { value: 'admin', label: 'Admin', short: 'Everything, including settings and the team' },
  { value: 'finance', label: 'Finance', short: 'Payouts, refunds, wallet changes and disputes' },
  { value: 'support', label: 'Support', short: 'Help requests, customer notes, tags, messages, suspensions and copyright' },
  { value: 'sales', label: 'Sales', short: 'Customers, notes, follow-ups, leads and moderation' },
  { value: 'viewer', label: 'Viewer', short: 'Sees everything, changes nothing' },
];

export const AREA_LABEL: Record<StaffArea, string> = {
  money: 'Money: payouts, refunds, wallet changes, disputes',
  people: 'People: help requests, CRM, suspensions, copyright',
  admin: 'Admin: settings, switches, the team, deleting accounts',
};

export function asStaffRole(v: unknown): StaffRole {
  return v === 'finance' || v === 'support' || v === 'sales' || v === 'viewer' ? v : 'admin';
}

export function staffCan(role: StaffRole, area: StaffArea): boolean {
  if (role === 'admin') return true;
  if (role === 'finance') return area === 'money';
  if (role === 'support' || role === 'sales') return area === 'people';
  return false;
}

export const roleLabel = (r: StaffRole) => STAFF_ROLES.find((x) => x.value === r)?.label ?? r;
