/**
 * Reads a typed number for a setting. Pure, so it is unit-tested.
 * Number('') and Number(' ') are 0, which would silently save a blank box as 0
 * (clearing period 0 days releases earnings at once), so blank is refused.
 */
export function parseNumberInput(raw: string): { ok: true; n: number } | { ok: false; message: string } {
  const text = raw.trim();
  if (!text) return { ok: false, message: 'Type a number.' };
  const n = Number(text);
  if (!Number.isFinite(n)) return { ok: false, message: 'Type a number.' };
  return { ok: true, n };
}
