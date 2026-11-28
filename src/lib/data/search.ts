/**
 * Search-box helpers for the list pages. Pure, so they are unit-tested.
 * `%` and `_` are LIKE wildcards: typed into the box they must match
 * themselves, not every row.
 */

/** Strip characters that would break a PostgREST filter string (`%` and `_` stay; see likeTerm). */
export function cleanSearch(q: string | undefined): string {
  return (q ?? '').replace(/[,()*\:"']/g, ' ').trim().slice(0, 80);
}

/** The cleaned search with LIKE wildcards escaped, ready to sit between % signs in ilike. Empty when there is nothing to search. */
export function likeTerm(q: string | undefined): string {
  return cleanSearch(q).replace(/[\\%_]/g, (c) => String.fromCharCode(92) + c);
}

/** The same literal, case-insensitive match the database does for `title ilike %term%`. */
export function titleMatches(title: string, q: string | undefined): boolean {
  const s = cleanSearch(q);
  return !s || title.toLowerCase().includes(s.toLowerCase());
}

// ------------------------------------------------- admin v2 global search --

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** What one search box entry can mean: words (names, titles), an exact id, or a rupee amount. */
export type SearchPlan = {
  /** Escaped for ilike; a leading @ is dropped so "@asha" finds username asha. Empty when there are no words. */
  term: string;
  /** A full id pasted into the box (lower case), else null. */
  id: string | null;
  /** "1470", "₹1,470" or "1470.50" as paise, else null. */
  amountMinor: number | null;
};

export function searchPlan(raw: string | null | undefined): SearchPlan {
  const v = (raw ?? '').trim().slice(0, 80);
  const id = UUID_RE.test(v) ? v.toLowerCase() : null;
  const money = v.replace(/[₹,\s]/g, '').replace(/^rs\.?/i, '');
  let amountMinor: number | null = null;
  if (/^\d{1,9}(\.\d{1,2})?$/.test(money)) {
    const n = Math.round(Number(money) * 100);
    if (Number.isSafeInteger(n) && n > 0) amountMinor = n;
  }
  return { term: id ? '' : likeTerm(v.replace(/^@+/, '')), id, amountMinor };
}

/** The shortest query worth sending from the top-bar box (one letter matches nearly everyone). */
export const TYPEAHEAD_MIN = 2;

export function typeaheadReady(q: string | null | undefined): boolean {
  return (q ?? '').trim().length >= TYPEAHEAD_MIN;
}
