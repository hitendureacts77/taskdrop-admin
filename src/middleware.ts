import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * A per-request, nonce-based Content-Security-Policy.
 *
 * Scripts run only if they carry this request's nonce ('strict-dynamic' lets
 * those scripts load their own chunks), so an injected <script> never executes.
 * Next reads the nonce from the request's CSP header and stamps it on its own
 * inline bootstrap scripts. Everything else is same-origin, except the
 * Supabase project the panel talks to.
 *
 * 'unsafe-eval' is development only (React Refresh needs it).
 */
function contentSecurityPolicy(nonce: string): string {
  const dev = process.env.NODE_ENV !== 'production';
  const supabaseWs = URL.replace(/^https:/, 'wss:');
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? ` 'unsafe-eval'` : ''}`,
    // React sets inline style attributes, so styles cannot be nonce-only. The
    // typeface is self-hosted (public/fonts), so no third-party style or font
    // origin is allowed: a stray Google Fonts link would be blocked, not loaded.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self' data:`,
    `connect-src 'self' ${URL} ${supabaseWs}`.trim(),
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ');
}

// ---------------------------------------------------------------- timeouts --
//
// An admin session can move money, so it does not live as long as an app
// session. Two limits, both checked here on every request:
//   * idle:     no page or action for ADMIN_IDLE_MINUTES (default 30)
//   * absolute: ADMIN_SESSION_HOURS (default 12) after signing in, however busy
// The absolute limit reads the sign-in time from the access token's `amr`
// claim, which Supabase signs, so it cannot be stretched. Idle time is kept in
// an httpOnly cookie bound to the session id and signed with
// ADMIN_SESSION_SECRET (falling back to the service role key), so it cannot be
// forged or carried to another session; a session that has lost the cookie
// counts as idle unless it signed in moments ago.
//
// Supabase's own "inactivity timeout" setting is project-wide and would sign
// the mobile app's users out too, which is why this lives here.

const IDLE_MS = Math.max(1, Number(process.env.ADMIN_IDLE_MINUTES) || 30) * 60_000;
const MAX_MS = Math.max(1, Number(process.env.ADMIN_SESSION_HOURS) || 12) * 3_600_000;
const ACTIVE_COOKIE = 'td_admin_active';
/** Rewrite the activity cookie at most this often, not on every request. */
const BUMP_MS = 60_000;
/** A session this young may not have its activity cookie yet. */
const GRACE_MS = 5 * 60_000;

const encoder = new TextEncoder();
let hmacKey: Promise<CryptoKey | null> | null = null;

function signingKey(): Promise<CryptoKey | null> {
  hmacKey ??= (async () => {
    const raw = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!raw) {
      console.error('middleware: ADMIN_SESSION_SECRET is not set; the idle timeout is off');
      return null;
    }
    return crypto.subtle.importKey('raw', encoder.encode(raw), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  })();
  return hmacKey;
}

async function mac(key: CryptoKey, text: string): Promise<string> {
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(text)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time string comparison. */
function same(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/** The claims of a token getUser() has already verified with Supabase Auth. */
function claims(token: string): { session_id?: string; amr?: { method: string; timestamp: number }[] } {
  try {
    const part = (token.split('.')[1] ?? '').replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), '=')));
  } catch {
    return {};
  }
}

/** When this session last did something, if the cookie is genuine and belongs to it. */
async function lastActive(cookie: string | undefined, sessionId: string, key: CryptoKey): Promise<number | null> {
  const [sid, at, sig] = (cookie ?? '').split('.');
  if (!sid || !at || !sig || sid !== sessionId) return null;
  if (!same(sig, await mac(key, `${sid}.${at}`))) return null;
  const n = Number(at);
  return Number.isFinite(n) ? n : null;
}

/** /login with a message to show. (The global URL is shadowed by the Supabase URL above.) */
function loginWith(request: NextRequest, message: string) {
  const to = request.nextUrl.clone();
  to.pathname = '/login';
  to.search = '';
  to.searchParams.set('error', message);
  return to;
}

/** Background fetches that are not a person doing something. */
function isPrefetch(request: NextRequest): boolean {
  return (
    request.headers.get('next-router-prefetch') === '1' ||
    request.headers.get('purpose') === 'prefetch' ||
    (request.headers.get('sec-purpose') ?? '').includes('prefetch')
  );
}

/**
 * Refreshes the session cookie on every request. This is the only place
 * (besides a Route Handler) allowed to write cookies in Next 15 -- Server
 * Components can only read them -- so a token that's about to expire has to
 * be renewed here or sessions would silently die mid-visit. Does NOT check
 * admin status; that's checkAdmin() in the (dashboard) layout, which runs
 * after this on every request to a protected route.
 *
 * It also issues the CSP above, on the request (so Next can find the nonce) and
 * on the response (so the browser enforces it).
 */
export async function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = contentSecurityPolicy(nonce);

  // Built from the request's headers at call time, so a cookie refresh made on
  // request.cookies below is carried into the rebuilt response.
  const proceed = () => {
    const headers = new Headers(request.headers);
    headers.set('x-nonce', nonce);
    headers.set('Content-Security-Policy', csp);
    const res = NextResponse.next({ request: { headers } });
    res.headers.set('Content-Security-Policy', csp);
    return res;
  };

  let response = proceed();

  const supabase = createServerClient(URL, ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = proceed();
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return response;

  // getUser() above verified the token, so its claims can be read directly.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const c = claims(session?.access_token ?? '');
  const sessionId = c.session_id;
  if (!sessionId) return response;

  const now = Date.now();
  const signedInAt = Math.min(...(c.amr ?? []).map((m) => m.timestamp * 1000).filter(Number.isFinite), now);

  let expired: 'idle' | 'max' | null = now - signedInAt > MAX_MS ? 'max' : null;
  const key = await signingKey();
  let seen: number | null = null;
  if (!expired && key) {
    seen = await lastActive(request.cookies.get(ACTIVE_COOKIE)?.value, sessionId, key);
    const idleSince = seen ?? (now - signedInAt < GRACE_MS ? now : null);
    if (idleSince === null || now - idleSince > IDLE_MS) expired = 'idle';
  }

  if (expired) {
    // Revokes the refresh token and clears the session cookies (via setAll).
    await supabase.auth.signOut();
    const message =
      expired === 'idle'
        ? `You were signed out after ${Math.round(IDLE_MS / 60_000)} minutes without activity. Sign in again.`
        : `Admin sessions last ${Math.round(MAX_MS / 3_600_000)} hours. Sign in again.`;
    const path = request.nextUrl.pathname;
    // The login page itself is shown, not redirected to, so a sign-out that
    // could not reach Supabase can never loop.
    const out = path.startsWith('/api/')
      ? NextResponse.json({ ok: false, message }, { status: 401 })
      : path === '/login'
        ? proceed()
        : NextResponse.redirect(loginWith(request, message));
    for (const cookie of response.cookies.getAll()) out.cookies.set(cookie);
    // And the session cookies go even if signOut() could not clear them.
    for (const { name } of request.cookies.getAll()) {
      if (name.startsWith('sb-') && !out.cookies.get(name)) out.cookies.delete(name);
    }
    out.cookies.delete(ACTIVE_COOKIE);
    out.headers.set('Content-Security-Policy', csp);
    return out;
  }

  if (key && !isPrefetch(request) && (seen === null || now - seen > BUMP_MS)) {
    const value = `${sessionId}.${now}`;
    response.cookies.set(ACTIVE_COOKIE, `${value}.${await mac(key, value)}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: Math.ceil(MAX_MS / 1000),
    });
  }

  return response;
}

export const config = {
  matcher: [
    // Skip static assets and Next internals -- nothing there needs a
    // refreshed session, and running this on every asset request is wasted
    // work.
    '/((?!_next/static|_next/image|fonts/|favicon.ico).*)',
  ],
};
