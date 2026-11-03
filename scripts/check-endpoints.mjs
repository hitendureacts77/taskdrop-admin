#!/usr/bin/env node
/**
 * Every server route in the admin has a lock and a limit, or a written reason (task 2.13 part A).
 *
 * The admin's server routes (every route.ts under src/app) are doors a browser can call directly, and a
 * route does not inherit the dashboard's sign-in check. This lists every route and puts it in one
 * of three kinds. A route on none of them fails `npm test`, so a new door cannot be merged without
 * somebody deciding what protects it:
 *
 *   staff     checks the signed-in admin (checkAdmin) AND counts a hit per staff member (withinRate)
 *   signin    the sign-in door itself: counts a hit per network address (withinRate)
 *   public    open on purpose, with the reason written below
 *
 *   node scripts/check-endpoints.mjs      prints every problem, exit 1 if there is one
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {Record<string, { kind: 'staff' | 'signin' | 'public', why?: string }>} */
export const ROUTES = {
  'api/auth/password': { kind: 'signin' },
  'api/auth/ping': { kind: 'public', why: 'answers { ok: true } and nothing else; the middleware decides whether the session is still alive' },
  'api/crm/export': { kind: 'staff' },
  'api/crm/leads/export': { kind: 'staff' },
  'api/live': { kind: 'staff' },
  'api/reports/export': { kind: 'staff' },
  'auth/callback': { kind: 'public', why: 'Google sends people back here with a one-time code; Supabase Auth checks the code and limits the exchanges' },
};

/** Problems with one route, given its path (under src/app, no file name) and its source. */
export function problemsFor(route, text) {
  const door = ROUTES[route];
  if (!door) return [`${route}: is not on the list in scripts/check-endpoints.mjs. Add it as staff, signin or public (with a reason)`];
  const out = [];
  if (door.kind === 'staff') {
    if (!/\bcheckAdmin\s*\(/.test(text)) out.push(`${route}: no admin sign-in check (checkAdmin)`);
    if (!/\bwithinRate\s*\(/.test(text)) out.push(`${route}: no per-person limit (withinRate)`);
  } else if (door.kind === 'signin') {
    if (!/\bwithinRate\s*\(/.test(text)) out.push(`${route}: no per-address limit (withinRate)`);
  } else if (!door.why) {
    out.push(`${route}: marked public with no reason`);
  }
  return out;
}

/** Every route file under src/app as { route, text }. */
export function routeFiles(appDir) {
  const found = [];
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (f === 'route.ts' || f === 'route.js') {
        found.push({ route: relative(appDir, dirname(p)).split('\\').join('/'), text: readFileSync(p, 'utf8') });
      }
    }
  };
  walk(appDir);
  return found;
}

/** Problems across the whole app, including a listed route that no longer exists. */
export function scanAdmin(appDir) {
  const files = routeFiles(appDir);
  const out = files.flatMap((f) => problemsFor(f.route, f.text));
  for (const name of Object.keys(ROUTES)) {
    if (!files.some((f) => f.route === name)) out.push(`${name}: is on the list but the route no longer exists. Remove it from scripts/check-endpoints.mjs`);
  }
  return out;
}

export const APP_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../src/app');

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const problems = scanAdmin(APP_DIR);
  for (const p of problems) console.log(p);
  console.log(problems.length ? `\n${problems.length} problem(s).` : 'Every admin route has a lock and a limit, or a written reason.');
  process.exit(problems.length ? 1 : 0);
}
