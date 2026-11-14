import 'server-only';
import { createClient } from '@/lib/supabase/service';
import { decideRate } from './rate-decide';
import { keyToUuid } from './rate-key';
import { securityEvent } from './security-event';

/** The plain-words refusal every limited route sends. */
export const TOO_FAST = 'You are going too fast. Please wait a moment and try again.';

/**
 * True when this key (a staff member's id, or a network address) may go ahead. One hit is counted
 * in the current minute by the same counter the app's server functions use (api_rate_hit, service
 * key only). A counter that cannot be reached refuses the call and sends a security event, except
 * for the live strip's refresh, which goes ahead (rate-decide.ts, B121).
 */
export async function withinRate(key: string, bucket: string, limitPerMinute: number): Promise<boolean> {
  return decideRate(
    async () =>
      createClient().rpc('api_rate_hit', {
        p_user: key.includes('-') && key.length === 36 ? key : keyToUuid(key),
        p_bucket: bucket,
        p_limit: limitPerMinute,
      }),
    bucket,
    securityEvent,
  );
}
