import 'server-only';
import * as Sentry from '@sentry/nextjs';
import { safeExtra } from './security-payload';

/**
 * A security-relevant event from the panel's server side, tagged `security_event` so the Sentry
 * alert for the app (plan task 2.10) covers the admin too. Only role, action or area, a reason code
 * and short ids get through (security-payload.ts drops everything else); scrub.ts is the last net.
 */
export function securityEvent(name: string, extra: Record<string, string | number | boolean> = {}): void {
  const safe = safeExtra(extra);
  console.warn(`security_event ${name}`, safe);
  try {
    Sentry.captureMessage(`security_event: ${name}`, { level: 'warning', tags: { security_event: name }, extra: safe });
  } catch {
    // Reporting must never break the request it reports on.
  }
}
