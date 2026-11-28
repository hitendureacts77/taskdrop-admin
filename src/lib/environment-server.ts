import 'server-only';
import { parseEnvironment, type AppEnvironment } from './environment';
import { rawEnvironment } from './v2-gate';
import { createClient } from './supabase/server';

/**
 * The environment, read the way the apps read their controls: the public
 * get_app_controls function, which needs no sign-in, so the sign-in page can
 * show the ribbon too. Any failure counts as staging (see environment.ts).
 *
 * Remembered for a few seconds, because the layout asks on every page load;
 * flipping the setting to production reaches this admin within that time.
 *
 * The raw string is kept too, for the strict admin v2 gate (v2-gate.ts),
 * where a failed read or any value other than exactly "staging" means off.
 */
const KEEP_MS = 15_000;
let kept: { at: number; env: AppEnvironment; raw: string | null } | null = null;

async function read(): Promise<{ env: AppEnvironment; raw: string | null }> {
  if (kept && Date.now() - kept.at < KEEP_MS) return kept;
  let env: AppEnvironment = 'staging';
  let raw: string | null = null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_app_controls', { p_platform: 'web' });
    if (!error) {
      env = parseEnvironment(data);
      raw = rawEnvironment(data);
    }
  } catch {
    // Unreachable database: fall through to staging (ribbon) and raw null (v2 off).
  }
  kept = { at: Date.now(), env, raw };
  return kept;
}

export async function getEnvironment(): Promise<AppEnvironment> {
  return (await read()).env;
}

/** The exact `environment` string, or null when the read failed or the key is missing. */
export async function getRawEnvironment(): Promise<string | null> {
  return (await read()).raw;
}
