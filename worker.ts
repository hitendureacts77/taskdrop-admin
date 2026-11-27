// Cloudflare Worker entry of the admin console (plan task 5.12 step 6); wrangler.jsonc `main` points here.
// It wraps the handler OpenNext builds (.open-next/worker.js) with Sentry's Worker client, which reports errors and
// request spans from workerd. With this client in charge, Sentry.init in src/sentry.server.config.ts and
// src/sentry.edge.config.ts creates no second client on Workers (it only applies the release); they still run the
// Node client under `next dev` and on Vercel. src/instrumentation.ts stays: its onRequestError reports server errors.
// Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/ (Cloudflare section), opennext.js.org/cloudflare/howtos/custom-worker
import { withSentry } from '@sentry/nextjs/cloudflare';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore `.open-next/worker.js` exists only after `npm run cf:build`.
import handler from './.open-next/worker.js';
import { DEFAULT_SENTRY_DSN } from './src/lib/sentry-dsn.ts';
import { sentryServerOptions } from './src/lib/sentry-options.ts';
import { workerSentry } from './src/lib/runtime-env.ts';

export default withSentry((env: Record<string, string | undefined>) => {
  const { dsn, environment } = workerSentry(env, DEFAULT_SENTRY_DSN);
  return sentryServerOptions(dsn, environment);
}, handler);
