import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appEnv, appRegion, commitSha, workerSentry } from './runtime-env.ts';

test('portable names win over the Vercel ones', () => {
  const env = { APP_ENV: 'staging', VERCEL_ENV: 'production', GIT_COMMIT_SHA: 'abc1234', VERCEL_GIT_COMMIT_SHA: 'fff', APP_REGION: 'ap-south-1', VERCEL_REGION: 'bom1' };
  assert.equal(appEnv(env), 'staging');
  assert.equal(commitSha(env), 'abc1234');
  assert.equal(appRegion(env), 'ap-south-1');
});

test('Vercel names still work until Vercel is switched off', () => {
  const env = { VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_SHA: 'def5678', VERCEL_REGION: 'bom1' };
  assert.equal(appEnv(env), 'production');
  assert.equal(commitSha(env), 'def5678');
  assert.equal(appRegion(env), 'bom1');
});

test('missing or blank values are null', () => {
  assert.equal(appEnv({}), null);
  assert.equal(commitSha({ GIT_COMMIT_SHA: '  ' }), null);
  assert.equal(appRegion({ APP_REGION: '' }), null);
});

test('worker Sentry: off without APP_ENV (local preview), on with it', () => {
  assert.deepEqual(workerSentry({}, 'https://k@o1.ingest.sentry.io/1'), { dsn: '', environment: 'production' });
  assert.deepEqual(workerSentry({ APP_ENV: 'staging' }, 'https://k@o1.ingest.sentry.io/1'), {
    dsn: 'https://k@o1.ingest.sentry.io/1',
    environment: 'staging',
  });
});

test('worker Sentry: the DSN and environment can be overridden, and an empty DSN turns it off', () => {
  const env = { APP_ENV: 'production', NEXT_PUBLIC_SENTRY_DSN: 'https://x@o2.ingest.sentry.io/2', NEXT_PUBLIC_SENTRY_ENVIRONMENT: 'prod-cf' };
  assert.deepEqual(workerSentry(env, 'default'), { dsn: 'https://x@o2.ingest.sentry.io/2', environment: 'prod-cf' });
  assert.equal(workerSentry({ APP_ENV: 'production', NEXT_PUBLIC_SENTRY_DSN: '' }, 'default').dsn, '');
});
