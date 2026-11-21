// node --test scripts/check-endpoints.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { APP_DIR, SRC_DIR, actionProblems, problemsFor, scanActions, scanAdmin } from './check-endpoints.mjs';

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

test('the risky server actions each call the per-staff limit (B123)', () => {
  assert.deepEqual(scanActions(SRC_DIR), []);
});

test('an action without the limit is reported, one with it passes', () => {
  const src = 'export async function sendBroadcast() {\n  await other();\n}\nexport async function x() { await actionLimit("broadcast"); }\n';
  assert.equal(actionProblems('src/lib/crm-actions.ts', 'sendBroadcast', src).length, 1);
  const ok = 'export async function sendBroadcast() {\n  const slow = await actionLimit(me.id, "broadcast");\n}\n';
  assert.equal(actionProblems('src/lib/crm-actions.ts', 'sendBroadcast', ok).length, 0);
  assert.match(actionProblems('src/lib/crm-actions.ts', 'gone', ok)[0], /no longer exists/);
});
