import 'server-only';
import { createClient } from '@/lib/supabase/service';
import { keyToUuid } from './rate-key';

/** The plain-words refusal every limited route sends. */
export const TOO_FAST = 'You are going too fast. Please wait a moment and try again.';

/**
 * True when this key (a staff member's id, or a network address) may go ahead. One hit is counted
 * in the current minute by the same counter the app's server functions use (api_rate_hit, service
 * key only). A counter that cannot be reached lets the call through: an outage of the limiter must
 * not lock the staff out of the panel.
 */
export async function withinRate(key: string, bucket: string, limitPerMinute: number): Promise<boolean> {
  try {
    const { data, error } = await createClient().rpc('api_rate_hit', {
      p_user: key.includes('-') && key.length === 36 ? key : keyToUuid(key),
      p_bucket: bucket,
      p_limit: limitPerMinute,
    });
    if (error) {
      console.warn('rate limiter unavailable:', error.message);
      return true;
    }
    return data !== false;
  } catch (e) {
    console.warn('rate limiter unavailable:', e instanceof Error ? e.message : String(e));
    return true;
  }
}
