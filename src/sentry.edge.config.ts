import * as Sentry from '@sentry/nextjs';
import { SENTRY_DSN, SENTRY_ENVIRONMENT } from './lib/sentry-dsn';

// Edge side of the admin panel: the middleware (sign-in and CSP checks).
Sentry.init({
  dsn: SENTRY_DSN || undefined,
  environment: SENTRY_ENVIRONMENT,
  dataCollection: { userInfo: false },
  tracesSampleRate: 0.1,
});
