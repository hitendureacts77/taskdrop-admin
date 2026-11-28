import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cache } from 'react';
import type { V2Counts } from '@/components/v2/nav';
import { getCatalog } from '../catalog';
import { filterCounts } from '../catalog-calc';
import { countMoneyProblems } from '../growth';
import { createClient as createSessionClient } from '../supabase/server';
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

/** A badge that takes longer than this is left off, so a slow count never holds up the page. */
const COUNT_WAIT_MS = 2500;

function withinTime<T>(p: Promise<T>): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), COUNT_WAIT_MS);
  });
  return Promise.race([p.catch(() => null), late]).finally(() => clearTimeout(timer));
}

/** A head-only count; null when the table is not there yet or the role may not read it. */
async function headCount(build: (db: SupabaseClient) => PromiseLike<{ count: number | null; error: unknown }>): Promise<number | null> {
  // Some of these tables are newer than the generated types.
  const db = (await createSessionClient()) as unknown as SupabaseClient;
  const { count, error } = await build(db);
  return error ? null : (count ?? 0);
}

/**
 * The badges WP10 owns, each the same "waiting" rule its page uses:
 * Flagged content = open reports; Copyright notices = received, not yet handled;
 * Team alerts = unread; Feedback board = ideas in the Open tab (not hidden);
 * Skills & categories = added in the last 7 days (the page's "New" chip);
 * Money check = problems the check lists now (money roles only; others never read it).
 */
async function readExtraCounts(role: StaffRole): Promise<V2Counts> {
  const money = staffCanSee(role, 'money');
  const [flags, copyright, alerts, feedback, catalog, check] = await Promise.all([
    withinTime(headCount((db) => db.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'))),
    withinTime(headCount((db) => db.from('copyright_notices').select('id', { count: 'exact', head: true }).eq('status', 'received'))),
    withinTime(headCount((db) => db.from('admin_alerts').select('id', { count: 'exact', head: true }).is('read_at', null))),
    withinTime(headCount((db) => db.from('feedback_posts').select('id', { count: 'exact', head: true }).eq('status', 'open').is('hidden_at', null))),
    withinTime(
      Promise.all([getCatalog('skill'), getCatalog('category')]).then(([s, c]) => {
        if (s.error || s.setup || c.error || c.setup) return null;
        const now = new Date();
        return filterCounts(s.data, now).new + filterCounts(c.data, now).new;
      }),
    ),
    money ? withinTime(countMoneyProblems()) : Promise.resolve(null),
  ]);
  const out: V2Counts = {};
  const put = (k: keyof V2Counts, n: number | null) => {
    if (n !== null && n > 0) out[k] = n;
  };
  put('flags', flags);
  put('copyright', copyright);
  put('alerts', alerts);
  put('feedback', feedback);
  put('catalog', catalog);
  put('check', check);
  return out;
}
