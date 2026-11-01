#!/usr/bin/env node
/**
 * Runs before `next build` (the "prebuild" script). On Vercel, a deploy that is missing a required
 * secret, or holds a stub too short to be real, FAILS here, naming the secret but never its value.
 * Without it the panel would deploy and then quietly lose a protection (the idle sign-out, the
 * gateway key). Task 2.5, hole H4 (docs/ULTIMATE_PLAN.md in the taskdrop repo).
 *
 * Skipped outside Vercel (a laptop, GitHub CI) so `npm run build` still works with placeholders.
 */
import { missingOrShort } from './lib/required-env.mjs';

/** The shortest real value: a service-role key is a ~200-character token; the others are random 32+ characters. */
export const REQUIRED = [
  { name: 'SUPABASE_SERVICE_ROLE_KEY', min: 100 },
  { name: 'ADMIN_SESSION_SECRET', min: 32 },
  { name: 'API_GATEWAY_SECRET', min: 32 },
  { name: 'NEXT_PUBLIC_SUPABASE_URL', min: 20 },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', min: 20 },
];

const problems = missingOrShort(process.env, REQUIRED);
if (!process.env.VERCEL) {
  console.log('[required-env] not a Vercel build: skipped');
} else if (problems.length) {
  console.error(`[required-env] FAILED: ${problems.join('; ')}. Set them in Vercel (project taskdrop-admin, this environment), then deploy again.`);
  process.exit(1);
} else {
  console.log('[required-env] every required secret is set');
}
