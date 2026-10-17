/**
 * What the per-platform app controls are called, who may change them, and the
 * pure helpers around them (migration 092 in the app repo). No database access,
 * so it is unit-tested.
 */

export const PLATFORMS = [
  { key: 'all', label: 'Everywhere', short: 'All' },
  { key: 'web', label: 'Web', short: 'Web' },
  { key: 'android', label: 'Android', short: 'Android' },
  { key: 'ios', label: 'iPhone / iPad', short: 'iOS' },
] as const;
export type PlatformKey = (typeof PLATFORMS)[number]['key'];

export function asPlatform(v: unknown): PlatformKey | null {
  return PLATFORMS.find((p) => p.key === v)?.key ?? null;
}

export type FeatureSwitch = { key: string; label: string; help: string; money?: boolean };

/** Yes/no features. `on` means people can use it. Maintenance is separate because on is the bad state. */
export const FEATURE_SWITCHES: FeatureSwitch[] = [
  { key: 'signups_open', label: 'New sign-ups', help: 'Off: nobody new can create an account.' },
  { key: 'signin_phone', label: 'Sign in with phone', help: 'Off: the phone-code option is hidden and refused.' },
  { key: 'signin_google', label: 'Sign in with Google', help: 'Off: the Google option is hidden and refused.' },
  { key: 'signin_apple', label: 'Sign in with Apple', help: 'Off: the Apple option is hidden and refused.' },
  { key: 'signin_password', label: 'Sign in with username and password', help: 'Off: the password option is hidden and refused.' },
  { key: 'posting', label: 'Posting jobs', help: 'Off: nobody can post a new job.' },
  { key: 'bidding', label: 'Sending offers', help: 'Off: nobody can send a new offer on a job.' },
  { key: 'topups', label: 'Wallet top-ups', help: 'Off: nobody can add money to their wallet.', money: true },
  { key: 'withdrawals', label: 'Withdrawals', help: 'Off: nobody can ask to withdraw earnings.', money: true },
  { key: 'promotions', label: 'Promoting jobs', help: 'Off: nobody can promote a job.' },
  { key: 'chat_photos', label: 'Photos in chat', help: 'Off: people can send text only.' },
];

export const MONEY_KEYS = new Set(FEATURE_SWITCHES.filter((s) => s.money).map((s) => s.key));

export const TEXT_KEYS = ['maintenance_message', 'min_version', 'update_url', 'banner_text', 'banner_level', 'banner_link', 'banner_ends_at'] as const;
export type TextKey = (typeof TEXT_KEYS)[number];

/** Which staff area is needed for these changes: money only when every key is a money switch. */
export function areaFor(keys: string[]): 'money' | 'admin' {
  return keys.length > 0 && keys.every((k) => MONEY_KEYS.has(k)) ? 'money' : 'admin';
}

export function needsMfa(keys: string[]): boolean {
  return keys.some((k) => MONEY_KEYS.has(k));
}

export type AppControlRow = Record<string, unknown> & { platform: PlatformKey };

/** True when a is an older app version than b ("1.2.3" < "1.10.0"). Missing parts count as 0. */
export function versionLt(a: string, b: string): boolean {
  const pa = a.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y;
  }
  return false;
}

export type DeviceRow = { platform: string; appVersion: string | null; lastSeenAt: string };

export type DeviceSummary = {
  total: number;
  activeWeek: number;
  byPlatform: { platform: string; devices: number; activeWeek: number; outdated: number }[];
  versions: { platform: string; version: string; devices: number; outdated: boolean }[];
};

/** Devices by platform and app version; `minVersion[platform]` marks the ones that would be told to update. */
export function summarizeDevices(rows: DeviceRow[], now: Date, minVersion: Partial<Record<string, string | null>>): DeviceSummary {
  const weekAgo = now.getTime() - 7 * 86400000;
  const plat = new Map<string, { devices: number; activeWeek: number; outdated: number }>();
  const ver = new Map<string, { platform: string; version: string; devices: number; outdated: boolean }>();
  let activeWeek = 0;
  for (const r of rows) {
    const min = minVersion[r.platform] ?? null;
    const outdated = Boolean(min && r.appVersion && versionLt(r.appVersion, min));
    const active = new Date(r.lastSeenAt).getTime() >= weekAgo;
    if (active) activeWeek++;
    const p = plat.get(r.platform) ?? { devices: 0, activeWeek: 0, outdated: 0 };
    p.devices++;
    if (active) p.activeWeek++;
    if (outdated) p.outdated++;
    plat.set(r.platform, p);
    const version = r.appVersion ?? 'unknown';
    const k = `${r.platform}|${version}`;
    const v = ver.get(k) ?? { platform: r.platform, version, devices: 0, outdated };
    v.devices++;
    ver.set(k, v);
  }
  return {
    total: rows.length,
    activeWeek,
    byPlatform: [...plat.entries()].map(([platform, v]) => ({ platform, ...v })).sort((a, b) => b.devices - a.devices),
    versions: [...ver.values()].sort((a, b) => a.platform.localeCompare(b.platform) || (versionLt(a.version, b.version) ? 1 : -1)),
  };
}
