/**
 * "Hide test data" (admin v2). Pure rules for what counts as test data on
 * staging, shared by the server data layer (src/lib/test-data-server.ts).
 *
 *   - Fake people from the fake city seed: ids fa4e0001-0000-4000-8000-0000000000xx
 *     (120 people, staging only), and phones that start 98880.
 *   - End-to-end test jobs: titles that start "[e2e]" (e.g. "[e2e] dispute").
 *
 * Production has none of these, and the toggle only exists when v2 is on.
 */

export const HIDE_TEST_COOKIE = 'td_hide_test';

/** Lowest and highest id the fake city seed can use (uuid order). */
export const TEST_ID_LOW = 'fa4e0001-0000-0000-0000-000000000000';
export const TEST_ID_HIGH = 'fa4e0001-ffff-ffff-ffff-ffffffffffff';

export function isTestUserId(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.toLowerCase().startsWith('fa4e0001-');
}

export function isTestTitle(title: string | null | undefined): boolean {
  return typeof title === 'string' && /^\s*\[e2e\]/i.test(title);
}

/** Digits only, last 10: 98880xxxxx is the fake seed's phone range. */
export function isTestPhone(phone: string | null | undefined): boolean {
  if (typeof phone !== 'string') return false;
  const d = phone.replace(/\D/g, '').slice(-10);
  return d.length === 10 && d.startsWith('98880');
}

/** A row is test data when any of its known markers says so. */
export function isTestRow(row: { id?: string | null; userId?: string | null; posterId?: string | null; title?: string | null; phone?: string | null }): boolean {
  return isTestUserId(row.userId) || isTestUserId(row.posterId) || isTestTitle(row.title) || isTestPhone(row.phone) || isTestUserId(row.id);
}

/** The cookie value means "hide" only when it is exactly "1". */
export function hideTestFromCookie(value: string | undefined | null): boolean {
  return value === '1';
}

/** PostgREST `or` filter that keeps rows whose uuid column is NOT a fake seed id (nulls kept). */
export function notTestIdFilter(column: string): string {
  if (!/^[a-z_][a-z0-9_]*$/.test(column)) throw new Error('bad column');
  return `${column}.is.null,${column}.lt.${TEST_ID_LOW},${column}.gt.${TEST_ID_HIGH}`;
}
