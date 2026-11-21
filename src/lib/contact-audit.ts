import 'server-only';
import { checkAdmin } from './auth';
import { createClient } from './supabase/server';

/** One "opened with contacts showing" row per staff member and person per this many minutes (S7-3). */
const CONTACT_VIEW_WINDOW_MIN = 10;

/**
 * Records that the signed-in staff member opened a person's page with their full phone and email showing (hunt H33),
 * through the same audit function the exports use (admin_log_event). The caller reveals the contacts only when this
 * returns true, so a failed write means masked values, not an unrecorded reveal. Only the person's id is stored.
 *
 * Only for a person who exists (L4-16), and only once per staff member and person per 10 minutes: Next re-runs the
 * page on every live refresh and every save, which used to write a new row each time (S7-3). A visit inside the
 * window is already on record, so it still returns true.
 */
export async function logContactView(personId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: person } = await supabase.from('profiles').select('id').eq('id', personId).maybeSingle();
    if (!person) return false;

    const check = await checkAdmin();
    if (check.status === 'ok') {
      const since = new Date(Date.now() - CONTACT_VIEW_WINDOW_MIN * 60_000).toISOString();
      const { data: recent } = await supabase
        .from('admin_audit_log')
        .select('id')
        .eq('actor', check.user.id)
        .eq('action', 'people.view_contact')
        .eq('target_id', `user:${personId}`)
        .gte('at', since)
        .limit(1);
      if (recent && recent.length > 0) return true;
    }

    // `as never`: the generated types predate migration 076, like the export routes.
    const { error } = await supabase.rpc('admin_log_event' as never, { p_action: 'people.view_contact', p_target: `user:${personId}`, p_detail: 'Opened a person page with phone and email visible' } as never);
    return !error;
  } catch {
    return false;
  }
}
