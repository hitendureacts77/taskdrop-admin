#!/usr/bin/env node
/**
 * Stops a commit that contains a key. Runs from .githooks/pre-commit on the files being committed
 * (`--staged`), or on every tracked file (`--all`, used by the weekly check and by hand).
 * It prints the file, the line and the rule name, never the secret itself.
 *
 *   node scripts/secret-guard.mjs --staged
 *   node scripts/secret-guard.mjs --all
 *
 * One line can be let through with a trailing `secret-guard: allow` comment, for a value that is
 * made up on purpose. The second net is gitleaks on GitHub (.gitleaks.toml, secret-scan.yml).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { forbiddenFile, scanText } from './lib/secret-patterns.mjs';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });

/** Files the scan never opens: archives of old docs, lock files and binaries. */
const SKIP = /(^|\/)(package-lock\.json|node_modules\/|docs\/archive\/)|\.(png|jpe?g|gif|webp|ico|pdf|woff2?|ttf|mp4|mov|zip|aab|apk)$/i;

export function scanFiles(files, read) {
  const problems = [];
  for (const f of files) {
    if (forbiddenFile(f)) {
      problems.push(`${f}: a file of this kind must never be committed (secrets file, keystore, service config)`);
      continue;
    }
    if (SKIP.test(f.replaceAll('\\', '/'))) continue;
    let text;
    try {
      text = read(f);
    } catch {
      continue; // deleted or unreadable
    }
    if (text == null || text.includes('\u0000')) continue;
    for (const hit of scanText(text)) problems.push(`${f}:${hit.line}: looks like a secret (${hit.rule})`);
  }
  return problems;
}

function main() {
  const staged = process.argv.includes('--staged');
  const files = staged
    ? git('diff', '--cached', '--name-only', '--diff-filter=ACMR').split('\n').filter(Boolean)
    : git('ls-files').split('\n').filter(Boolean);
  // For a commit, read what is staged, not what is in the working folder.
  const read = staged ? (f) => git('show', `:${f}`) : (f) => readFileSync(f, 'utf8');
  const problems = scanFiles(files, read);
  if (problems.length === 0) return;
  console.error('\nsecret-guard: this commit was stopped.\n');
  for (const p of problems) console.error('  ' + p);
  console.error(
    '\nRemove the value (keep real secrets only in .env.all-secrets) and commit again.\n' +
      'If a value is made up on purpose, end its line with a comment: secret-guard: allow\n',
  );
  process.exit(1);
}

// Run as a command, not when a test imports scanFiles.
if (process.argv[1]?.endsWith('secret-guard.mjs')) main();
