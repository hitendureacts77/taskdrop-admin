import { scrubEvent } from './scrub.ts';
import { scrubSpan } from './sentry-span.ts';

/**
 * The Sentry options every server-side client of the admin shares: Node (src/sentry.server.config.ts), edge
 * (src/sentry.edge.config.ts) and the Cloudflare Worker (worker.ts). One place, so the scrubbing can never differ.
 */
export function sentryServerOptions(dsn: string, environment: string) {
  return {
    dsn: dsn || undefined,
    environment,
    dataCollection: { userInfo: false },
    tracesSampleRate: 0.1,
    // Last net: hides keys, phone numbers and emails in anything sent (src/lib/scrub.ts).
    beforeSend: <T>(event: T) => scrubEvent(event),
    // Sentry 11 streams spans by default and then skips the transaction hook; this one runs (B127).
    beforeSendSpan: <T extends { name?: string; attributes?: unknown }>(span: T) => scrubSpan(span),
    beforeBreadcrumb: <T>(crumb: T) => scrubEvent(crumb),
  };
}
