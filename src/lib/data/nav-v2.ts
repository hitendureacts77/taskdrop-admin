import 'server-only';
import { cache } from 'react';
import type { V2Counts } from '@/components/v2/nav';
import type { StaffRole } from '../staff-roles';
import { staffCanSee } from '../staff-roles';
import type { NavCounts } from './nav';

/**
 * Sidebar badge counts for admin v2. Today's four counts (payouts, refunds,
 * disputes, help requests) come from getNavCountsFor; the live panel adds
 * Needs you. The other badges (Money check problems, Flagged content,
 * Copyright notices, Team alerts, Feedback board, Skills & categories) are
 * owned by work package WP10 (search, alerts and badges), which fills
 * readExtraCounts below. Never throws: a missing count shows as no badge.
 */
export const getV2NavCounts = cache(async (role: StaffRole, base: NavCounts): Promise<V2Counts> => {
  const extra = await readExtraCounts(role).catch(() => ({}) as V2Counts);
  const money = staffCanSee(role, 'money');
  return {
    payouts: money ? base.payouts : 0,
    refunds: money ? base.refunds : 0,
    disputes: money ? base.disputes : 0,
    support: base.support,
    ...extra,
    ...(money ? {} : { check: 0 }),
  };
});

/** WP10 fills this in. */
async function readExtraCounts(_role: StaffRole): Promise<V2Counts> {
  return {};
}
