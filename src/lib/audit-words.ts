/**
 * Admin v2 audit log in plain words (WP8b). Pure, so it is unit-tested:
 * what happened, which area, and the before → after of each change, with no
 * snake_case keys or raw JSON in the main text. The raw row stays available
 * under "Technical details (for the developer)".
 */
import { inr, istDateTime } from './format.ts';

export type AuditWordsRow = {
  action: string;
  table: string | null;
  targetId: string | null;
  before: unknown;
  after: unknown;
  detail: string | null;
};

export type Change = { label: string; before: string; after: string };

/** Areas for the filter chips: today's list plus staff accounts (logged since the staff roles work). */
export const V2_AUDIT_AREAS: Record<string, string> = {
  settings: 'Settings',
  user_roles: 'Admin access',
  admin_staff: 'Staff accounts',
  payouts: 'Payouts',
  wallet_adjustments: 'Wallet changes',
  dispute_decisions: 'Dispute decisions',
  user_suspensions: 'Suspensions',
  crm_broadcasts: 'Messages sent',
  copyright_notices: 'Copyright',
  event: 'Staff actions',
};

/** Settings the owner meets most, in plain words. Anything else falls back to the key with spaces. */
export const SETTING_LABELS: Record<string, string> = {
  admin_require_mfa: 'Authenticator code for money actions',
  dev_otp_for_all: 'Developer sign-in (any number gets a code)',
  admin_session_idle_minutes: 'Idle sign-out (minutes)',
  admin_session_hours: 'Longest staff session (hours)',
  money_paused: 'Pause all money',
  money_flow: 'Money flow',
  money_provider: 'Money provider',
  payout_method: 'How withdrawals are paid',
  platform_commission_bps: 'TaskDrop commission',
  poster_fee_bps: 'Poster service fee',
  clearing_days: 'Days before earnings can be withdrawn',
  review_days: 'Days to check the work',
  search_semantic_min: 'Search match strictness',
};

/** Staff actions the database logs by name, beyond the ones today's admin names (EVENT_WORDS). */
export const EXTRA_EVENT_WORDS: Record<string, string> = {
  app_control_changed: 'Changed app switches',
  'crm.export': 'Exported a customer list',
  'reports.export': 'Exported a business report',
  crm_lead_added: 'Added a lead',
};

const PLATFORM_WORDS: Record<string, string> = { all: 'everywhere', web: 'Web', android: 'Android', ios: 'iPhone and iPad' };

const KEY_LABELS: Record<string, string> = {
  status: 'Status',
  role: 'Role',
  outcome: 'Decision',
  note: 'Note',
  reason: 'Reason',
  amount_minor: 'Amount',
  worker_paid_minor: 'Worker gets',
  poster_refunded_minor: 'Poster gets back',
  value: 'Value',
  active: 'Active',
  ends_at: 'Ends',
  title: 'Title',
  utr: 'Bank reference (UTR)',
  method: 'Method',
};

/** Keys that are ids or bookkeeping: never shown as a change. */
const NOISE = /^(id|key|created_at|updated_at|updated_by|created_by|decided_by)$|_id$/;

const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

const cap = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);
const humanKey = (k: string) => cap(k.replace(/_minor$/, '').replace(/_bps$/, '').replace(/_/g, ' '));

export function settingLabel(key: string | null): string {
  if (!key) return 'a setting';
  return SETTING_LABELS[key] ?? humanKey(key);
}

export function auditArea(table: string | null): string {
  if (!table) return 'Other';
  return V2_AUDIT_AREAS[table] ?? humanKey(table);
}

/** One stored value in plain words. `minor` marks paise; `bps` marks basis points. */
export function readableValue(v: unknown, kind: 'plain' | 'minor' | 'bps' = 'plain'): string {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'boolean') return v ? 'On' : 'Off';
  if (typeof v === 'number') {
    if (kind === 'minor') return inr(v);
    if (kind === 'bps') return `${(v / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`;
    return v.toLocaleString('en-IN');
  }
  if (typeof v === 'string') {
    if (kind === 'minor' && /^-?\d+$/.test(v)) return inr(Number(v));
    if (ISO_TIME.test(v) && !Number.isNaN(Date.parse(v))) return istDateTime(v);
    return v.length > 120 ? `${v.slice(0, 117)}…` : v;
  }
  if (Array.isArray(v)) return v.map((x) => readableValue(x)).join(', ');
  if (typeof v === 'object') {
    return Object.entries(v as Record<string, unknown>)
      .map(([k, x]) => `${humanKey(k).toLowerCase()}: ${readableValue(x)}`)
      .join(' · ');
  }
  return String(v);
}

const kindOf = (key: string): 'plain' | 'minor' | 'bps' => (key.endsWith('_minor') ? 'minor' : key.endsWith('_bps') ? 'bps' : 'plain');
const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const verbOf = (action: string) => action.split(' ')[0]?.toUpperCase() ?? '';

/** "reason: x; banner_text: a -> b" (app switch log lines) → reason + changes. */
export function parseDetailChanges(detail: string | null): { reason: string | null; changes: Change[] } {
  const out: { reason: string | null; changes: Change[] } = { reason: null, changes: [] };
  if (!detail) return out;
  for (const part of detail.split(/;\s*/)) {
    const m = /^([a-z0-9_]+):\s*([\s\S]*)$/i.exec(part.trim());
    if (!m) continue;
    const [, key, rest] = m as unknown as [string, string, string];
    if (key === 'reason') {
      out.reason = rest.trim() || null;
      continue;
    }
    const arrow = rest.split(/\s*->\s*/);
    if (arrow.length !== 2) continue;
    const clean = (s: string) => (s.trim() === 'null' ? '' : s.trim());
    out.changes.push({ label: humanKey(key), before: clean(arrow[0]!), after: clean(arrow[1]!) });
  }
  return out;
}

/** What happened, in one plain sentence. `events` is today's EVENT_WORDS list. */
export function auditSentence(r: AuditWordsRow, events: Record<string, string>): string {
  const verb = verbOf(r.action);
  if (r.table === 'event') {
    if (r.action === 'app_control_changed') {
      const where = (r.targetId ?? '').split(':')[1] ?? '';
      return `Changed app switches${PLATFORM_WORDS[where] ? ` (${PLATFORM_WORDS[where]})` : ''}`;
    }
    return events[r.action] ?? EXTRA_EVENT_WORDS[r.action] ?? cap(r.action.replace(/[._]/g, ' '));
  }
  if (r.table === 'settings') {
    const label = settingLabel(r.targetId);
    return verb === 'INSERT' ? `Added the setting "${label}"` : verb === 'DELETE' ? `Removed the setting "${label}"` : `Changed "${label}"`;
  }
  if (r.table === 'user_roles') {
    const role = (obj(r.after) ?? obj(r.before))?.role;
    const name = typeof role === 'string' ? role : 'a';
    return verb === 'DELETE' ? `Took away the ${name} role` : `Gave the ${name} role`;
  }
  if (r.table === 'admin_staff') return verb === 'INSERT' ? 'Added a staff member' : verb === 'DELETE' ? 'Removed a staff member' : 'Changed a staff member';
  if (r.table === 'payouts') {
    const a = obj(r.after);
    const b = obj(r.before);
    if (verb === 'UPDATE' && a?.status && b?.status && a.status !== b.status) return 'Withdrawal status changed';
    if (verb === 'INSERT') return 'Withdrawal requested';
    if (verb === 'DELETE') return 'Withdrawal removed';
    return 'Withdrawal changed';
  }
  if (r.table === 'dispute_decisions') {
    const outcome = obj(r.after)?.outcome;
    if (verb === 'INSERT') return outcome === 'worker' ? 'Decided a dispute: pay the worker' : outcome === 'poster' ? 'Decided a dispute: refund the poster' : 'Decided a dispute';
    return verb === 'DELETE' ? 'Removed a dispute decision' : 'Changed a dispute decision';
  }
  if (r.table === 'user_suspensions') return verb === 'INSERT' ? 'Suspended a person' : verb === 'DELETE' ? 'Removed a suspension' : 'Changed a suspension';
  if (r.table === 'wallet_adjustments') return 'Changed a wallet';
  if (r.table === 'crm_broadcasts') return 'Sent a message';
  if (r.table === 'copyright_notices') return verb === 'INSERT' ? 'Copyright notice received' : 'Changed a copyright notice';
  const area = auditArea(r.table).toLowerCase();
  return `${verb === 'INSERT' ? 'Added' : verb === 'DELETE' ? 'Removed' : 'Changed'} ${area}`;
}

/** Before → after, field by field, in plain words. At most `max` lines. */
export function auditChanges(r: AuditWordsRow, max = 8): Change[] {
  if (r.table === 'event') return parseDetailChanges(r.detail).changes.slice(0, max);
  const b = obj(r.before);
  const a = obj(r.after);
  if (r.table === 'settings') {
    const key = r.targetId ?? '';
    const before = readableValue(b?.value, kindOf(key));
    const after = readableValue(a?.value, kindOf(key));
    return before === after ? [] : [{ label: settingLabel(r.targetId), before, after }];
  }
  const keys = Array.from(new Set([...Object.keys(b ?? {}), ...Object.keys(a ?? {})])).filter((k) => !NOISE.test(k));
  const out: Change[] = [];
  for (const k of keys) {
    const before = readableValue(b?.[k], kindOf(k));
    const after = readableValue(a?.[k], kindOf(k));
    if (before === after) continue;
    out.push({ label: KEY_LABELS[k] ?? humanKey(k), before, after });
    if (out.length >= max) break;
  }
  return out;
}

/** The reason staff gave, when the row carries one. */
export function auditReason(r: AuditWordsRow): string | null {
  if (r.table === 'event') {
    const fromDetail = parseDetailChanges(r.detail).reason;
    if (fromDetail) return fromDetail;
  }
  for (const side of [obj(r.after), obj(r.before)]) {
    for (const k of ['reason', 'note']) {
      const v = side?.[k];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
  }
  return null;
}

/** Turns the change list into the two objects DiffList takes (label → value). */
export function diffMaps(changes: Change[]): { before: Record<string, string>; after: Record<string, string> } {
  const before: Record<string, string> = {};
  const after: Record<string, string> = {};
  for (const c of changes) {
    before[c.label] = c.before;
    after[c.label] = c.after;
  }
  return { before, after };
}

/**
 * Search words → extra filters: setting keys and logged action names whose
 * plain words match, so "idle sign-out" finds admin_session_idle_minutes.
 */
export function searchKeys(q: string, events: Record<string, string>): { settingKeys: string[]; actions: string[] } {
  const needle = q.trim().toLowerCase();
  if (!needle) return { settingKeys: [], actions: [] };
  const settingKeys = Object.entries(SETTING_LABELS)
    .filter(([, label]) => label.toLowerCase().includes(needle))
    .map(([k]) => k);
  const actions = Object.entries({ ...EXTRA_EVENT_WORDS, ...events })
    .filter(([, words]) => words.toLowerCase().includes(needle))
    .map(([k]) => k);
  return { settingKeys, actions };
}

/** Keeps a search safe inside a PostgREST filter: letters, digits, spaces and - _ . @ only, 60 characters. */
export function cleanSearch(q: unknown): string {
  if (typeof q !== 'string') return '';
  return q
    .replace(/[^\p{L}\p{N} _.@-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}
