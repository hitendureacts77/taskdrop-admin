import 'server-only';
import { createClient as createSessionClient } from '../supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { HISTORY_EVENTS, HISTORY_SETTING_KEYS, toHistoryRow, type HistoryRow } from '../controls-history';

// --------------------------------------------------------------- settings --

export type MoneySettings = { commissionPct: number; posterFeePct: number; clearingDays: number; reviewDays: number };

/** The live percentages and waiting periods, so every explanation on screen matches the database. */
export async function getMoneySettings(): Promise<MoneySettings> {
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['worker_commission_pct', 'poster_service_fee_pct', 'clearing_period_days', 'review_window_days']);
  const map = new Map(((data ?? []) as { key: string; value: unknown }[]).map((r) => [r.key, Number(r.value)]));
  const val = (k: string, fallback: number) => {
    const v = map.get(k);
    return v === undefined || Number.isNaN(v) ? fallback : v;
  };
  return {
    commissionPct: val('worker_commission_pct', 0.2), // the database's own fallback
    posterFeePct: val('poster_service_fee_pct', 0.03),
    clearingDays: val('clearing_period_days', 7),
    reviewDays: val('review_window_days', 3),
  };
}

export type SettingRow = { key: string; value: unknown; updated_at: string };

export async function getAllSettings(): Promise<SettingRow[]> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.from('settings').select('key, value, updated_at').order('key');
  if (error) throw new Error(`Could not read settings: ${error.message}`);
  return (data ?? []) as SettingRow[];
}

// ------------------------------------------------- admin v2 (WP8a) reads --


const NOT_THERE = /does not exist|could not find the (function|table)|schema cache|PGRST20[24]|42883|42P01/i;
const loose = async () => (await createSessionClient()) as unknown as SupabaseClient;

/** One settings value with its last change, or null when the row is missing. */
export type SettingValue = { value: unknown; updatedAt: string | null } | null;

/** A few settings by key, for the v2 settings pages. Missing keys are null. */
export async function getSettingValues(keys: readonly string[]): Promise<Record<string, SettingValue>> {
  const supabase = await loose();
  const { data } = await supabase.from('settings').select('key, value, updated_at').in('key', keys as string[]);
  const rows = (data ?? []) as { key: string; value: unknown; updated_at: string | null }[];
  return Object.fromEntries(keys.map((k) => {
    const r = rows.find((x) => x.key === k);
    return [k, r ? { value: r.value, updatedAt: r.updated_at } : null];
  }));
}

export type LaunchAreaRow = { id: string; name: string; lat: number; lng: number; radiusKm: number; active: boolean; updatedAt: string };
export type LaunchAreasRead = { areas: LaunchAreaRow[]; on: boolean; message: string; setup: boolean; error: string | null };

/** Launch areas (migration 260 in the app repo). `setup` is true when that migration is not on this database. */
export async function getLaunchAreas(): Promise<LaunchAreasRead> {
  const supabase = await loose();
  const [{ data, error }, s] = await Promise.all([
    supabase.from('launch_areas').select('id, name, lat, lng, radius_km, active, updated_at').order('name'),
    getSettingValues(['launch_areas_on', 'launch_areas_message']),
  ]);
  if (error) {
    const setup = NOT_THERE.test(`${error.code ?? ''} ${error.message}`);
    return { areas: [], on: false, message: '', setup, error: setup ? null : error.message };
  }
  const areas = ((data ?? []) as { id: string; name: string; lat: number; lng: number; radius_km: number | string; active: boolean; updated_at: string }[]).map((a) => ({
    id: a.id,
    name: a.name,
    lat: Number(a.lat),
    lng: Number(a.lng),
    radiusKm: Number(a.radius_km),
    active: a.active,
    updatedAt: a.updated_at,
  }));
  const msg = s.launch_areas_message?.value;
  return { areas, on: s.launch_areas_on?.value === true, message: typeof msg === 'string' ? msg : '', setup: false, error: null };
}

/**
 * Switch history: app controls, money pause, launch areas, walkthrough link and the switch settings,
 * newest first, from admin_audit_log (admins may read it; the rows carry who, what and why).
 */
export async function getSwitchHistory(limit = 30): Promise<{ rows: HistoryRow[]; error: string | null }> {
  const supabase = await loose();
  const events = HISTORY_EVENTS.join(',');
  const keys = HISTORY_SETTING_KEYS.join(',');
  const { data, error } = await supabase
    .from('admin_audit_log')
    .select('at, actor, action, target_table, target_id, before, after, detail')
    .or(`action.in.(${events}),and(target_table.eq.settings,target_id.in.(${keys}))`)
    .order('at', { ascending: false })
    .limit(limit);
  if (error) return { rows: [], error: error.message };
  const raw = (data ?? []) as { at: string; actor: string | null; action: string; target_table: string | null; target_id: string | null; before: unknown; after: unknown; detail: string | null }[];
  const ids = [...new Set(raw.map((r) => r.actor).filter((x): x is string => Boolean(x)))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: profs } = await supabase.from('profiles').select('id, display_name').in('id', ids);
    for (const p of (profs ?? []) as { id: string; display_name: string | null }[]) names.set(p.id, p.display_name || 'Staff member');
  }
  return {
    rows: raw.map((r) =>
      toHistoryRow({
        at: r.at,
        actorName: r.actor ? (names.get(r.actor) ?? 'Staff member') : 'The system',
        action: r.action,
        targetTable: r.target_table,
        targetId: r.target_id,
        before: r.before,
        after: r.after,
        detail: r.detail,
      }),
    ),
    error: null,
  };
}
