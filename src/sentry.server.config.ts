import * as Sentry from '@sentry/nextjs';
import { SENTRY_DSN, SENTRY_ENVIRONMENT } from './lib/sentry-dsn';
import { scrubEvent } from './lib/scrub';
import { scrubSpan } from './lib/sentry-span';

// Server side of the admin panel: pages and route handlers.
Sentry.init({
  dsn: SENTRY_DSN || undefined,
  environment: SENTRY_ENVIRONMENT,
  dataCollection: { userInfo: false },
  tracesSampleRate: 0.1,
  // Last net: hides keys, phone numbers and emails in anything sent (src/lib/scrub.ts).
  beforeSend: (event) => scrubEvent(event),
  // Sentry 11 streams spans by default and then skips the transaction hook; this one runs (B127).
  beforeSendSpan: (span) => scrubSpan(span),
  beforeBreadcrumb: (crumb) => scrubEvent(crumb),
});
