import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppControlRow, DeviceRow, PlatformKey } from './controls-meta';
import { createClient } from './supabase/server';

/**
 * Reads for the per-platform app controls and the devices panel (migration 092
 * in the app repo). Callers must call requireAdmin() first. `setup` is true when
 * the migration has not been applied to this database yet.
 */

const NOT_THERE = /does not exist|could not find the (function|table)|schema cache|PGRST20[24]|42883|42P01/i;

export type ControlsRead = { rows: Record<PlatformKey, AppControlRow | null>; setup: boolean; error: string | null };

export async function getAppControls(): Promise<ControlsRead> {
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const { data, error } = await supabase.from('app_controls').select('*');
  const rows: ControlsRead['rows'] = { all: null, web: null, android: null, ios: null };
  if (error) {
    const setup = NOT_THERE.test(`${error.code ?? ''} ${error.message}`);
    return { rows, setup, error: setup ? null : error.message };
  }
  for (const r of (data ?? []) as AppControlRow[]) if (r.platform in rows) rows[r.platform] = r;
  return { rows, setup: false, error: null };
}

export type DevicesRead = { rows: DeviceRow[]; setup: boolean; error: string | null };

/** The most recently seen installs, up to 5,000; plenty while TaskDrop has a few hundred testers. */
export async function getDeviceRows(): Promise<DevicesRead> {
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const { data, error } = await supabase.from('app_devices').select('platform, app_version, last_seen_at').order('last_seen_at', { ascending: false }).limit(5000);
  if (error) {
    const setup = NOT_THERE.test(`${error.code ?? ''} ${error.message}`);
    return { rows: [], setup, error: setup ? null : error.message };
  }
  return {
    rows: ((data ?? []) as { platform: string; app_version: string | null; last_seen_at: string }[]).map((d) => ({ platform: d.platform, appVersion: d.app_version, lastSeenAt: d.last_seen_at })),
    setup: false,
    error: null,
  };
}
