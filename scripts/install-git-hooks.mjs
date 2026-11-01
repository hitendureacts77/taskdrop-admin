#!/usr/bin/env node
// Points git at .githooks so the secret guard runs before every commit. Safe to run again.
// Does nothing outside a git checkout (CI installs, Vercel builds, a downloaded zip).
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

if (existsSync('.githooks')) {
  try {
    execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'ignore' });
  } catch {
    /* not a git checkout */
  }
}
