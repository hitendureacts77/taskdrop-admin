import { STAGING_RIBBON_TEXT } from '@/lib/environment';

/**
 * The staging guard rail: a bar across the top of every screen, the sign-in
 * page included, so nobody mistakes the test admin for the real one. Rendered
 * by the root layout only when the environment is not production.
 */
export function EnvRibbon() {
  return (
    <div className="env-ribbon" data-testid="env-ribbon">
      <span className="env-ribbon-dot" aria-hidden="true" />
      <span className="env-ribbon-text">{STAGING_RIBBON_TEXT}</span>
    </div>
  );
}
