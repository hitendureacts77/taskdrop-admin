import 'server-only';
import { ACTION_LIMITS, DUPLICATE_BROADCAST, DUPLICATE_WINDOW_MS, broadcastKey, isDuplicateBroadcast, type BroadcastTarget, type LimitedAction, type SentBroadcast } from './action-limits';
import { TOO_FAST, withinRate } from './rate-limit';
import { securityEvent } from './security-event';
import { createClient } from './supabase/server';

/**
 * null when this staff member may run `action` now; otherwise the sentence to show (B123).
 * Counted per staff id by the shared limiter, which refuses when it cannot be reached (B121).
 */
export async function actionLimit(staffId: string, action: LimitedAction): Promise<string | null> {
  const l: { bucket: string; perMinute: number; perHour?: number } = ACTION_LIMITS[action];
  const minuteOk = await withinRate(staffId, l.bucket, l.perMinute);
  const hourOk = minuteOk && (l.perHour ? await withinRate(staffId, `${l.bucket}-hour`, l.perHour, 3600) : true);
  if (minuteOk && hourOk) return null;
  securityEvent('admin_action_rate_limited', { action, staff: staffId.slice(0, 8) });
  return TOO_FAST;
}

/**
 * null when this broadcast is not a repeat; otherwise the sentence to show. Two checks: the last
 * two minutes of this staff member's sent broadcasts (a resend after a reload), and a one-shot
 * counter on a hash of audience + text (two clicks that land at the same moment).
 */
export async function broadcastDuplicate(staffId: string, target: BroadcastTarget, title: string, body: string): Promise<string | null> {
  const supabase = await createClient();
  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString();
  const { data, error } = await supabase
    .from('crm_broadcasts')
    .select('sent_at, to_user, criteria')
    .eq('sent_by', staffId)
    .eq('title', title)
    .eq('body', body)
    .gte('sent_at', since)
    .limit(20);
  if (error) return 'Could not check whether this was just sent. Please try again in a moment.';
  if (isDuplicateBroadcast((data ?? []) as SentBroadcast[], target, Date.now())) return DUPLICATE_BROADCAST;
  if (!(await withinRate(staffId, broadcastKey(target, title, body), 1))) return DUPLICATE_BROADCAST;
  return null;
}
