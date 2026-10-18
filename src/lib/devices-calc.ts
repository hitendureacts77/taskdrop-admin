import { highestVersion, isVersionBelow } from './version.ts';

/** One row of admin_devices_summary(): installs for one platform and app version. */
export type DeviceVersionRow = { platform: string; appVersion: string | null; devices: number; people: number; lastSeen: string | null };

export type PlatformTotal = {
  platform: string;
  devices: number;
  /** Counted per app version, so someone with two versions is counted twice. */
  people: number;
  lastSeen: string | null;
  latest: string | null;
  onLatest: number;
  /** Share (0 to 1) of devices that report a version and run the latest one; null when no device reports a version. */
  shareOnLatest: number | null;
  minVersion: string | null;
  outdated: number;
};

export type VersionLine = DeviceVersionRow & { outdated: boolean; isLatest: boolean };

const later = (a: string | null, b: string | null) => (!a ? b : !b ? a : new Date(a) >= new Date(b) ? a : b);

/** The highest minimum version that applies to a platform: the Everywhere row or the platform row, whichever is higher. */
export function minVersionFor(all: string | null | undefined, own: string | null | undefined): string | null {
  return highestVersion([all, own]);
}

export function summarizeDeviceVersions(rows: DeviceVersionRow[], minByPlatform: Record<string, string | null | undefined>): { platforms: PlatformTotal[]; versions: VersionLine[]; devices: number } {
  const by = new Map<string, DeviceVersionRow[]>();
  for (const r of rows) by.set(r.platform, [...(by.get(r.platform) ?? []), r]);
  const platforms: PlatformTotal[] = [];
  const versions: VersionLine[] = [];
  for (const [platform, list] of by) {
    const latest = highestVersion(list.map((r) => r.appVersion));
    const min = minByPlatform[platform] ?? null;
    let devices = 0;
    let people = 0;
    let lastSeen: string | null = null;
    let onLatest = 0;
    let known = 0;
    let outdated = 0;
    for (const r of list) {
      devices += r.devices;
      people += r.people;
      lastSeen = later(lastSeen, r.lastSeen);
      const isLatest = Boolean(latest && r.appVersion === latest);
      const isOld = isVersionBelow(r.appVersion, min);
      if (r.appVersion) known += r.devices;
      if (isLatest) onLatest += r.devices;
      if (isOld) outdated += r.devices;
      versions.push({ ...r, outdated: isOld, isLatest });
    }
    platforms.push({ platform, devices, people, lastSeen, latest, onLatest, shareOnLatest: known > 0 && latest ? onLatest / known : null, minVersion: min, outdated });
  }
  platforms.sort((a, b) => b.devices - a.devices);
  versions.sort((a, b) => a.platform.localeCompare(b.platform) || (isVersionBelow(a.appVersion, b.appVersion) ? 1 : isVersionBelow(b.appVersion, a.appVersion) ? -1 : 0));
  return { platforms, versions, devices: platforms.reduce((n, p) => n + p.devices, 0) };
}
