import * as Sentry from '@sentry/nextjs';
import { SENTRY_DSN, SENTRY_ENVIRONMENT } from './lib/sentry-dsn';
import { sentryServerOptions } from './lib/sentry-options';

// Edge side of the admin panel: the middleware (sign-in and CSP checks).
// On Cloudflare Workers the client of worker.ts is in charge and this init creates no second client (it only applies
// the release); scrubbing and the other options are shared through src/lib/sentry-options.ts.
Sentry.init(sentryServerOptions(SENTRY_DSN, SENTRY_ENVIRONMENT));
