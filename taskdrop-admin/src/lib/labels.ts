/**
 * Plain-language names for database states. Shared by server and client code,
 * so nothing here may import server-only modules.
 */

export type Tone = 'green' | 'gold' | 'blue' | 'red' | 'grey';

export const TASK_STATUS: Record<string, { label: string; tone: Tone; hint: string }> = {
  OPEN: { label: 'Getting quotes', tone: 'grey', hint: 'Posted. Workers are sending prices; nobody is hired yet.' },
  LOCKED: { label: 'Worker hired', tone: 'blue', hint: 'The poster picked a worker. Work has not started.' },
  TASK_STARTED: { label: 'In progress', tone: 'blue', hint: 'The worker has started.' },
  OVERDUE: { label: 'Running late', tone: 'red', hint: 'Past the agreed time and not marked done.' },
  WORK_DONE: { label: "Waiting for poster's OK", tone: 'gold', hint: 'The worker says it is done. The poster has to approve.' },
  REVISION_REQUESTED: { label: 'Changes asked', tone: 'gold', hint: 'The poster asked the worker to fix something.' },
  COMPLETED: { label: 'Finished', tone: 'green', hint: 'Approved. The worker was paid and TaskDrop took its share.' },
  AUTO_COMPLETED: { label: 'Finished (auto)', tone: 'green', hint: 'The poster did not reply in time, so the money was released on its own.' },
  CANCELLED: { label: 'Cancelled', tone: 'grey', hint: 'Called off.' },
  DISPUTED: { label: 'Disputed', tone: 'red', hint: 'Poster and worker disagree. Money is frozen until an admin decides.' },
};

export function taskStatus(status: string) {
  return TASK_STATUS[status] ?? { label: status, tone: 'grey' as Tone, hint: '' };
}

/**
 * A withdrawal's status in words that always say whose money it is. A failed
 * or cancelled withdrawal goes back into the worker's own TaskDrop wallet --
 * never to the poster, and never to TaskDrop.
 */
export function payoutStatus(status: string, name = 'the worker'): { label: string; tone: Tone } {
  switch (status) {
    case 'requested':
      return { label: 'Waiting for you to send', tone: 'gold' };
    case 'processing':
      return { label: 'You are sending it', tone: 'blue' };
    case 'paid':
      return { label: `Sent to ${name}`, tone: 'green' };
    case 'failed':
      return { label: `Didn't go through · back in ${name}'s earnings`, tone: 'red' };
    case 'cancelled':
      return { label: `${name} cancelled · back in their earnings`, tone: 'grey' };
    default:
      return { label: status, tone: 'grey' };
  }
}

export const LEDGER_KIND: Record<string, { label: string; short: string; tone: Tone; hint: string }> = {
  worker_commission: { label: 'Commission', short: 'Commission', tone: 'green', hint: "TaskDrop's cut of the job price, taken when a job is approved." },
  poster_fee: { label: 'Service fee', short: 'Service fee', tone: 'blue', hint: 'The small extra a poster pays on top of the job price.' },
  ad_revenue: { label: 'Promotions', short: 'Promotion', tone: 'gold', hint: 'Posters paying to show their job higher.' },
  adjustment: { label: 'Corrections', short: 'Correction', tone: 'grey', hint: 'A manual fix to the books.' },
};

export function ledgerKind(kind: string) {
  return LEDGER_KIND[kind] ?? { label: kind, short: kind, tone: 'grey' as Tone, hint: '' };
}

export const TICKET_STATUS: Record<string, { label: string; tone: Tone }> = {
  waiting: { label: 'Waiting for a reply', tone: 'gold' },
  answered: { label: 'Answered', tone: 'blue' },
  resolved: { label: 'Resolved', tone: 'green' },
};

export const PROMOTION_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: 'Not paid yet', tone: 'grey' },
  active: { label: 'Showing now', tone: 'green' },
  expired: { label: 'Finished', tone: 'blue' },
  cancelled: { label: 'Cancelled', tone: 'grey' },
};

export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return ((parts[0]![0] ?? '') + (parts.length > 1 ? parts[parts.length - 1]![0] ?? '' : '')).toUpperCase();
}

/** Chart colours: TaskDrop jade for its own money, blue and gold for the other two sources, grey for comparisons. */
export const CHART_COLORS = {
  total: '#0E8F72',
  commission: '#0E8F72',
  fee: '#2F5BEA',
  promotions: '#E0A85A',
  previous: '#8A8A8A',
  escrow: '#9A6A1F',
};

/**
 * Where an open withdrawal stands, in words an admin can act on. Shared by the
 * Payouts page, the dashboard and the sidebar count so they always agree.
 */
export type PayoutStage = 'manual' | 'not-sent' | 'sending' | 'stuck' | 'queued' | 'approval' | 'check' | 'with-bank';

type OpenPayout = {
  status: string;
  requested_at: string;
  via?: string | null;
  last_attempt_at?: string | null;
  provider_payout_id?: string | null;
  provider_status?: string | null;
  failure_note?: string | null;
};

export function payoutStage(p: OpenPayout, nowMs: number, rxOn = true): PayoutStage {
  const MIN = 60000;
  if ((p.via ?? 'manual') === 'manual') return 'manual';
  if (p.failure_note?.startsWith('RazorpayX reported a second payout')) return 'check';
  // A request a minute old is normally being sent right now by the worker's app.
  if (p.status === 'requested') return rxOn && nowMs - (Date.parse(p.requested_at) || nowMs) < 10 * MIN ? 'sending' : 'not-sent';
  if (!p.provider_payout_id) {
    const since = Date.parse(p.last_attempt_at ?? p.requested_at) || nowMs;
    return nowMs - since > 30 * MIN || !rxOn ? 'stuck' : 'sending';
  }
  if (p.provider_status === 'queued') return 'queued';
  if (p.provider_status === 'pending') return 'approval';
  return 'with-bank';
}

export const PAYOUT_STAGE: Record<PayoutStage, { label: string; tone: Tone; needsYou: boolean }> = {
  manual: { label: 'Pay by hand', tone: 'gold', needsYou: true },
  'not-sent': { label: 'Not sent to RazorpayX yet', tone: 'gold', needsYou: true },
  sending: { label: 'Sending to RazorpayX', tone: 'blue', needsYou: false },
  stuck: { label: 'No answer from RazorpayX', tone: 'red', needsYou: true },
  queued: { label: 'Waiting for money in RazorpayX', tone: 'red', needsYou: true },
  approval: { label: 'Waiting for approval in RazorpayX', tone: 'gold', needsYou: true },
  check: { label: 'Check in RazorpayX', tone: 'red', needsYou: true },
  'with-bank': { label: 'With the bank', tone: 'blue', needsYou: false },
};
