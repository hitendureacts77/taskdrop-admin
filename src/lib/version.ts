/**
 * App version comparison. Pure, no database access, unit-tested.
 * Versions look like "1.2.3", "v1.10", "1.2.3+45" or "1.2.3-beta"; only the dotted numbers count.
 */

function parts(v: string): number[] | null {
  const core = v.trim().replace(/^v/i, '').split(/[+-]/)[0] ?? '';
  if (!/^\d+(\.\d+)*$/.test(core)) return null;
  return core.split('.').map((n) => Number.parseInt(n, 10));
}

/** True when `version` is older than `minimum`, compared number by number ("1.2.9" is below "1.10.0"). Unknown or unreadable versions are never "below". */
export function isVersionBelow(version: string | null | undefined, minimum: string | null | undefined): boolean {
  if (!version || !minimum) return false;
  const a = parts(version);
  const b = parts(minimum);
  if (!a || !b) return false;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x < y;
  }
  return false;
}

/** The highest readable version in the list, or null. */
export function highestVersion(versions: (string | null | undefined)[]): string | null {
  let best: string | null = null;
  for (const v of versions) {
    if (!v || !parts(v)) continue;
    if (best === null || isVersionBelow(best, v)) best = v;
  }
  return best;
}
