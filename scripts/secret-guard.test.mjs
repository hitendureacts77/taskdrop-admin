// Tests for the commit guard and for the rule that no secret reaches the browser.
// Run from the repo root: node --test scripts/secret-guard.test.mjs
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { forbiddenFile, scanText } from './lib/secret-patterns.mjs';
import { scanFiles } from './secret-guard.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const ls = () => execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);

// Built at run time so this file itself holds no secret-shaped text.
const fakeJwt = (role) =>
  ['{"alg":"HS256"}', JSON.stringify({ role })].map((p) => Buffer.from(p).toString('base64url')).join('.') + '.c2lnbmF0dXJlLXNpZ25hdHVyZQ';
const long = (n) => 'a1B2c3D4'.repeat(Math.ceil(n / 8)).slice(0, n);

test('catches the kinds of secret we hold', () => {
  const cases = {
    'private-key-block': '-----BEGIN ' + 'PRIVATE KEY-----',
    'razorpay-live-key': 'k = "rzp_live_' + long(14) + '"',
    'supabase-service-role-jwt': 'x=' + fakeJwt('service_role'),
    'secret-assignment': 'const CLIENT_SECRET = "' + long(32) + '";',
  };
  for (const [rule, line] of Object.entries(cases)) assert.deepEqual(scanText(line).map((h) => h.rule), [rule], rule);
});

test('lets safe text through', () => {
  assert.deepEqual(scanText('x=' + fakeJwt('anon')), []);
  assert.deepEqual(scanText('SECRET_KEYS="SUPABASE_SERVICE_ROLE_KEY"'), []);
  assert.deepEqual(scanText('const CLIENT_SECRET = "' + long(32) + '"; // secret-guard: allow'), []);
});

test('files that must never be committed', () => {
  for (const f of ['.env', '.env.local', '.env.all-secrets', 'x.keystore', 'google-services.json']) assert.equal(forbiddenFile(f), true, f);
  assert.equal(forbiddenFile('.env.example'), false);
});

test('scanFiles reports file and line, never the value', () => {
  const secret = 'rzp_live_' + long(14);
  const out = scanFiles(['a.ts'], () => `ok\nk="${secret}"`);
  assert.equal(out.length, 1);
  assert.match(out[0], /^a\.ts:2: /);
  assert.ok(!out[0].includes(secret));
});

test('every tracked file passes the guard', () => {
  assert.deepEqual(scanFiles(ls(), (f) => readFileSync(join(root, f), 'utf8')), []);
});

// ---- nothing secret in the browser ---------------------------------------------------------------

/** Names that must never be readable by the browser: NEXT_PUBLIC_ values are copied into the bundle. */
const SERVER_ONLY = /SERVICE_ROLE|SECRET|PRIVATE|PASSWORD|AUTH_TOKEN|ACCESS_TOKEN|DATABASE_URL|RAZORPAY|WEBHOOK/i;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (['node_modules', '.next'].includes(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|jsx|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

test('no NEXT_PUBLIC_ name sounds like a secret', () => {
  const bad = [];
  for (const f of [...walk(join(root, 'src')), join(root, 'next.config.mjs')]) {
    for (const m of readFileSync(f, 'utf8').matchAll(/NEXT_PUBLIC_[A-Z0-9_]+/g)) if (SERVER_ONLY.test(m[0])) bad.push(`${relative(root, f)}: ${m[0]}`);
  }
  for (const m of readFileSync(join(root, '.env.example'), 'utf8').matchAll(/^#?\s*(NEXT_PUBLIC_[A-Z0-9_]+)=/gm)) if (SERVER_ONLY.test(m[1])) bad.push(`.env.example: ${m[1]}`);
  assert.deepEqual(bad, []);
});

test('files that run in the browser never read a server-only name', () => {
  const bad = [];
  for (const f of walk(join(root, 'src'))) {
    const text = readFileSync(f, 'utf8');
    if (!/^\s*['"]use client['"]/m.test(text)) continue;
    for (const m of text.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
      if (!m[1].startsWith('NEXT_PUBLIC_') && m[1] !== 'NODE_ENV') bad.push(`${relative(root, f)}: process.env.${m[1]}`);
    }
  }
  assert.deepEqual(bad, []);
});

test('the master-key client is server-only', () => {
  const text = readFileSync(join(root, 'src/lib/supabase/service.ts'), 'utf8');
  assert.match(text, /import ['"]server-only['"]/);
  assert.ok(!/NEXT_PUBLIC_SUPABASE_SERVICE/.test(text));
});

test('a built bundle (when one exists) holds no secret', () => {
  const dist = join(root, '.next/static');
  if (!existsSync(dist)) return;
  const hits = [];
  const walkAll = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walkAll(p);
      else if (/\.(js|html|json|map)$/.test(name)) {
        const text = readFileSync(p, 'utf8');
        for (let i = 0; i < text.length; i += 3000) for (const h of scanText(text.slice(Math.max(0, i - 200), i + 3000))) hits.push(`${relative(dist, p)}: ${h.rule}`);
      }
    }
  };
  walkAll(dist);
  assert.deepEqual([...new Set(hits)], []);
});
