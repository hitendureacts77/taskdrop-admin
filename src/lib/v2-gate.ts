/**
 * The admin design v2 gate (docs/admin-redesign/07-build-plan-v2.md, "Gate").
 *
 * The new look shows only when BOTH are true:
 *   1. the build was made with NEXT_PUBLIC_ADMIN_V2 set to exactly "on"
 *      (set on the STAGING Vercel project only), and
 *   2. the `environment` app control (get_app_controls) is exactly "staging".
 *
 * Strict on purpose, unlike environment.ts (which treats anything unknown as
 * staging so the ribbon can only be wrongly shown): here anything unknown, a
 * missing key, a failed read, "Staging", " staging", "preview", turns v2 OFF,
 * so production can never get the new admin by accident. Pure, so unit-tested.
 */

/** The raw `environment` string from the get_app_controls JSON, or null when it is missing or not a string. */
export function rawEnvironment(controls: unknown): string | null {
  if (!controls || typeof controls !== 'object' || Array.isArray(controls)) return null;
  const value = (controls as Record<string, unknown>).environment;
  return typeof value === 'string' ? value : null;
}

/** True only for flag === "on" and environment === "staging", both exact. */
export function isV2Enabled(flag: string | undefined | null, environment: string | null | undefined): boolean {
  return flag === 'on' && environment === 'staging';
}
