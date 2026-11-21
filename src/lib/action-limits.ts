import { createHash } from 'node:crypto';

/**
 * Per-staff limits on the admin's riskiest server actions (B123, H77). Pure, so it can be tested
 * without Supabase; action-guard.ts applies it through the shared counter (withinRate).
 *
 * A broadcast reaches up to 5,000 people with one click, so it is the tightest and also has an
 * hourly cap. Money actions are not here: the database already makes them idempotent.
 */
export type ActionLimit = { bucket: string; perMinute: number; perHour?: number };

export const ACTION_LIMITS = {
  broadcast: { bucket: 'admin-broadcast', perMinute: 3, perHour: 20 },
  warn: { bucket: 'admin-warn', perMinute: 20 },
  suspend: { bucket: 'admin-suspend', perMinute: 10 },
  'delete-account': { bucket: 'admin-delete-account', perMinute: 5 },
} as const satisfies Record<string, ActionLimit>;

export type LimitedAction = keyof typeof ACTION_LIMITS;

/** How long the same broadcast to the same people is refused as a double send. */
export const DUPLICATE_WINDOW_MS = 2 * 60_000;

export const DUPLICATE_BROADCAST =
  'You sent this same message to the same people a moment ago, so it was not sent again. If you really mean to send it twice, wait two minutes.';

export type BroadcastTarget = { toUser: string | null; criteria: unknown };
export type SentBroadcast = { sent_at: string; to_user: string | null; criteria: unknown };

/** JSON with object keys sorted, so the same audience always gives the same text. */
export function stableJson(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return `[${v.map(stableJson).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .sort()
    .filter((k) => o[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${stableJson(o[k])}`)
    .join(',')}}`;
}

function sameAudience(row: SentBroadcast, target: BroadcastTarget): boolean {
  if ((row.to_user ?? null) !== (target.toUser ?? null)) return false;
  if (target.toUser) return true;
  return stableJson(row.criteria ?? null) === stableJson(target.criteria ?? null);
}

/**
 * True when one of `recent` (this staff member's broadcasts with the same title and text) went to
 * the same audience less than DUPLICATE_WINDOW_MS before `now`.
 */
export function isDuplicateBroadcast(recent: SentBroadcast[], target: BroadcastTarget, now: number): boolean {
  return recent.some((r) => {
    const at = Date.parse(r.sent_at);
    return Number.isFinite(at) && now - at < DUPLICATE_WINDOW_MS && sameAudience(r, target);
  });
}

/** A short, one-way key for "this audience + this title + this text" (no message text in it). */
export function broadcastKey(target: BroadcastTarget, title: string, body: string): string {
  const h = createHash('sha256')
    .update(stableJson({ u: target.toUser ?? null, c: target.toUser ? null : target.criteria ?? null, t: title, b: body }))
    .digest('hex')
    .slice(0, 24);
  return `admin-broadcast-dup:${h}`;
}
