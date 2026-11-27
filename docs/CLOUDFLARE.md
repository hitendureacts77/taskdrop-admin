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

## Sentry on Workers
`wrangler.jsonc` runs `worker.ts`. It wraps the OpenNext handler (`.open-next/worker.js`) with `withSentry` from `@sentry/nextjs/cloudflare`.
Server, edge and Worker share one set of options and scrubbing: `src/lib/sentry-options.ts`.
On Workers the Worker client is in charge. `Sentry.init` in `sentry.server.config` / `sentry.edge.config` makes no second client there (Sentry docs; checked in the SDK source).
A local `cf:preview` has no `APP_ENV`, so it does not report. CI job "Cloudflare Worker bundle (dry run)" bundles `worker.ts` on every PR.
Check on staging after the first deploy: throw a test error and see it in Sentry.

## Portable settings
The code reads `APP_ENV`, `GIT_COMMIT_SHA`, `APP_REGION` first, then the `VERCEL_*` names (`src/lib/runtime-env.ts`). One build works on both hosts.
`admin-deploy.yml` sets them for the build and passes them to the Worker with `--var`, with the Sentry DSN and environment. They are not secret.

## Release guard
`release-production.yml` takes the last green staging run and checks that its "upload to Cloudflare" step succeeded. A run that only skipped (no Cloudflare secrets) does not count.
