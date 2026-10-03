/**
 * Money is stored in paise (bigint in Postgres, number here). Everything shown
 * to a person goes through these helpers so ₹ and the Indian digit grouping
 * (1,23,456.78) are the same on every screen.
 */

export function rupeesParts(minor: number): { rupees: string; paise: string; negative: boolean } {
  const negative = minor < 0;
  const abs = Math.abs(Math.round(minor));
  const whole = Math.floor(abs / 100);
  const paise = abs % 100;
  return {
    rupees: '₹' + whole.toLocaleString('en-IN'),
    paise: '.' + String(paise).padStart(2, '0'),
    negative,
  };
}

/** "₹1,23,456.78" (or "−₹…" for negatives). */
export function inr(minor: number): string {
  const p = rupeesParts(minor);
  return (p.negative ? '−' : '') + p.rupees + p.paise;
}

/** "₹1,23,456" -- for chart axes, where paise are noise. */
export function inrWhole(minor: number): string {
  const p = rupeesParts(minor);
  return (p.negative ? '−' : '') + p.rupees;
}

/** "₹850", "₹12.5K", "₹1.25 L", "₹1.2 Cr" -- short enough for a chart axis. */
export function inrShort(minor: number): string {
  const sign = minor < 0 ? '−' : '';
  const r = Math.abs(minor) / 100;
  const trim = (n: number, digits: number) => String(Number(n.toFixed(digits)));
  if (r >= 1e7) return `${sign}₹${trim(r / 1e7, 2)} Cr`;
  if (r >= 1e5) return `${sign}₹${trim(r / 1e5, 2)} L`;
  if (r >= 1e3) return `${sign}₹${trim(r / 1e3, 1)}K`;
  return `${sign}₹${trim(r, r < 10 && r % 1 ? 2 : 0)}`;
}

/** 0.1 -> "10%", 0.025 -> "2.5%". Settings store percentages as fractions. */
export function pct(fraction: number): string {
  return `${Number((fraction * 100).toFixed(2))}%`;
}

/** "+12.4%" style change between two amounts, or null when there is nothing to compare. */
export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

export function timeAgo(iso: string, now: Date = new Date()): string {
  const mins = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

const IST = 'Asia/Kolkata';

export function istTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { timeZone: IST, hour: '2-digit', minute: '2-digit' });
}

export function istDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { timeZone: IST, day: 'numeric', month: 'short' });
}

export function istDateTime(iso: string): string {
  return `${istDate(iso)}, ${istTime(iso)}`;
}

/** "1 Feb 2026" for a "2026-02-01" Indian day key. */
export function prettyDayKey(key: string): string {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * "+91 98450 12345". Supabase Auth stores phone numbers as bare digits
 * ("919845012345"); anything that isn't an Indian mobile is shown as stored.
 */
export function phone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const local = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits.length === 10 ? digits : null;
  if (!local) return raw.startsWith('+') ? raw : `+${digits}`;
  return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
}
