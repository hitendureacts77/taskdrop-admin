import { scrubText } from './scrub.ts';

/**
 * What a security event may carry to Sentry (B127): the staff role, the action or area, a reason
 * code and short ids. Anything else (emails, phone numbers, usernames, passwords, codes, tokens)
 * is dropped by name, and every value is scrubbed and cut short as well.
 */
const ALLOWED = new Set(['role', 'action', 'area', 'reason', 'status', 'bucket', 'failOpen', 'user', 'staff']);
const ID_KEYS = new Set(['user', 'staff']);

export function shortId(id: string): string {
  return id.slice(0, 8);
}

export function safeExtra(extra: Record<string, string | number | boolean>): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(extra)) {
    if (!ALLOWED.has(k)) continue;
    if (typeof v !== 'string') out[k] = v;
    else out[k] = ID_KEYS.has(k) ? shortId(v) : scrubText(v).slice(0, 120);
  }
  return out;
}
