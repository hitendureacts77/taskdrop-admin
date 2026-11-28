/**
 * Plain names for the settings rows on the v2 Money & timing page (design setMoney). The editable
 * set and its limits are today's (lib/actions.ts EDITABLE, updateSetting); this file only words them.
 */
import { pct } from '@/lib/format';

export type SettingKind = 'percent' | 'days' | 'seconds' | 'count' | 'bool' | 'budgets' | 'lengths' | 'rupees';
export type SettingInfo = { label: string; help: string; kind: SettingKind; editable: boolean; note?: string; isNew?: boolean };

/** In the design's order. */
export const MONEY_SETTINGS: Record<string, SettingInfo> = {
  worker_commission_pct: { label: 'Commission TaskDrop keeps', help: 'Taken from the job price when the poster approves.', kind: 'percent', editable: false },
  poster_service_fee_pct: { label: 'Service fee posters pay', help: 'Added on top of the job price.', kind: 'percent', editable: true, note: 'Applies to payments made from now on. Jobs already paid for keep the fee they paid.' },
  post_start_cancel_penalty_pct: { label: 'Paid to the worker if a started job is cancelled', help: 'Part of the price the worker keeps.', kind: 'percent', editable: true, note: 'Applies to cancellations from now on.' },
  review_window_days: { label: 'Days a poster has to approve', help: 'After this the money is released by itself.', kind: 'days', editable: true, note: 'Applies to jobs marked done from now on.' },
  clearing_period_days: { label: 'Days before a worker can withdraw', help: 'Clearing time after approval.', kind: 'days', editable: true, note: 'Applies to jobs approved from now on.' },
  max_video_seconds: { label: 'Longest video on a job post', help: 'In seconds.', kind: 'seconds', editable: true },
  sms_daily_cap: { label: 'Sign-in codes a day', help: 'SMS cap for everyone. Alert at 80% and 100%. Google sign-in still works.', kind: 'count', editable: true, note: 'Takes effect on the next code.' },
  new_account_max_task_minor: { label: 'Biggest job a new account can post', help: 'Grows with each 4★+ finished job.', kind: 'rupees', editable: true, note: 'Applies to jobs posted from now on.' },
  new_account_max_withdraw_day_minor: { label: 'Most a new account can withdraw in a day', help: 'The total of one new account’s withdrawals in an India day.', kind: 'rupees', editable: true, note: 'Applies to withdrawals requested from now on.' },
  new_account_days: { label: 'Days an account counts as new', help: 'Until it is this old and has finished the jobs below.', kind: 'days', editable: true },
  new_account_tasks: { label: 'Finished jobs that end “new”', help: 'As poster or worker.', kind: 'count', editable: true },
  promotion_daily_budgets_minor: { label: 'Promotion daily budgets', help: 'Choices posters see.', kind: 'budgets', editable: true, note: 'The Promote screen offers exactly these from its next opening. Running campaigns are not changed.' },
  promotion_durations_days: { label: 'Promotion lengths', help: 'Choices posters see.', kind: 'lengths', editable: true, note: 'Running campaigns are not changed.' },
};

/** Keys shown on other tabs or handled elsewhere: never in Advanced. */
export const SHOWN_ELSEWHERE = new Set([
  'dev_otp_for_all',
  'launch_areas_on',
  'launch_areas_message',
  'walkthrough_video_url',
  'money_paused',
  'money_flow',
]);

/** Readable names for the read-only Advanced list. `old` = pre-Plan B leftover, `off` = authenticator piece. */
export const ADVANCED_NAMES: Record<string, { label: string; tag?: 'old' | 'off' }> = {
  ad_min_charge_minor: { label: 'Ad: minimum charge' },
  ad_cpm_divisor: { label: 'Ad: cost per 1,000 views divisor' },
  ad_events_keep_days: { label: 'Ad: keep view events for (days)' },
  admin_session_hours: { label: 'Staff session length (hours)' },
  admin_session_idle_minutes: { label: 'Sign staff out after idle (minutes)' },
  admin_require_mfa: { label: 'Authenticator for money actions', tag: 'off' },
  money_provider: { label: 'Payment provider' },
  min_topup_minor: { label: 'Smallest wallet top-up', tag: 'old' },
  promotion_bidding: { label: 'Promotion bidding' },
  sms_phone_daily_cap: { label: 'SMS codes per phone per day' },
  search_semantic_min: { label: 'Smart search: match strictness' },
  public_cache: { label: 'Kept copies of public lists' },
  public_snapshots_last_ok: { label: 'Public lists last refreshed' },
};

export function advancedName(key: string): { label: string; tag?: 'old' | 'off' } {
  if (ADVANCED_NAMES[key]) return ADVANCED_NAMES[key]!;
  if (key.startsWith('n8n')) return { label: 'Old n8n key (unused)', tag: 'old' };
  const words = key.replace(/_minor$/, '').replace(/_/g, ' ');
  return { label: words.charAt(0).toUpperCase() + words.slice(1) };
}

const days = (n: number) => `${n} day${n === 1 ? '' : 's'}`;

export function showSetting(kind: SettingKind, v: unknown): string {
  if (kind === 'percent') return pct(Number(v));
  if (kind === 'days') return days(Number(v));
  if (kind === 'seconds') return `${Number(v)} s`;
  if (kind === 'bool') return v === true || v === 'true' ? 'On' : 'Off';
  if (kind === 'count') return Number(v).toLocaleString('en-IN');
  if (kind === 'rupees') return `₹${(Number(v) / 100).toLocaleString('en-IN')}`;
  if (kind === 'budgets') return Array.isArray(v) ? v.map((n) => `₹${(Number(n) / 100).toLocaleString('en-IN')}`).join(', ') : String(v);
  if (kind === 'lengths') return Array.isArray(v) ? `${v.map((n) => Number(n)).join(', ')} days` : String(v);
  return String(v);
}

/** What goes in the "New value" box: the unit the admin types (%, rupees, lists). */
export function inputForSetting(kind: SettingKind, v: unknown): string {
  if (kind === 'percent') return String(Number((Number(v) * 100).toFixed(2)));
  if (kind === 'bool') return v === true || v === 'true' ? 'On' : 'Off';
  if (kind === 'rupees') return String(Number(v) / 100);
  if (kind === 'budgets') return Array.isArray(v) ? v.map((n) => Number(n) / 100).join(', ') : '';
  if (kind === 'lengths') return Array.isArray(v) ? v.map((n) => Number(n)).join(', ') : '';
  return String(Number(v));
}

export const UNIT: Record<SettingKind, string> = {
  percent: ' (in %)',
  days: ' (days)',
  seconds: ' (seconds)',
  count: '',
  bool: ' (On or Off)',
  rupees: ' (rupees)',
  budgets: ' (rupees, separated by commas)',
  lengths: ' (days, separated by commas)',
};
