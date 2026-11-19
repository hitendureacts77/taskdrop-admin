/**
 * Plan B money controls (migration 193 in the app repo). Pure helpers: turn the
 * database's admin_plan_b_overview() answer into a typed shape, with plain labels.
 */

export const HOLD_STATES: { code: string; label: string }[] = [
  { code: 'awaiting_payment', label: 'Waiting for payment' },
  { code: 'held', label: 'Held' },
  { code: 'releasing', label: 'Releasing' },
  { code: 'released', label: 'Released' },
  { code: 'refunding', label: 'Refunding' },
  { code: 'refunded', label: 'Refunded' },
  { code: 'splitting', label: 'Splitting' },
  { code: 'split', label: 'Split' },
  { code: 'expired', label: 'Expired' },
  { code: 'failed', label: 'Failed' },
];

export function holdStateLabel(code: string): string {
  return HOLD_STATES.find((s) => s.code === code)?.label ?? code.replace(/_/g, ' ');
}

export type StuckHold = { holdId: string; taskId: string | null; from: string; note: string; attempts: number; updatedAt: string | null };
export type PlanBMatch = { day: string; provider: string; oursMinor: number; theirsMinor: number; diffMinor: number; ok: boolean; detail: string; createdAt: string | null };
export type PlanBOverview = {
  flow: 'wallet' | 'plan_b';
  provider: 'razorpay_route' | 'simulated';
  paused: boolean;
  pausedSince: string | null;
  counts: Record<string, number>;
  heldMinor: number;
  stuck: StuckHold[];
  matches: PlanBMatch[];
};

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const str = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

export function parseOverview(raw: unknown): PlanBOverview {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const counts: Record<string, number> = {};
  if (o.counts && typeof o.counts === 'object') for (const [k, v] of Object.entries(o.counts as Record<string, unknown>)) counts[k] = num(v);
  const stuck = (Array.isArray(o.stuck) ? o.stuck : []).flatMap((r): StuckHold[] => {
    const x = (r ?? {}) as Record<string, unknown>;
    const holdId = strOrNull(x.hold_id);
    return holdId ? [{ holdId, taskId: strOrNull(x.task_id), from: str(x.from), note: str(x.note), attempts: num(x.attempts), updatedAt: strOrNull(x.updated_at) }] : [];
  });
  const matches = (Array.isArray(o.matches) ? o.matches : []).slice(0, 14).map((r): PlanBMatch => {
    const x = (r ?? {}) as Record<string, unknown>;
    return { day: str(x.day), provider: str(x.provider), oursMinor: num(x.ours_minor), theirsMinor: num(x.theirs_minor), diffMinor: num(x.diff_minor), ok: x.ok === true, detail: str(x.detail), createdAt: strOrNull(x.created_at) };
  });
  return {
    flow: o.flow === 'plan_b' ? 'plan_b' : 'wallet',
    provider: o.provider === 'razorpay_route' ? 'razorpay_route' : 'simulated',
    paused: o.paused === true,
    pausedSince: strOrNull(o.paused_since),
    counts,
    heldMinor: num(o.held_minor),
    stuck,
    matches,
  };
}

/** The database says a function is missing (migration 193 not applied on this database). */
export function isPlanBMissing(message: string | null | undefined, code?: string | null): boolean {
  return /PGRST202|42883/.test(code ?? '') || /does not exist|could not find the function|schema cache/i.test(message ?? '');
}

export function providerLabel(p: PlanBOverview['provider']): string {
  return p === 'razorpay_route' ? 'Razorpay Route' : 'Simulated (staging test)';
}
export function flowLabel(f: PlanBOverview['flow']): string {
  return f === 'plan_b' ? 'Plan B (money held until approval)' : 'Wallet';
}
