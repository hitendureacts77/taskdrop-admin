import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
