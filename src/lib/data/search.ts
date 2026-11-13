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
  return cleanSearch(q).replace(/[%_]/g, (c) => String.fromCharCode(92) + c);
}

/** The same literal, case-insensitive match the database does for `title ilike %term%`. */
export function titleMatches(title: string, q: string | undefined): boolean {
  const s = cleanSearch(q);
  return !s || title.toLowerCase().includes(s.toLowerCase());
}
