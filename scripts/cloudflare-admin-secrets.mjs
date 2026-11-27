#!/usr/bin/env node
/**
 * Pushes the admin's server secrets into its Cloudflare Worker (plan task 5.12 step 6).
 *
 *   node scripts/cloudflare-admin-secrets.mjs --target staging|production [--dry-run]
 *
 * Reads the names from scripts/cloudflare-admin-secrets.txt, takes each value from the process environment
 * (the workflow maps the GitHub environment secrets in), and sends them as one JSON object on stdin to
 * `wrangler secret bulk` (stdin, so no value touches the disk or the command line). Never prints a value:
 * only names and counts. A missing required name stops the run before anything is sent.
 * Needs CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID, and the Worker must already exist (deploy first).
 */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));

/** "NAME" = required, "NAME?" = optional; blank lines and # comments ignored. */
export function parseNames(text) {
  const out = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const optional = line.endsWith('?');
    const name = optional ? line.slice(0, -1).trim() : line;
    if (!/^[A-Z][A-Z0-9_]*$/.test(name)) throw new Error(`bad secret name in list: ${JSON.stringify(name)}`);
    if (name.startsWith('NEXT_PUBLIC_')) throw new Error(`${name} is inlined at build time, not a Worker secret`);
    out.push({ name, optional });
  }
  return out;
}

/** The JSON body for `wrangler secret bulk`, plus the names that are missing / skipped. Values stay inside `body`. */
export function collect(names, env) {
  const body = {};
  const missing = [];
  const skipped = [];
  for (const { name, optional } of names) {
    const v = env[name];
    if (typeof v === 'string' && v.trim() !== '') body[name] = v;
    else if (optional) skipped.push(name);
    else missing.push(name);
  }
  return { body, missing, skipped };
}

function main(argv, env) {
  const target = argv[argv.indexOf('--target') + 1];
  const dry = argv.includes('--dry-run');
  if (target !== 'staging' && target !== 'production') {
    console.error('usage: cloudflare-admin-secrets.mjs --target staging|production [--dry-run]');
    return 2;
  }
  const names = parseNames(readFileSync(path.join(here, 'cloudflare-admin-secrets.txt'), 'utf8'));
  const { body, missing, skipped } = collect(names, env);
  if (missing.length) {
    console.error(`[admin-secrets] ${target}: required secret(s) not set: ${missing.join(', ')}. Add them to the GitHub environment "${target}".`);
    return 1;
  }
  console.log(`[admin-secrets] ${target}: ${Object.keys(body).length} to push (${Object.keys(body).join(', ')})`);
  if (skipped.length) console.log(`[admin-secrets] ${target}: optional, not set, skipped: ${skipped.join(', ')}`);
  if (dry) { console.log('[admin-secrets] dry run: nothing sent'); return 0; }
  if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) {
    console.error('[admin-secrets] CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required');
    return 1;
  }
  const args = ['wrangler', 'secret', 'bulk'];
  if (target === 'production') args.push('--env', 'production');
  const r = spawnSync('npx', args, { input: JSON.stringify(body), stdio: ['pipe', 'inherit', 'inherit'], env, shell: process.platform === 'win32' });
  if (r.status !== 0) { console.error(`[admin-secrets] wrangler exited with ${r.status}`); return 1; }
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exit(main(process.argv.slice(2), process.env));
}
