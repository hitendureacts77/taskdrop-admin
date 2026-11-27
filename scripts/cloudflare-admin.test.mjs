import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { parseNames, collect } from './cloudflare-admin-secrets.mjs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const names = parseNames(read('scripts/cloudflare-admin-secrets.txt'));

test('parseNames: required, optional, comments; refuses NEXT_PUBLIC_ and bad names', () => {
  assert.deepEqual(parseNames('# c\nA_B\nC?\n\n'), [{ name: 'A_B', optional: false }, { name: 'C', optional: true }]);
  assert.throws(() => parseNames('NEXT_PUBLIC_X'));
  assert.throws(() => parseNames('lower'));
});

test('collect: missing required reported, optional skipped, values never in the report lists', () => {
  const r = collect(parseNames('A\nB?'), { A: 'secretvalue' });
  assert.deepEqual(r.missing, []);
  assert.deepEqual(r.skipped, ['B']);
  assert.equal(r.body.A, 'secretvalue');
  assert.deepEqual(collect(parseNames('A'), { A: '  ' }).missing, ['A']);
});

test('every listed secret is declared in workflow_call and passed by the release', () => {
  const deploy = read('.github/workflows/admin-deploy.yml');
  const release = read('.github/workflows/release-production.yml');
  for (const { name } of names) {
    assert.match(deploy, new RegExp(`      ${name}:\r?\n        required: false`), `${name} declared`);
    assert.ok(release.includes(`${name}: \${{ secrets.${name} }}`), `${name} passed by release`);
  }
  for (const n of ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']) {
    assert.ok(release.includes(`${n}: \${{ secrets.${n} }}`), `${n} passed by release`);
  }
});

test('production is never reached from a push; skip path is green', () => {
  const deploy = read('.github/workflows/admin-deploy.yml');
  assert.match(deploy, /branches: \[redesigned-2\.0\]/);
  assert.match(deploy, /inputs\.target \|\| 'staging'/);
  assert.match(deploy, /::notice::Cloudflare secrets not set yet/);
  const release = read('.github/workflows/release-production.yml');
  assert.match(release, /^on:\r?\n  workflow_dispatch:/m);
  assert.doesNotMatch(release, /secrets: inherit/);
});

test('wrangler has both workers and Mumbai placement', () => {
  const w = read('wrangler.jsonc');
  assert.match(w, /taskdrop-admin-staging/);
  assert.match(w, /taskdrop-admin-production/);
  assert.match(w, /aws:ap-south-1/);
});

test('wrangler runs worker.ts, which wraps OpenNext with the Sentry Worker client and the shared options', () => {
  assert.match(read('wrangler.jsonc'), /"main": "worker\.ts"/);
  const worker = read('worker.ts');
  assert.match(worker, /from '@sentry\/nextjs\/cloudflare'/);
  assert.match(worker, /from '\.\/\.open-next\/worker\.js'/);
  assert.match(worker, /sentryServerOptions\(/);
  for (const f of ['src/sentry.server.config.ts', 'src/sentry.edge.config.ts']) {
    assert.match(read(f), /Sentry\.init\(sentryServerOptions\(/, `${f} uses the shared options`);
  }
});

test('deploy passes the portable settings to the Worker', () => {
  const deploy = read('.github/workflows/admin-deploy.yml');
  assert.match(deploy, /APP_ENV: \$\{\{ inputs\.target \|\| 'staging' \}\}/);
  assert.match(deploy, /GIT_COMMIT_SHA: \$\{\{ github\.sha \}\}/);
  for (const v of ['APP_ENV', 'GIT_COMMIT_SHA', 'APP_REGION', 'NEXT_PUBLIC_SENTRY_ENVIRONMENT']) {
    assert.ok(deploy.includes(`--var "${v}:`), `${v} passed as a Worker var`);
  }
});

test('release refuses a staging run that only skipped', () => {
  const deploy = read('.github/workflows/admin-deploy.yml');
  const release = read('.github/workflows/release-production.yml');
  assert.match(deploy, /- name: upload to Cloudflare\r?\n/);
  assert.ok(release.includes('select(.name == "upload to Cloudflare" and .conclusion == "success")'));
  assert.match(release, /did not upload to Cloudflare \(it skipped\)/);
});

test('no source file reads a VERCEL_ variable except the portable fallbacks', () => {
  const allowed = new Set(['src/lib/runtime-env.ts', 'src/lib/sentry-dsn.ts', 'src/lib/runtime-env.test.ts']);
  const files = execSync('git ls-files src', { encoding: 'utf8' }).split('\n').filter((f) => /\.(ts|tsx|mjs|js)$/.test(f));
  for (const f of files) {
    if (allowed.has(f)) continue;
    assert.doesNotMatch(read(f), /process\.env\.VERCEL_/, `${f} reads VERCEL_* directly`);
  }
});
