#!/usr/bin/env node
/**
 * Scan what actually ships (plan task 2.18 part D, hole H72): reads every file in the named build
 * folders and fails if one holds something that looks like a secret.
 *
 *   node scripts/scan-build.mjs .next/static [more folders]
 *
 * - Files are read as bytes (latin1) in overlapping slices, so a minified bundle (one huge line) and a
 *   Hermes `.hbc` bytecode file (binary, with the app's strings inside) are covered the same way.
 * - It uses the same rules as the commit guard (scripts/lib/secret-patterns.mjs).
 * - It prints the file, the rule NAME and the slice position. NEVER the matched text.
 * - A folder that is missing, or holds no files, FAILS the scan: a missing build must not pass.
 *
 * Exit 0: scanned, nothing found. Exit 1: a hit, a missing or empty folder, or no folder named.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FAKE, RULES } from './lib/secret-patterns.mjs';

export const SLICE = 3000;
/** Longer than the longest key (a service-role JWT is about 250 characters), so a key cut by a slice edge is still whole in the next window. */
export const OVERLAP = 600;

function listFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) listFiles(p, out);
    else out.push(p);
  }
  return out;
}

/** Findings in one buffer: [{ rule, position }] where position is the start of the slice that holds it. Never includes the secret. */
export function scanBuffer(buf) {
  const seen = new Set();
  const out = [];
  for (let start = 0; start < buf.length; start += SLICE) {
    const from = Math.max(0, start - OVERLAP);
    const text = buf.toString('latin1', from, Math.min(buf.length, start + SLICE));
    for (const rule of RULES) {
      const re = new RegExp(rule.re.source, rule.re.flags.includes('g') ? rule.re.flags : rule.re.flags + 'g');
      for (const m of text.matchAll(re)) {
        const hit = rule.group ? m[rule.group] : m[0];
        // The made-up check looks at the match only, not the slice: minified code is full of `...`.
        if (FAKE.test(hit) || FAKE.test(m[0])) continue;
        if (rule.verify && !rule.verify(hit)) continue;
        const abs = from + m.index;
        const key = `${rule.id}:${abs}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ rule: rule.id, position: Math.floor(abs / SLICE) * SLICE });
      }
    }
  }
  return out;
}

/** Scans folders. Returns { problems: string[], files: number }; problems are plain sentences, never a secret. */
export function scanFolders(folders, cwd = process.cwd()) {
  const problems = [];
  let files = 0;
  if (folders.length === 0) problems.push('No folder named. Usage: node scripts/scan-build.mjs <folder> [more folders]');
  for (const folder of folders) {
    const dir = resolve(cwd, folder);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) {
      problems.push(`${folder}: folder is missing, so there is no build to scan. Build first; a missing build fails.`);
      continue;
    }
    const list = listFiles(dir);
    if (list.length === 0) {
      problems.push(`${folder}: folder holds no files, so there is no build to scan.`);
      continue;
    }
    for (const f of list) {
      files++;
      const rel = relative(cwd, f).replace(/\\/g, '/');
      for (const h of scanBuffer(readFileSync(f))) problems.push(`${rel}: ${h.rule} (slice at byte ${h.position})`);
    }
  }
  return { problems, files };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const folders = process.argv.slice(2);
  const { problems, files } = scanFolders(folders);
  if (problems.length) {
    console.error(`scan-build: STOP, ${problems.length} problem(s):`);
    for (const p of problems) console.error(` - ${p}`);
    process.exit(1);
  }
  console.log(`scan-build: ${files} file(s) in ${folders.join(', ')} scanned, no secret found`);
}
