// node --test scripts/check-endpoints.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { APP_DIR, problemsFor, scanAdmin } from './check-endpoints.mjs';

test('every admin route today has a lock and a limit, or a reason', () => {
  assert.deepEqual(scanAdmin(APP_DIR), []);
});

test('a route that is on no list fails', () => {
  const p = problemsFor('api/new-thing', 'export async function GET() {}');
  assert.equal(p.length, 1);
  assert.match(p[0], /not on the list/);
});

test('a staff route needs both the sign-in check and the limit', () => {
  assert.equal(problemsFor('api/live', 'await checkAdmin(); await withinRate(id, "x", 1);').length, 0);
  assert.equal(problemsFor('api/live', 'await withinRate(id, "x", 1);').length, 1);
  assert.equal(problemsFor('api/live', 'await checkAdmin();').length, 1);
  assert.equal(problemsFor('api/live', '').length, 2);
});

test('the sign-in route needs a per-address limit', () => {
  assert.equal(problemsFor('api/auth/password', 'await withinRate(ip, "admin-signin", 10)').length, 0);
  assert.equal(problemsFor('api/auth/password', 'export async function POST() {}').length, 1);
});

test('a public route passes only with its reason written', () => {
  assert.equal(problemsFor('api/auth/ping', 'export function GET() {}').length, 0);
});
