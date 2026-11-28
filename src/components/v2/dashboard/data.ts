import 'server-only';
import { createClient as createSessionClient } from '@/lib/supabase/server';

/**
 * Developer sign-in (`settings.dev_otp_for_all`): while it is on, any phone
 * number signs in with an auto-filled code. Owner decision 7: a red launch
 * blocker on the v2 dashboard. Null when the setting can't be read (no blocker
 * is claimed either way; App switches shows the real state).
 */
export async function getDevSignInOn(): Promise<boolean | null> {
  try {
    const supabase = await createSessionClient();
    const { data, error } = await supabase.from('settings').select('value').eq('key', 'dev_otp_for_all').maybeSingle();
    if (error) return null;
    const v = (data as { value: unknown } | null)?.value;
    return v === true || v === 'true';
  } catch {
    return null;
  }
}
