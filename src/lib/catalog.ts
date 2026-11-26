import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { mapCatalogRow, type CatalogKind, type CatalogRow } from './catalog-calc';
import type { Read } from './growth';
import { createClient } from './supabase/server';

/** Skills & categories (migration 226 in the app repo): read through the staff-only admin_catalog_list function. */
const NOT_THERE = /does not exist|could not find the function|schema cache|PGRST202|42883/i;

export async function getCatalog(kind: CatalogKind): Promise<Read<CatalogRow[]>> {
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const { data, error } = await supabase.rpc('admin_catalog_list', { p_kind: kind });
  if (error) {
    const setup = NOT_THERE.test(`${error.code ?? ''} ${error.message}`);
    return { data: [], setup, error: setup ? null : error.message };
  }
  const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
  return { data: rows.map(mapCatalogRow), setup: false, error: null };
}
