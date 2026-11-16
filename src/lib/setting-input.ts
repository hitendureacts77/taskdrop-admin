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

const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/;

/** A stored setting value in plain words: no raw JSON, no UTC timestamps, short enough to wrap on a phone (A1-2). */
export function readableSetting(v: unknown, formatTime: (iso: string) => string): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'On' : 'Off';
  if (typeof v === 'string') return ISO_TIME.test(v) ? formatTime(v) : v;
  if (Array.isArray(v)) return v.map((x) => readableSetting(x, formatTime)).join(', ');
  if (typeof v === 'object') return Object.entries(v as Record<string, unknown>).map(([k, x]) => `${k.replace(/_/g, ' ')}: ${readableSetting(x, formatTime)}`).join(' · ');
  return String(v);
}
