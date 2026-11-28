/**
 * Switch history (admin v2, WP8a): every change to an app switch, in plain words, read from
 * admin_audit_log. Two kinds of rows land there:
 *   - events the admin functions write (admin_log_event): `detail` is
 *     "reason: …; posting: true -> false; …" (admin_set_app_control), "reason: …" (money pause),
 *     or a sentence (launch areas, walkthrough link);
 *   - row changes of `settings` that the audit trigger writes, with before/after values.
 * Pure, so it is unit-tested (controls-meta.test.ts).
 */
import { FEATURE_SWITCHES, PLATFORMS, REQUIRE_PHONE } from './controls-meta.ts';

export type HistoryRaw = {
  at: string;
  actorName: string;
  action: string;
  targetTable: string | null;
  targetId: string | null;
  before: unknown;
  after: unknown;
  detail: string | null;
};

export type HistoryChange = { what: string; from: string; to: string };
export type HistoryRow = { at: string; who: string; place: string | null; changes: HistoryChange[]; why: string | null };

/** The settings whose changes count as switch changes. */
export const HISTORY_SETTING_KEYS = ['dev_otp_for_all', 'admin_require_mfa', 'money_flow', 'money_provider', 'money_paused', 'launch_areas_on', 'walkthrough_video_url', 'admin_session_idle_minutes'] as const;

/** The admin events that count as switch changes. */
export const HISTORY_EVENTS = ['app_control_changed', 'money_paused', 'money_resumed', 'launch_area_saved', 'launch_area_removed', 'launch_areas_changed', 'walkthrough_link_changed', 'switch_reason'] as const;

const LABEL: Record<string, string> = {
  maintenance: 'Maintenance mode',
  maintenance_message: 'Maintenance message',
  min_version: 'Oldest app version allowed',
  update_url: 'Update link',
  banner_text: 'Banner text',
  banner_level: 'Banner look',
  banner_link: 'Banner link',
  banner_ends_at: 'Banner end date',
  environment: 'Environment',
  [REQUIRE_PHONE.key]: REQUIRE_PHONE.label,
  ...Object.fromEntries(FEATURE_SWITCHES.map((s) => [s.key, s.label])),
  dev_otp_for_all: 'Developer sign-in',
  admin_require_mfa: 'Authenticator code for money actions',
  money_flow: 'How money flows',
  money_provider: 'Payment provider',
  money_paused: 'Pause all money',
  launch_areas_on: 'Launch areas',
  walkthrough_video_url: 'Walkthrough video',
  admin_session_idle_minutes: 'Sign staff out after idle (minutes)',
};

export const historyLabel = (key: string) => LABEL[key] ?? key.replace(/_/g, ' ');

const WORDS: Record<string, string> = { true: 'On', false: 'Off', null: 'None', none: 'None', plan_b: 'Pay per task', wallet: 'Wallet', simulated: 'Simulated', razorpay: 'Razorpay', info: 'Information', warning: 'Warning', critical: 'Serious' };

/** A stored value in a word or two. */
export function historyValue(v: unknown): string {
  if (v === undefined) return 'None';
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  const bare = s.replace(/^"|"$/g, '').trim();
  if (bare === '') return 'None';
  return WORDS[bare] ?? (bare.length > 60 ? `${bare.slice(0, 57)}…` : bare);
}

const valueOf = (v: unknown): unknown => (v && typeof v === 'object' && !Array.isArray(v) && 'value' in (v as object) ? (v as { value: unknown }).value : v);

function placeOf(target: string | null): string | null {
  const m = /^app_controls:(\w+)$/.exec(target ?? '');
  if (!m) return null;
  return PLATFORMS.find((p) => p.key === m[1])?.label ?? m[1]!;
}

/** "reason: x; a: 1 -> 2; b: … " -> the reason and the changes. */
export function parseDetail(detail: string | null): { why: string | null; changes: HistoryChange[] } {
  const parts = (detail ?? '').split('; ').map((p) => p.trim()).filter(Boolean);
  let why: string | null = null;
  const changes: HistoryChange[] = [];
  const rest: string[] = [];
  for (const p of parts) {
    if (p.startsWith('reason: ')) {
      why = p.slice(8).trim() || null;
      continue;
    }
    if (p === 'no reason given') continue;
    const m = /^([a-z_]+): (.*) -> (.*)$/.exec(p);
    if (m) changes.push({ what: historyLabel(m[1]!), from: historyValue(m[2]), to: historyValue(m[3]) });
    else rest.push(p);
  }
  if (rest.length && !changes.length) changes.push({ what: rest.join('; '), from: '', to: '' });
  return { why, changes };
}

export function toHistoryRow(r: HistoryRaw): HistoryRow {
  if (r.targetTable === 'settings' && r.targetId) {
    return {
      at: r.at,
      who: r.actorName,
      place: null,
      changes: [{ what: historyLabel(r.targetId), from: historyValue(valueOf(r.before)), to: historyValue(valueOf(r.after)) }],
      why: null,
    };
  }
  const { why, changes } = parseDetail(r.detail);
  if (r.action === 'money_paused' || r.action === 'money_resumed') {
    return { at: r.at, who: r.actorName, place: null, changes: [{ what: 'Pause all money', from: r.action === 'money_paused' ? 'Off' : 'On', to: r.action === 'money_paused' ? 'On' : 'Off' }], why };
  }
  if (r.action === 'walkthrough_link_changed') {
    const m = /^(.*) -> (.*)$/.exec(changes[0]?.what ?? '');
    return { at: r.at, who: r.actorName, place: null, changes: [{ what: 'Walkthrough video', from: historyValue(m?.[1]), to: historyValue(m?.[2]) }], why };
  }
  if (r.action.startsWith('launch_area')) {
    return { at: r.at, who: r.actorName, place: null, changes: [{ what: `Launch areas: ${changes[0]?.what ?? 'changed'}`, from: '', to: '' }], why };
  }
  return { at: r.at, who: r.actorName, place: placeOf(r.targetId), changes, why };
}
