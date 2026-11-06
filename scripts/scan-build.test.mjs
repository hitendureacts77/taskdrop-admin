// Tests for the build scan (plan task 2.18 part D). Run: node --test scripts/scan-build.test.mjs
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { SLICE, scanBuffer } from './scan-build.mjs';

const script = fileURLToPath(new URL('./scan-build.mjs', import.meta.url));

// Built at run time so this file holds no secret-shaped text (the commit guard and gitleaks stay quiet).
const long = (n) => 'a1B2c3D4'.repeat(Math.ceil(n / 8)).slice(0, n);
const KEY = 'rzp_live_' + long(14);
const fakeJwt = (role) =>
  ['{"alg":"HS256"}', JSON.stringify({ role })].map((p) => Buffer.from(p).toString('base64url')).join('.') + '.c2lnbmF0dXJlLXNpZ25hdHVyZQ';

const tmp = mkdtempSync(join(tmpdir(), 'scan-build-'));
test.after(() => rmSync(tmp, { recursive: true, force: true }));

function folder(name, files) {
  const dir = join(tmp, name);
  mkdirSync(dir, { recursive: true });
  for (const [f, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, f)), { recursive: true });
    writeFileSync(join(dir, f), content);
  }
  return dir;
}
const run = (...dirs) => spawnSync(process.execPath, [script, ...dirs], { encoding: 'utf8' });

test('a clean build passes', () => {
  const dir = folder('clean', { 'index.html': '<html></html>', 'a/app.js': 'var x=[...y];' + 'z'.repeat(9000) });
  const r = run(dir);
  assert.equal(r.status, 0, r.stderr);
});

test('a missing folder fails instead of skipping', () => {
  const r = run(join(tmp, 'no-such-build'));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /missing/);
});

test('an empty folder fails', () => {
  const dir = join(tmp, 'empty');
  mkdirSync(dir);
  const r = run(dir);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /no files/);
});

test('no folder named fails', () => {
  assert.equal(run().status, 1);
});

test('one missing folder among good ones fails', () => {
  const dir = folder('good', { 'a.js': 'ok' });
  assert.equal(run(dir, join(tmp, 'nope')).status, 1);
});

test('a key in a minified bundle is found, and the output never holds it', () => {
  const dir = folder('minified', { 'bundle.js': 'a'.repeat(7000) + ';k="' + KEY + '";' + 'b'.repeat(5000) });
  const r = run(dir);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /bundle\.js: razorpay-live-key/);
  assert.ok(!(r.stdout + r.stderr).includes(KEY));
  assert.ok(!(r.stdout + r.stderr).includes(long(14)));
});

test('a key inside a binary (Hermes-style) file is found', () => {
  const bytes = Buffer.concat([
    Buffer.from([0xc6, 0x1f, 0xbc, 0x03, 0x00, 0xff, 0xfe, 0x00, 0x80]),
    Buffer.alloc(5000, 0x00),
    Buffer.from(KEY, 'latin1'),
    Buffer.from([0x00, 0x01, 0xfa, 0xce]),
  ]);
  const dir = folder('binary', { 'index.android.bundle.hbc': bytes });
  const r = run(dir);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /razorpay-live-key/);
  assert.ok(!(r.stdout + r.stderr).includes(KEY));
});

test('a key cut by a slice edge is still found, once', () => {
  const pad = 'q'.repeat(SLICE - 5);
  const hits = scanBuffer(Buffer.from(pad + KEY + 'tail'));
  assert.deepEqual(hits.map((h) => h.rule), ['razorpay-live-key']);
});

test('a service-role JWT is found, an anon one is not', () => {
  assert.deepEqual(scanBuffer(Buffer.from('x="' + fakeJwt('service_role') + '"')).map((h) => h.rule), ['supabase-service-role-jwt']);
  assert.deepEqual(scanBuffer(Buffer.from('x="' + fakeJwt('anon') + '"')), []);
});

test('made-up keys marked THROWAWAY pass; spread dots elsewhere in the slice do not hide a real key', () => {
  assert.deepEqual(scanBuffer(Buffer.from('rzp_live_THROWAWAYKEY01')), []);
  assert.equal(scanBuffer(Buffer.from('f(...args);' + KEY)).length, 1);
});

test('a camelCase identifier after private_ is not a key, a random one is', () => {
  assert.deepEqual(scanBuffer(Buffer.from('x=private_' + 'connectionPoolManagerHandlerFactory')), []);
  assert.deepEqual(scanBuffer(Buffer.from('x=private_' + long(28))).map((h) => h.rule), ['imagekit-private-key']);
});
