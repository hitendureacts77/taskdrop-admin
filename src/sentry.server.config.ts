import * as Sentry from '@sentry/nextjs';
import { SENTRY_DSN, SENTRY_ENVIRONMENT } from './lib/sentry-dsn';

// Server side of the admin panel: pages and route handlers.
Sentry.init({
  dsn: SENTRY_DSN || undefined,
  environment: SENTRY_ENVIRONMENT,
  dataCollection: { userInfo: false },
  tracesSampleRate: 0.1,
});
