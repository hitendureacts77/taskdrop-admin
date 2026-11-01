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

/** The shortest real value: a Supabase secret key is 41+ characters (the older service-role token about 200); the others are random 32+ characters. */
export const REQUIRED = [
  { name: 'SUPABASE_SERVICE_ROLE_KEY', min: 30 },
  { name: 'ADMIN_SESSION_SECRET', min: 1 }, // present is enough to pass; its length is only a warning, see WARN_SHORT
  { name: 'API_GATEWAY_SECRET', min: 32 },
  { name: 'NEXT_PUBLIC_SUPABASE_URL', min: 20 },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', min: 20 },
];

/**
 * Found 2026-11-01 (this check's first Vercel build): ADMIN_SESSION_SECRET is shorter than 16 characters.
 * It only signs the idle-time cookie, but a strong one is 32+. Replacing it is a key change, which the
 * owner has put on hold (no key rotation), so a short value warns in every build instead of failing it.
 * Lengthen it when the hold is lifted, then move this name into REQUIRED with min 32.
 */
export const WARN_SHORT = [{ name: 'ADMIN_SESSION_SECRET', min: 32 }];

const problems = missingOrShort(process.env, REQUIRED);
if (!process.env.VERCEL) {
  console.log('[required-env] not a Vercel build: skipped');
} else if (problems.length) {
  console.error(`[required-env] FAILED: ${problems.join('; ')}. Set them in Vercel (project taskdrop-admin, this environment), then deploy again.`);
  process.exit(1);
} else {
  console.log('[required-env] every required secret is set');
  for (const p of missingOrShort(process.env, WARN_SHORT)) {
    console.log(`::warning:: [required-env] ${p}. Lengthening it is a key change (on hold); see docs/ULTIMATE_PLAN.md task 2.5.`);
  }
}
