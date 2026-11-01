/**
 * Hides keys, phone numbers and emails in anything that is about to leave for Sentry (task 2.5).
 * A dependency-free copy of this file lives in supabase/functions/_shared/scrub.ts and in the admin
 * repo (src/lib/scrub.ts); scrub.test.ts fails if the two in this repo differ. Change all three together.
 *
 * It is a last net, not an excuse: log lines and error messages still must not contain these values.
 */

const RULES: [RegExp, string][] = [
  // JSON web tokens (Supabase sessions, the anon and service-role keys)
  [/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, '[token]'],
  // Keys by their well-known prefixes
  [/\b(?:rzp_(?:live|test)_|sb_secret_|sbp_|gh[pousr]_|github_pat_|sntr[yu]s?_|xox[abprs]-|AKIA|ASIA)[A-Za-z0-9_+/=-]{6,}/g, '[key]'],
  [/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, 'Bearer [token]'],
  [/\bprivate_[A-Za-z0-9+/=]{20,}/g, '[key]'],
  // Emails
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g, '[email]'],
  // Indian mobile numbers: +91 98765 43210, 098765-43210, 9876543210
  [/(?<![\d.])(?:\+?91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}(?!\d)/g, '[phone]'],
  // Any other long run of hex or base64 that looks like a secret (not a dashed id)
  [/(?<![A-Za-z0-9_-])[A-Fa-f0-9]{40,}(?![A-Za-z0-9_-])/g, '[secret]'],
];

export function scrubText(text: string): string {
  let out = text;
  for (const [re, to] of RULES) out = out.replace(re, to);
  return out;
}

/** Header and field names whose value is dropped whatever it looks like. */
const DROP_KEY = /^(authorization|cookie|set-cookie|x-api-key|apikey|api[-_]?key|password|passwd|secret|token|access[-_]?token|refresh[-_]?token|otp|phone|mobile|email|ip_address)$/i;

/** Copy of `value` with every string scrubbed and every sensitive field removed. Depth-limited. */
export function scrubValue(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return scrubText(value);
  if (value === null || typeof value !== 'object' || depth > 8) return value;
  if (Array.isArray(value)) return value.map((v) => scrubValue(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (DROP_KEY.test(k)) continue;
    out[k] = scrubValue(v, depth + 1);
  }
  return out;
}

/**
 * For Sentry's `beforeSend`, `beforeSendTransaction` and `beforeBreadcrumb`: the same event with its
 * text scrubbed and the person's contact details and network address removed. Never throws; if
 * scrubbing itself fails the event is dropped rather than sent unscrubbed.
 */
export function scrubEvent<T>(event: T): T | null {
  try {
    const e = scrubValue(event) as Record<string, unknown>;
    if (e && typeof e === 'object' && e.user && typeof e.user === 'object') {
      const { id } = e.user as { id?: unknown };
      e.user = id ? { id } : undefined;
    }
    return e as T;
  } catch {
    return null;
  }
}
