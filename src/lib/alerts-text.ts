/**
 * The daily digest is written by the background job as "1 new people", "1 jobs posted" and so on.
 * The job lives in the user repo, so the admin fixes the count words when it shows the line: a lone "1"
 * gets the singular. Anything else is left exactly as written. Pure, so it can be tested.
 */
const SINGULAR: [RegExp, string][] = [
  [/(^|[^\d.,])1 new people\b/g, '$11 new person'],
  [/(^|[^\d.,])1 jobs\b/g, '$11 job'],
  [/(^|[^\d.,])1 withdrawals\b/g, '$11 withdrawal'],
  [/(^|[^\d.,])1 open disputes\b/g, '$11 open dispute'],
  [/(^|[^\d.,])1 open help requests\b/g, '$11 open help request'],
];

export function singularDigest(body: string): string {
  return SINGULAR.reduce((s, [re, to]) => s.replace(re, to), body);
}

/** The heading over the alert list: it says how many are shown out of how many unread, so it agrees with the tab. */
export function alertsHeading(shown: number, unread: number, view: 'unread' | 'all', cap: number): { title: string; sub: string } {
  const noun = (n: number) => `alert${n === 1 ? '' : 's'}`;
  if (view === 'unread') {
    if (unread > shown) return { title: `Showing the latest ${shown} of ${unread} unread`, sub: 'Newest first. Mark these as read to see the older ones.' };
    return { title: `${shown} unread ${noun(shown)}`, sub: 'Newest first.' };
  }
  if (shown >= cap) return { title: `Showing the latest ${shown} ${noun(shown)}`, sub: `Newest first. Only the latest ${cap} are listed${unread ? `; ${unread} unread in all` : ''}.` };
  return { title: `${shown} ${noun(shown)}`, sub: 'Newest first.' };
}

// ------------------------------------------------------------- admin v2 --

export type AlertTone = 'ok' | 'earn' | 'wait' | 'bad' | 'danger' | 'mut';

/** Every alert kind the background jobs write, in plain words with a pill tone. Unknown kinds read "Other alert". */
export const ALERT_KIND: Record<string, { label: string; tone: AlertTone; money?: boolean; grouped?: boolean }> = {
  self_dealing: { label: 'Possible self-dealing', tone: 'bad', grouped: true },
  job_failed: { label: 'Background job failed', tone: 'danger', grouped: true },
  outbox_stuck: { label: 'Background jobs not receiving events', tone: 'danger', grouped: true },
  digest: { label: 'Daily digest', tone: 'mut', money: true },
  withdrawal: { label: 'Withdrawal', tone: 'wait', money: true },
  payout_failed: { label: 'Payout failed', tone: 'danger', money: true },
  support: { label: 'Help request', tone: 'earn' },
  dispute: { label: 'Dispute', tone: 'bad' },
  reconcile: { label: 'Money check', tone: 'wait', money: true },
};

export function alertKind(kind: string): { label: string; tone: AlertTone; money: boolean; grouped: boolean } {
  const k = ALERT_KIND[kind];
  return k ? { label: k.label, tone: k.tone, money: Boolean(k.money), grouped: Boolean(k.grouped) } : { label: 'Other alert', tone: 'mut', money: false, grouped: false };
}

/** Kinds that show company money: left out for a role that may not see money (Sales). */
export const MONEY_ALERT_KINDS: string[] = Object.entries(ALERT_KIND)
  .filter(([, v]) => v.money)
  .map(([k]) => k);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const idOf = (v: unknown): string | null => (typeof v === 'string' && UUID.test(v) ? v.toLowerCase() : null);

/**
 * Where an alert leads, from the ids the background job stored in `data`.
 * Only well-formed ids become links; money pages are left out when the viewer may not see money.
 */
export function alertLink(kind: string, data: Record<string, unknown> | null | undefined, seesMoney = true): { href: string; label: string } | null {
  const d = data ?? {};
  switch (kind) {
    case 'support': {
      const t = idOf(d.ticket_id);
      return t ? { href: `/support/${t}`, label: 'Open the help request' } : { href: '/support', label: 'Open Help requests' };
    }
    case 'dispute': {
      const t = idOf(d.task_id);
      return t ? { href: `/tasks/${t}`, label: 'Open the job' } : { href: '/disputes', label: 'Open Disputes' };
    }
    case 'self_dealing': {
      const t = idOf(d.taskId) ?? idOf(d.task_id);
      return t ? { href: `/tasks/${t}`, label: 'Open the job' } : null;
    }
    case 'withdrawal':
    case 'payout_failed': {
      if (!seesMoney) return null;
      const p = idOf(d.payout_id);
      return p ? { href: `/payouts/${p}`, label: 'Open the withdrawal' } : { href: '/payouts', label: 'Open Payouts' };
    }
    case 'reconcile':
      return seesMoney ? { href: '/money/reconcile', label: 'Open the Money check' } : null;
    case 'job_failed':
    case 'outbox_stuck':
      return { href: '/settings/health', label: 'Open System health' };
    case 'digest':
      return seesMoney ? { href: '/reports', label: 'Open Business reports' } : null;
    default:
      return null;
  }
}

/** The background job's short name (e.g. "nightly-reconcile") on a failed-job alert, when it is a plain word. */
export function alertJobKey(kind: string, data: Record<string, unknown> | null | undefined): string | null {
  if (kind !== 'job_failed') return null;
  const j = data?.job;
  return typeof j === 'string' && /^[a-z0-9][a-z0-9_-]{0,60}$/i.test(j) ? j : null;
}

const UUID_IN_TEXT = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

/** Alert text without raw ids: "On job <id> the poster…" reads "On this job the poster…"; any other id is dropped. */
export function plainAlertBody(body: string): string {
  return body
    .replace(new RegExp(`\\b(job|task)\\s+${UUID_IN_TEXT}\\b`, 'gi'), 'this $1')
    .replace(new RegExp(`\\s*\\(?\\b${UUID_IN_TEXT}\\b\\)?`, 'gi'), '')
    .replace(/\(see cron\.job_run_details\)/gi, '(see the background job log)')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * Groups repeated alerts of a noisy kind (self-dealing, the same failed job, stuck events) under the
 * newest one, so they do not bury the rest. Other kinds stay one per row. Order is kept (newest first).
 */
export function groupAlerts<T extends { kind: string; title: string }>(alerts: T[]): { head: T; rest: T[] }[] {
  const out: { head: T; rest: T[] }[] = [];
  const at = new Map<string, number>();
  for (const a of alerts) {
    const key = alertKind(a.kind).grouped ? `${a.kind}|${a.kind === 'job_failed' ? a.title : ''}` : null;
    const i = key === null ? undefined : at.get(key);
    if (i !== undefined) out[i]?.rest.push(a);
    else {
      if (key !== null) at.set(key, out.length);
      out.push({ head: a, rest: [] });
    }
  }
  return out;
}
