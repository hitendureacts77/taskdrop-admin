import 'server-only';
import type { DeviceVersionRow } from './devices-calc';
import { asRunKind, isRunStale, isStaffRefusal, latestPerKind, parseRunDetail, safeSentryUrl, type ReconRun, type RunKind } from './ops-calc';
import { createClient } from './supabase/server';

/**
 * Reads for the Devices page, the nightly money check history and the dashboard
 * health card (migration 097 in the app repo). Callers must call requireAdmin()
 * first. Each read says plainly when its migration is missing (`setup`) or when
 * the staff role may not see it (`refused`) instead of failing the page.
 */

const NOT_THERE = /does not exist|could not find the (function|table)|schema cache|PGRST20[24]|42883|42P01/i;

export type OpsRead<T> = { data: T; setup: boolean; refused: boolean; error: string | null };

function failed<T>(empty: T, error: { message: string; code?: string | null }): OpsRead<T> {
  if (NOT_THERE.test(`${error.code ?? ''} ${error.message}`)) return { data: empty, setup: true, refused: false, error: null };
  if (isStaffRefusal(error.message, error.code)) return { data: empty, setup: false, refused: true, error: null };
  return { data: empty, setup: false, refused: false, error: error.message };
}

export async function getDevicesSummary(): Promise<OpsRead<DeviceVersionRow[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_devices_summary');
  if (error) return failed([], error);
  const rows = (data ?? []).map((r) => ({ platform: r.platform, appVersion: r.app_version || null, devices: Number(r.devices ?? 0), people: Number(r.people ?? 0), lastSeen: r.last_seen ?? null }));
  return { data: rows, setup: false, refused: false, error: null };
}

export async function getReconciliationRuns(limit = 20): Promise<OpsRead<ReconRun[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_reconciliation_runs', { p_limit: limit });
  if (error) return failed([], error);
  const runs: ReconRun[] = [];
  for (const r of data ?? []) {
    const kind = asRunKind(r.kind);
    if (!kind) continue;
    runs.push({
      id: r.id,
      ranAt: r.ran_at,
      kind,
      fromDay: r.from_day ?? null,
      toDay: r.to_day ?? null,
      checked: Number(r.checked ?? 0),
      mismatches: Number(r.mismatches ?? 0),
      differences: parseRunDetail(kind, r.detail),
    });
  }
  return { data: runs, setup: false, refused: false, error: null };
}

export type RunSummary = { ranAt: string; checked: number; mismatches: number };

export type SystemHealth = {
  now: string;
  /** Latest nightly run per kind; null when it never ran. */
  runs: Record<RunKind, RunSummary | null>;
  /** True when a run is missing or older than 36 hours: the nightly job is not set up or has stopped. */
  stale: boolean;
  /** Why the money check could not be read, or null. */
  runsNote: 'setup' | 'refused' | 'error' | null;
  ping: { ok: boolean; ms: number | null; detail: string };
  sentryUrl: string | null;
};

/** Never throws; every part has its own hard timeout. */
export async function getSystemHealth(): Promise<SystemHealth> {
  const now = new Date();
  const [runsRead, ping] = await Promise.all([
    withTimeout(getReconciliationRuns(8), 4000).catch(() => null),
    pingAppConfig(),
  ]);
  const runs: SystemHealth['runs'] = { internal: null, razorpay: null };
  let runsNote: SystemHealth['runsNote'] = null;
  if (!runsRead) runsNote = 'error';
  else if (runsRead.setup) runsNote = 'setup';
  else if (runsRead.refused) runsNote = 'refused';
  else if (runsRead.error) runsNote = 'error';
  else {
    const latest = latestPerKind(runsRead.data);
    for (const kind of ['internal', 'razorpay'] as const) {
      const run = runsRead.data.find((r) => r.kind === kind && r.ranAt === latest[kind]?.ranAt);
      runs[kind] = run ? { ranAt: run.ranAt, checked: run.checked, mismatches: run.mismatches } : null;
    }
  }
  const stale = runsNote === null && (['internal', 'razorpay'] as const).some((k) => isRunStale(runs[k]?.ranAt, now));
  return { now: now.toISOString(), runs, stale, runsNote, ping, sentryUrl: safeSentryUrl(process.env.SENTRY_PROJECT_URL) };
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/** Asks the public app-config function the way the apps do, with a 3 second limit. */
async function pingAppConfig(): Promise<SystemHealth['ping']> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return { ok: false, ms: null, detail: 'unreachable' };
  const started = Date.now();
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/functions/v1/app-config`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
      headers: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY } : undefined,
    });
    const ms = Date.now() - started;
    return res.ok ? { ok: true, ms, detail: 'OK' } : { ok: false, ms, detail: `answered with error ${res.status}` };
  } catch {
    return { ok: false, ms: null, detail: 'unreachable' };
  }
}
