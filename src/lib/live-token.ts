/**
 * The live panel's Realtime token (finding H37).
 *
 * The login cookies are HttpOnly, so the browser cannot read the session to join the private
 * 'admin:live' channel. Instead /api/live/token hands the signed-in admin their current access
 * token (never the refresh token), which LiveProvider keeps in memory only and asks for again a
 * minute before it runs out. The middleware has already refreshed the session by then, so the
 * route always returns the newest token. No browser storage, no cookie the page can read.
 *
 * Pure so it can be tested without Next or Supabase.
 */

export type LiveToken = { token: string; expiresAt: number };

/** Ask again this long before the token runs out (the server refreshes sessions 90 s ahead). */
export const TOKEN_MARGIN_MS = 60_000;

/** True when a held token can still be used for a while. */
export function tokenIsFresh(t: LiveToken | null, nowMs: number): t is LiveToken {
  return !!t && !!t.token && t.expiresAt * 1000 - nowMs > TOKEN_MARGIN_MS;
}

type Check = { status: 'ok'; user: { id: string } } | { status: 'unauthenticated' } | { status: 'forbidden' };
type SessionLike = { access_token?: string | null; expires_at?: number | null } | null;

export type RouteResult = { status: number; body: Record<string, unknown> };

/**
 * The route's answer. `rateOk` and `session` are only consulted for a signed-in admin.
 */
export async function liveTokenResponse(
  check: Check,
  rateOk: (userId: string) => Promise<boolean>,
  session: () => Promise<SessionLike>,
): Promise<RouteResult> {
  if (check.status !== 'ok') return { status: check.status === 'unauthenticated' ? 401 : 403, body: { ok: false } };
  if (!(await rateOk(check.user.id))) return { status: 429, body: { ok: false } };
  const s = await session();
  const token = s?.access_token ?? '';
  const expiresAt = Number(s?.expires_at);
  if (!token || !Number.isFinite(expiresAt)) return { status: 401, body: { ok: false } };
  return { status: 200, body: { ok: true, token, expiresAt } };
}

/** Reads the route's JSON in the browser; null for anything that is not a usable token. */
export function parseLiveToken(json: unknown): LiveToken | null {
  const o = json as { ok?: unknown; token?: unknown; expiresAt?: unknown } | null;
  if (!o || o.ok !== true || typeof o.token !== 'string' || !o.token || typeof o.expiresAt !== 'number') return null;
  return { token: o.token, expiresAt: o.expiresAt };
}
