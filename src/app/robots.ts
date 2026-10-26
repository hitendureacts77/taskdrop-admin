import type { MetadataRoute } from 'next';

/**
 * Nothing in this console is for search engines, in staging or production:
 * it is a staff-only money panel behind a sign-in. The page <meta> and the
 * X-Robots-Tag header (next.config.mjs) already say noindex everywhere; this
 * adds the matching robots.txt.
 */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: '/' } };
}
