import 'server-only';
import { parseEnvironment, type AppEnvironment } from './environment';
import { createClient } from './supabase/server';

/**
 * The environment, read the way the apps read their controls: the public
 * get_app_controls function, which needs no sign-in, so the sign-in page can
 * show the ribbon too. Any failure counts as staging (see environment.ts).
 *
 * Remembered for a few seconds, because the layout asks on every page load;
 * flipping the setting to production reaches this admin within that time.
 */
const KEEP_MS = 15_000;
let kept: { at: number; env: AppEnvironment } | null = null;

export async function getEnvironment(): Promise<AppEnvironment> {
  if (kept && Date.now() - kept.at < KEEP_MS) return kept.env;
  let env: AppEnvironment = 'staging';
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_app_controls', { p_platform: 'web' });
    if (!error) env = parseEnvironment(data);
  } catch {
    // Unreachable database: fall through to staging.
  }
  kept = { at: Date.now(), env };
  return env;
}
