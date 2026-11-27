# Admin on Cloudflare Workers (plan task 5.12 step 6)

Code is ready; nothing deploys until the owner's Cloudflare token exists and Workers Paid is on (bundle is 3.6 MiB gzip, over the free 3 MiB limit).
Workflows skip green with a notice until then. OpenNext builds on Linux only, so builds run in GitHub Actions, never on the Windows PC.

Workers: `taskdrop-admin-staging` (top of wrangler.jsonc) and `taskdrop-admin-production` (`--env production`), placement aws:ap-south-1.
Flow: push to redesigned-2.0 -> `admin-deploy.yml` (staging). Production: Actions -> "Release admin to production" (guard, deploy, check, tag).

## What the owner fills in (GitHub, repo taskdrop-admin)
Repository secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
Repository variable: `ADMIN_PRODUCTION_URL` (production admin address, no trailing slash; used by the release check).
Environments `staging` and `production` (production: owner as required reviewer). Secrets in each, with that stage's values:
- Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (build time; the build refuses a staging/production mix-up), `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SESSION_SECRET`, `API_GATEWAY_SECRET`.
- Optional: `ADMIN_EMAIL`, `ADMIN_PHONE`, `ADMIN_IDLE_MINUTES`, `ADMIN_SESSION_HOURS`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT`, `IMAGEKIT_DASHBOARD_URL`, `INNGEST_DASHBOARD_URL`, `SENTRY_PROJECT_URL`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_ENVIRONMENT`, `SENTRY_AUTH_TOKEN` (source maps).
Server secret names live in `scripts/cloudflare-admin-secrets.txt`; `scripts/cloudflare-admin-secrets.mjs` pushes them with `wrangler secret bulk` (stdin, never printed).

## Sentry on Workers (open gap)
`src/instrumentation.ts` loads `sentry.server.config` when `NEXT_RUNTIME === 'nodejs'`, which OpenNext reports on Workers. `@sentry/nextjs` v11 server init is Node-oriented (OpenTelemetry, http patching) and is not confirmed to work in workerd. Smallest fix, not done: add `worker.ts` that wraps the generated `.open-next/worker.js` with `withSentry` from `@sentry/nextjs/cloudflare` (same `beforeSend`/`scrubEvent`/`beforeSendSpan` options) and point `main` in wrangler.jsonc at it. Verify on staging once deployed.
