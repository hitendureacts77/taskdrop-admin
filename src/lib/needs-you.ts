// Explicit .ts so node --test can run this file directly (npm test).
import { inr } from './format.ts';
import type { StaffArea } from './staff-roles.ts';

/**
 * "Needs you now": everything waiting on a person, ranked by how close it is to
 * missing its deadline. No server or browser code here, so the rules can be
 * tested and shared.
 *
 * The deadlines are TaskDrop's own promises to people (docs/ADMIN_BUILD_PROMPT.md,
 * section 3.1):
 *   withdrawals and refunds   24 hours   (someone is waiting for their money)
 *   help requests             24 hours
 *   disputes                  48 hours   (the money stays frozen until you decide)
 *   copyright notices         24 hours   (a takedown has to be prompt to be of use)
 */

export type NeedsKind = 'payout' | 'refund' | 'dispute' | 'help' | 'copyright';

export type NeedsItem = {
  /** Unique within its kind. */
  id: string;
  kind: NeedsKind;
  title: string;
  sub: string;
  /** When it started waiting for a person (ISO). */
  since: string;
  href: string;
  /** Which staff role can act on it (see staff-roles.ts). */
  area: StaffArea;
};

export const NEEDS_DEADLINE_HOURS: Record<NeedsKind, number> = {
  payout: 24,
  refund: 24,
  dispute: 48,
  help: 24,
  copyright: 24,
};

export const NEEDS_AREA: Record<NeedsKind, StaffArea> = {
  payout: 'money',
  refund: 'money',
  dispute: 'money',
  help: 'people',
  copyright: 'people',
};

export const NEEDS_ICON: Record<NeedsKind, string> = {
  payout: 'send',
  refund: 'undo',
  dispute: 'scale',
  help: 'help',
  copyright: 'alert',
};

export const NEEDS_LABEL: Record<NeedsKind, string> = {
  payout: 'Withdrawal',
  refund: 'Refund',
  dispute: 'Dispute',
  help: 'Help request',
  copyright: 'Copyright',
};

/** ok: plenty of time. soon: the last quarter of the window. late: past it. */
export type SlaState = 'ok' | 'soon' | 'late';

export type Sla = { state: SlaState; dueAt: string; msLeft: number };

const HOUR = 3_600_000;

export function slaOf(item: Pick<NeedsItem, 'kind' | 'since'>, nowMs: number): Sla {
  const window = NEEDS_DEADLINE_HOURS[item.kind] * HOUR;
  const started = Date.parse(item.since);
  // A missing or unreadable date counts as just now, not as ancient.
  const dueMs = (Number.isFinite(started) ? started : nowMs) + window;
  const msLeft = dueMs - nowMs;
  const state: SlaState = msLeft < 0 ? 'late' : msLeft <= window / 4 ? 'soon' : 'ok';
  return { state, dueAt: new Date(dueMs).toISOString(), msLeft };
}

export type RankedNeed = NeedsItem & { sla: Sla };

/** Most overdue first, then the ones about to be, then the oldest of the rest. */
export function rankNeeds(items: NeedsItem[], nowMs: number): RankedNeed[] {
  return items
    .map((i) => ({ ...i, sla: slaOf(i, nowMs) }))
    .sort((a, b) => a.sla.msLeft - b.sla.msLeft || a.since.localeCompare(b.since) || a.id.localeCompare(b.id));
}

export function needsSummary(ranked: RankedNeed[]): { total: number; late: number; soon: number } {
  return {
    total: ranked.length,
    late: ranked.filter((r) => r.sla.state === 'late').length,
    soon: ranked.filter((r) => r.sla.state === 'soon').length,
  };
}

/** "5 h left", "2 h late", "40 min left", "3 days late". */
export function describeSla(sla: Sla): string {
  const abs = Math.abs(sla.msLeft);
  const min = Math.round(abs / 60_000);
  const text = min < 1 ? 'under a minute' : min < 60 ? `${min} min` : abs < 48 * HOUR ? `${Math.round(abs / HOUR)} h` : `${Math.round(abs / (24 * HOUR))} days`;
  if (min < 1) return sla.msLeft < 0 ? 'just overdue' : 'due now';
  return `${text} ${sla.msLeft < 0 ? 'late' : 'left'}`;
}

/** How long it has been waiting: "12 min", "3 h", "2 days". */
export function waitingFor(since: string, nowMs: number): string {
  const started = Date.parse(since);
  const ms = Math.max(0, nowMs - (Number.isFinite(started) ? started : nowMs));
  const min = Math.round(ms / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min`;
  if (ms < 48 * HOUR) return `${Math.round(ms / HOUR)} h`;
  return `${Math.round(ms / (24 * HOUR))} days`;
}

// ------------------------------------------------------------- the sentences --

const nameOr = (v: string | null | undefined, fallback: string) => (v && v.trim() ? v.trim() : fallback);

export function payoutNeed(p: { id: string; name: string | null; amountMinor: number; since: string; stageLabel: string }): NeedsItem {
  return {
    id: p.id,
    kind: 'payout',
    title: `Withdrawal of ${inr(p.amountMinor)} by ${nameOr(p.name, 'someone')}`,
    sub: p.stageLabel,
    since: p.since,
    href: `/payouts/${p.id}`,
    area: NEEDS_AREA.payout,
  };
}

export function refundNeed(r: { taskId: string; poster: string | null; dueMinor: number; title: string; since: string | null }, nowIso: string): NeedsItem {
  return {
    id: r.taskId,
    kind: 'refund',
    title: `Send ${inr(r.dueMinor)} back to ${nameOr(r.poster, 'the poster')}`,
    sub: `“${r.title}” was cancelled`,
    since: r.since ?? nowIso,
    href: '/refunds',
    area: NEEDS_AREA.refund,
  };
}

export function disputeNeed(d: { taskId: string; title: string; poster: string | null; worker: string | null; frozenMinor: number; since: string }): NeedsItem {
  const parties = d.worker ? `${nameOr(d.poster, 'Poster')} and ${d.worker}` : nameOr(d.poster, 'Poster');
  return {
    id: d.taskId,
    kind: 'dispute',
    title: `Decide “${d.title}”`,
    sub: d.frozenMinor > 0 ? `${parties} · ${inr(d.frozenMinor)} frozen` : `${parties} · nothing frozen`,
    since: d.since,
    href: `/tasks/${d.taskId}`,
    area: NEEDS_AREA.dispute,
  };
}

export function helpNeed(t: { id: string; user: string | null; subject: string; since: string }): NeedsItem {
  return {
    id: t.id,
    kind: 'help',
    title: `Reply to ${nameOr(t.user, 'someone')}`,
    sub: t.subject || 'Help request',
    since: t.since,
    href: `/support/${t.id}`,
    area: NEEDS_AREA.help,
  };
}

export function copyrightNeed(n: { id: string; complainant: string | null; work: string | null; since: string }): NeedsItem {
  const work = n.work && n.work.trim() ? `about “${n.work.trim().slice(0, 80)}”` : 'waiting for a decision';
  return {
    id: n.id,
    kind: 'copyright',
    title: 'Decide a copyright notice',
    sub: `${nameOr(n.complainant, 'A rights holder')} · ${work}`,
    since: n.since,
    href: '/copyright',
    area: NEEDS_AREA.copyright,
  };
}
