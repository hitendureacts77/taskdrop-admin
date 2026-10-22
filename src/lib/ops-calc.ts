/**
 * Pure helpers for the nightly money check history and the dashboard health card.
 * No database access, so they are unit-tested.
 */

export type RunKind = 'internal' | 'razorpay';

export const KIND_LABEL: Record<RunKind, string> = { internal: 'Our books', razorpay: 'Razorpay' };

export type RunDifference =
  | { kind: 'internal'; code: string; severity: string; refType: string; refId: string; amountMinor: number | null; at: string | null; detail: string }
  | { kind: 'razorpay'; payment: string; ref: string; ours: string; theirs: string; note: string };

export type ReconRun = {
  id: string;
  ranAt: string;
  kind: RunKind;
  fromDay: string | null;
  toDay: string | null;
  checked: number;
  mismatches: number;
  differences: RunDifference[];
};

const s = (v: unknown) => (v == null ? '' : String(v));

export function asRunKind(v: unknown): RunKind | null {
  return v === 'internal' || v === 'razorpay' ? v : null;
}

/** The jsonb `detail` of a run, read defensively: anything that is not an array of objects gives no rows. */
export function parseRunDetail(kind: RunKind, detail: unknown): RunDifference[] {
  if (!Array.isArray(detail)) return [];
  const out: RunDifference[] = [];
  for (const x of detail) {
    if (!x || typeof x !== 'object') continue;
    const r = x as Record<string, unknown>;
    if (kind === 'internal') {
      out.push({
        kind,
        code: s(r.check_code),
        severity: s(r.severity),
        refType: s(r.ref_type),
        refId: s(r.ref_id),
        amountMinor: r.amount_minor == null || Number.isNaN(Number(r.amount_minor)) ? null : Number(r.amount_minor),
        at: r.at ? s(r.at) : null,
        detail: s(r.detail),
      });
    } else {
      out.push({ kind, payment: s(r.payment), ref: s(r.ref), ours: s(r.ours), theirs: s(r.theirs), note: s(r.note) });
    }
  }
  return out;
}

/** "ours captured, Razorpay failed: note" */
export function razorpayLine(d: { ours: string; theirs: string; note: string }): string {
  const base = `ours ${d.ours || 'unknown'}, Razorpay ${d.theirs || 'unknown'}`;
  return d.note ? `${base}: ${d.note}` : base;
}

/** The newest run of each kind from a list that may be in any order. */
export function latestPerKind(runs: { kind: RunKind; ranAt: string }[]): Partial<Record<RunKind, { kind: RunKind; ranAt: string }>> {
  const out: Partial<Record<RunKind, { kind: RunKind; ranAt: string }>> = {};
  for (const r of runs) {
    const cur = out[r.kind];
    if (!cur || new Date(r.ranAt).getTime() > new Date(cur.ranAt).getTime()) out[r.kind] = r;
  }
  return out;
}

export const STALE_AFTER_HOURS = 36;

/** True when there is no run or the last one is older than 36 hours (the nightly job is not set up, or has stopped). */
export function isRunStale(ranAt: string | null | undefined, now: Date, hours = STALE_AFTER_HOURS): boolean {
  if (!ranAt) return true;
  const t = new Date(ranAt).getTime();
  if (Number.isNaN(t)) return true;
  return now.getTime() - t > hours * 3600000;
}

/** The Sentry link to show, only when the value is a plain https URL. */
export function safeSentryUrl(raw: string | undefined | null): string | null {
  const v = (raw ?? '').trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' && u.hostname ? u.toString() : null;
  } catch {
    return null;
  }
}

export type ToolLink = { label: string; envName: string; url: string | null };

/** The outside dashboards the admin links to, each shown only when its env var holds a plain https URL. */
export function toolLinks(env: Record<string, string | undefined>): ToolLink[] {
  return [
    { label: 'Sentry (errors)', envName: 'SENTRY_PROJECT_URL' },
    { label: 'Inngest (background jobs)', envName: 'INNGEST_DASHBOARD_URL' },
    { label: 'ImageKit (images)', envName: 'IMAGEKIT_DASHBOARD_URL' },
  ].map((t) => ({ ...t, url: safeSentryUrl(env[t.envName]) }));
}

/** True when a database error means "your staff role may not see this" rather than a real failure. */
export function isStaffRefusal(message: string | null | undefined, code?: string | null): boolean {
  return code === '42501' || /staff role|can.?t see this|admins only|permission denied/i.test(message ?? '');
}
