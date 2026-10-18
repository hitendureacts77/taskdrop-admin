import 'server-only';
import { createClient as createSessionClient } from '../supabase/server';

// ----------------------------------------------------------------- people --

export async function namesFor(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const out = new Map<string, string>();
  if (!unique.length) return out;
  const supabase = await createSessionClient();
  for (let i = 0; i < unique.length; i += 200) {
    // profiles are public by design (profiles_select_all), so no service key needed.
    const { data } = await supabase.from('profiles').select('id, display_name').in('id', unique.slice(i, i + 200));
    for (const p of (data ?? []) as { id: string; display_name: string }[]) out.set(p.id, p.display_name);
  }
  return out;
}
