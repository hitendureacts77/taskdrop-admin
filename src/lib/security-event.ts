import 'server-only';
import * as Sentry from '@sentry/nextjs';

/**
 * A security-relevant event from the panel's server side, tagged `security_event` so the Sentry
 * alert for the app (plan task 2.10) covers the admin too. Never pass an email, phone number,
 * token or address in `extra`: ids and bucket names only (scrub.ts is the last net, not the first).
 */
export function securityEvent(name: string, extra: Record<string, string | number | boolean> = {}): void {
  console.warn(`security_event ${name}`, extra);
  try {
    Sentry.captureMessage(`security_event: ${name}`, { level: 'warning', tags: { security_event: name }, extra });
  } catch {
    // Reporting must never break the request it reports on.
  }
}
