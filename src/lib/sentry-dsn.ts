/**
 * Where this panel's errors go: the `taskdrop-admin` project in Sentry.
 *
 * A DSN only allows sending events, so it is safe to ship to the browser; it
 * is also what the Content-Security-Policy (src/middleware.ts) opens up. Set
 * NEXT_PUBLIC_SENTRY_DSN to override it (a different project, or empty to turn
 * reporting off). Only production builds report; `next dev` stays quiet.
 */
const DEFAULT_DSN = 'https://b97f0ce8b936b311ccdc0ad24a093287@o4512219654389760.ingest.us.sentry.io/4512276693188608';

export const SENTRY_DSN: string =
  process.env.NODE_ENV === 'production' ? (process.env.NEXT_PUBLIC_SENTRY_DSN ?? DEFAULT_DSN) : '';

export const SENTRY_ENVIRONMENT = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || 'production';

/** The host events are sent to (for the Content-Security-Policy), or null when reporting is off. */
export function sentryIngestOrigin(): string | null {
  const m = /^https:\/\/[^@]+@([^/]+)\//.exec(SENTRY_DSN);
  return m ? `https://${m[1]}` : null;
}
