/** Shapes the /api/search typeahead route sends to the top-bar box (admin v2, WP10). */

/** One line of the typeahead: where it goes, what it says, and a short note on the right. */
export type TypeaheadItem = { href: string; label: string; note: string; test: boolean };
export type TypeaheadGroup = { title: string; items: TypeaheadItem[] };
export type TypeaheadResponse = { ok: true; q: string; groups: TypeaheadGroup[] } | { ok: false; error?: string };
