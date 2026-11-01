import * as Sentry from '@sentry/nextjs';
import { SENTRY_DSN, SENTRY_ENVIRONMENT } from './lib/sentry-dsn';
import { scrubEvent } from './lib/scrub';

// Browser side. Staff see other people's names, phone numbers and money here,
// so no session replay, no feedback widget, and no user identity is sent.
Sentry.init({
  dsn: SENTRY_DSN || undefined,
  environment: SENTRY_ENVIRONMENT,
  dataCollection: { userInfo: false },
  tracesSampleRate: 0.1,
  // Last net: hides keys, phone numbers and emails in anything sent (src/lib/scrub.ts).
  beforeSend: (event) => scrubEvent(event),
  beforeSendTransaction: (event) => scrubEvent(event),
  beforeBreadcrumb: (crumb) => scrubEvent(crumb),
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
