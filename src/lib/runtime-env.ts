/**
 * Host-neutral names for "where am I running", so the same build works on Vercel (until it is switched off) and on
 * Cloudflare Workers (plan task 5.12). Each reads the portable name first and falls back to the Vercel one:
 *   APP_ENV        -> VERCEL_ENV               staging | production (set by admin-deploy.yml as a Worker var)
 *   GIT_COMMIT_SHA -> VERCEL_GIT_COMMIT_SHA    the deployed commit
 *   APP_REGION     -> VERCEL_REGION            where the server runs
 * Pure (takes the env object), so unit-tested.
 */

export type EnvLike = Readonly<Record<string, string | undefined>>;

const first = (...values: (string | undefined)[]): string | null => {
  for (const v of values) if (typeof v === 'string' && v.trim() !== '') return v.trim();
  return null;
};

export function appEnv(env: EnvLike): string | null {
  return first(env.APP_ENV, env.VERCEL_ENV);
}

export function commitSha(env: EnvLike): string | null {
  return first(env.GIT_COMMIT_SHA, env.VERCEL_GIT_COMMIT_SHA);
}

export function appRegion(env: EnvLike): string | null {
  return first(env.APP_REGION, env.VERCEL_REGION);
}

/**
 * DSN and environment for the Sentry client of the Cloudflare Worker (worker.ts). Only a deployed Worker has APP_ENV,
 * so a local `wrangler dev` / `cf:preview` stays quiet, like `next dev`. NEXT_PUBLIC_SENTRY_DSN set to empty turns it off.
 */
export function workerSentry(env: EnvLike, defaultDsn: string): { dsn: string; environment: string } {
  const where = appEnv(env);
  const dsn = where ? (env.NEXT_PUBLIC_SENTRY_DSN ?? defaultDsn) : '';
  return { dsn, environment: first(env.NEXT_PUBLIC_SENTRY_ENVIRONMENT, where ?? undefined) ?? 'production' };
}
