import 'server-only';
import { redirect } from 'next/navigation';
import { checkAdmin, type AdminUser } from '../auth';
import { createClient as createServiceClient } from '../supabase/service';
import { staffCanSee, type StaffView } from '../staff-roles';

/**
 * Every read the admin panel makes, in one place.
 *
 * Almost everything goes through the session client, so RLS applies as the
 * signed-in admin: the database already lets an admin read platform_ledger,
 * payouts, wallets, assignments, tasks, bids, support tickets, promotions,
 * wallet_adjustments and settings (private.is_admin() in each policy), and
 * profiles and reviews are public. The admin-only RPCs (platform_stats,
 * platform_earnings, admin_payout_queue) check private.is_admin() themselves.
 *
 * The service client is used, read-only, for exactly three things an admin
 * session cannot see: refunds_outstanding (revoked from every signed-in role in
 * migration 036), payments (own-rows only), and a person's email and phone
 * (auth.users). Each of those returns null when SUPABASE_SERVICE_ROLE_KEY isn't
 * set, and the page says so instead of crashing.
 *
 * Every page calls requireAdmin() itself before loading anything: a Next
 * layout's redirect does not stop the page beside it from rendering on the
 * server, so the check has to live next to the data.
 */


export async function requireAdmin(): Promise<AdminUser> {
  const check = await checkAdmin();
  if (check.status === 'unauthenticated') redirect('/login');
  if (check.status === 'forbidden') redirect('/not-authorized');
  return check.user;
}

/**
 * requireAdmin() for a page a role may not even see (staff-roles.ts, staffCanSee):
 * Sales is sent back to the dashboard instead of being shown company money or
 * settings. Called first on those pages, before any of their data is read.
 */
export async function requireSeeing(view: StaffView): Promise<AdminUser> {
  const me = await requireAdmin();
  if (!staffCanSee(me.staffRole, view)) redirect('/');
  return me;
}

export function serviceOrNull() {
  try {
    return createServiceClient();
  } catch {
    return null;
  }
}

export const hasServiceKey = () => Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

/** Strip characters that would break a PostgREST filter string. */
export function cleanSearch(q: string | undefined): string {
  return (q ?? '').replace(/[,()*%\\:"']/g, ' ').trim().slice(0, 80);
}

export const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
