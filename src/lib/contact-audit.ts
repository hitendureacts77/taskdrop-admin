import 'server-only';
import { createClient } from './supabase/server';

/**
 * Records that the signed-in staff member opened a person's page with their full phone and email showing (hunt H33),
 * through the same audit function the exports use (admin_log_event). The caller reveals the contacts only when this
 * returns true, so a failed write means masked values, not an unrecorded reveal. Only the person's id is stored.
 */
export async function logContactView(personId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    // `as never`: the generated types predate migration 076, like the export routes.
    const { error } = await supabase.rpc('admin_log_event' as never, { p_action: 'people.view_contact', p_target: `user:${personId}`, p_detail: 'Opened a person page with phone and email visible' } as never);
    return !error;
  } catch {
    return false;
  }
}
