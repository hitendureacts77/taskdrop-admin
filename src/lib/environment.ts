/**
 * Which environment this admin is pointed at: "staging" (fake money, fake
 * data) or "production". The value is the `environment` app control
 * (top-level key of get_app_controls), set in the app repo's backend.
 *
 * Safe by default: anything that is not exactly "production" -- a missing
 * key, an unknown word, a failed read -- counts as staging, so the warning
 * can only ever be wrongly shown, never wrongly hidden. Pure, so unit-tested.
 */

export type AppEnvironment = 'staging' | 'production';

/** The wording on the ribbon; the same words as the user app's ribbon. */
export const STAGING_RIBBON_TEXT = 'Staging: fake money and fake data';

/** Reads `environment` from the get_app_controls JSON. Case and spaces are forgiven; the default is "staging". */
export function parseEnvironment(controls: unknown): AppEnvironment {
  if (controls && typeof controls === 'object' && !Array.isArray(controls)) {
    const value = (controls as Record<string, unknown>).environment;
    if (typeof value === 'string' && value.trim().toLowerCase() === 'production') return 'production';
  }
  return 'staging';
}

/** The ribbon is hidden only in production. */
export function showStagingRibbon(env: AppEnvironment): boolean {
  return env !== 'production';
}
