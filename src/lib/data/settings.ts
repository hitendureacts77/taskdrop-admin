import 'server-only';
import { createClient as createSessionClient } from '../supabase/server';

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
