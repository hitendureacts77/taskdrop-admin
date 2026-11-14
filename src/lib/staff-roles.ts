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

/**
 * The role a stored value names. Nothing stored (no admin_staff row) means a full admin, as the
 * database's private.staff_can also reads it; a value this panel does not know is treated as the
 * narrowest role, Viewer, never as a full admin (B120).
 */
export function asStaffRole(v: unknown): StaffRole {
  if (v === null || v === undefined || v === 'admin') return 'admin';
  return v === 'finance' || v === 'support' || v === 'sales' || v === 'viewer' ? v : 'viewer';
}

/**
 * The signed-in person's staff role from the admin_staff read, failing closed (B120):
 *   - a read error gives null, which the caller turns into a refusal;
 *   - no row at all is a full admin (the only way to get 'admin' without a row saying so);
 *   - a row whose role is missing or unknown is a Viewer.
 */
export function staffRoleFromRead(read: { data: unknown; error: unknown }): StaffRole | null {
  if (read.error) return null;
  if (read.data === null || read.data === undefined) return 'admin';
  const role = (read.data as { staff_role?: unknown }).staff_role;
  return role === null || role === undefined ? 'viewer' : asStaffRole(role);
}

export function staffCan(role: StaffRole, area: StaffArea): boolean {
  if (role === 'admin') return true;
  if (role === 'finance') return area === 'money';
  if (role === 'support' || role === 'sales') return area === 'people';
  return false;
}

/**
 * What a role may SEE, apart from what it may change. Most roles read the whole
 * panel; Sales is the exception: it works with customers, jobs and leads, so the
 * company's money and the panel's settings are hidden from it, not just locked.
 * 'money' covers earnings, payouts, refunds, disputes, promotions and business
 * reports; 'settings' covers Admin & configuration and the team.
 */
export type StaffView = 'money' | 'settings';

export function staffCanSee(role: StaffRole, _view: StaffView): boolean {
  return role !== 'sales';
}

/** The sidebar counts with company money zeroed for a role that may not see it (B129). */
export function navCountsFor<T extends { payouts: number; disputes: number; refunds: number }>(role: StaffRole, nav: T): T {
  return staffCanSee(role, 'money') ? nav : { ...nav, payouts: 0, disputes: 0, refunds: 0 };
}

/**
 * Whether a role may mark team alerts as read. The read time is one value shared by the whole
 * team, so a view-only role may not clear the list for everyone (B124).
 */
export function staffCanMarkAlerts(role: StaffRole): boolean {
  return role !== 'viewer';
}

/** Live events that show company money (withdrawals, payouts, wallet changes, disputes). */
export function liveEventIsMoney(kind: string, summary: Record<string, unknown> | null | undefined): boolean {
  if (kind === 'withdrawal_requested' || kind === 'payout_status' || kind === 'wallet_adjustment') return true;
  return kind === 'task_status' && summary?.to === 'DISPUTED';
}

export const roleLabel =(r: StaffRole) => STAFF_ROLES.find((x) => x.value === r)?.label ?? r;
