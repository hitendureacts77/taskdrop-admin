import type { CookieOptions } from '@supabase/ssr';

/**
 * How the admin's Supabase login cookies (`sb-...-auth-token`) are written (finding H37).
 *
 * @supabase/ssr's defaults are made for apps whose browser code reads the session: not HttpOnly,
 * no Secure flag and a 400-day lifetime, and it forces that lifetime on every write whatever
 * `cookieOptions` says. The panel never reads the session in the browser (sign-in, refresh,
 * sign-out and the authenticator all run on the server; the live panel gets a short-lived
 * access token from /api/live/token), so every write is rewritten here:
 *   - HttpOnly: no script in the page can read the refresh token.
 *   - Secure in production: never sent over plain http.
 *   - SameSite=Lax, path /.
 *   - At most 12 hours (or ADMIN_SESSION_HOURS if that is shorter). The middleware's own
 *     12-hour limit still decides; this makes sure a copied cookie dies by itself too.
 * A removal (max-age 0) stays a removal.
 */

export const ADMIN_COOKIE_MAX_HOURS = 12;

/** The cookie lifetime in seconds: ADMIN_SESSION_HOURS when it is shorter than 12 hours, else 12 hours. */
export function adminCookieMaxAgeSeconds(sessionHours?: string | number | null): number {
  const n = Number(sessionHours);
  const hours = Number.isFinite(n) && n > 0 ? Math.min(n, ADMIN_COOKIE_MAX_HOURS) : ADMIN_COOKIE_MAX_HOURS;
  return Math.ceil(hours * 3600);
}

/** The base options handed to createServerClient (`cookieOptions`). */
export function adminAuthCookieBase(production: boolean): CookieOptions {
  return { path: '/', sameSite: 'lax', httpOnly: true, secure: production };
}

/** The options one cookie write actually uses. */
export function adminAuthCookieOptions(
  options: CookieOptions | undefined,
  production: boolean,
  sessionHours?: string | number | null,
): CookieOptions {
  const removal = options?.maxAge === 0 || (options?.expires instanceof Date && options.expires.getTime() <= Date.now());
  const { expires: _expires, maxAge: _maxAge, ...rest } = options ?? {};
  return {
    ...rest,
    ...adminAuthCookieBase(production),
    maxAge: removal ? 0 : adminCookieMaxAgeSeconds(sessionHours),
  };
}

/** For the two places that write cookies: middleware and the server client. */
export function adminCookieWrite(options: CookieOptions | undefined): CookieOptions {
  return adminAuthCookieOptions(options, process.env.NODE_ENV === 'production', process.env.ADMIN_SESSION_HOURS);
}
