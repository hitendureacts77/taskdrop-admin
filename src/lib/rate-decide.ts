/**
 * What the rate limiter does with the counter's answer (B121, H77). Pure, so it can be tested
 * without Supabase: the counter call and the reporter come in as arguments.
 *
 * When the counter cannot be reached, only the live strip's refresh ('admin-live') goes ahead:
 * an outage of the limiter must not blank the panel's live numbers. Every other bucket refuses
 * (sign-in, authenticator codes, exports, ...): a limit that vanishes during an outage is exactly
 * when someone would try to guess a password or a code.
 */

/** The only buckets that let calls through when the counter is down. */
export const FAIL_OPEN_BUCKETS: ReadonlySet<string> = new Set(['admin-live']);

export function failsOpen(bucket: string): boolean {
  return FAIL_OPEN_BUCKETS.has(bucket);
}

export type RateHit = () => PromiseLike<{ data: unknown; error: { message: string } | null }>;

export async function decideRate(
  hit: RateHit,
  bucket: string,
  report: (event: string, extra: Record<string, string | number | boolean>) => void,
): Promise<boolean> {
  let reason: string;
  try {
    const { data, error } = await hit();
    if (!error) return data !== false;
    reason = error.message;
  } catch (e) {
    reason = e instanceof Error ? e.message : String(e);
  }
  const open = failsOpen(bucket);
  report('rate_limiter_unavailable', { bucket, failOpen: open, reason: reason.slice(0, 200) });
  return open;
}
