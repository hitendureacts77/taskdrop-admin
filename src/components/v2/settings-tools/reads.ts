import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

/**
 * Small extra reads for the v2 settings tools pages (WP8b). Callers must call
 * requireSeeing('settings') first. Never throws: a failed read is null.
 */

/** The idle sign-out the database setting asks for (admin_session_idle_minutes), to compare with the server's own number. */
export async function readIdleSetting(): Promise<number | null> {
  try {
    const db = (await createClient()) as unknown as SupabaseClient;
    const { data, error } = await db.from('settings').select('value').eq('key', 'admin_session_idle_minutes').maybeSingle();
    if (error || !data) return null;
    const n = Number((data as { value: unknown }).value);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

const REGIONS: Record<string, string> = { bom1: 'Mumbai', sin1: 'Singapore', iad1: 'Washington, D.C.', fra1: 'Frankfurt', hnd1: 'Tokyo', syd1: 'Sydney', cdg1: 'Paris', lhr1: 'London' };

/** "Mumbai (bom1)" from a hosting region code. */
export function regionWords(code: string | null): string | null {
  if (!code) return null;
  return REGIONS[code] ? `${REGIONS[code]} (${code})` : code;
}
