/** @type {import('next').NextConfig} */
const nextConfig = {
  // Do not advertise the framework.
  poweredByHeader: false,

  // This console is for staff only -- keep it out of search indexes
  // regardless of what host it ends up deployed behind. The rest are the
  // response headers every page should carry; the Content-Security-Policy is
  // per-request (it carries a nonce) and is set in src/middleware.ts.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          // Only ever reached over HTTPS; browsers should never try plain HTTP.
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Belt and braces with CSP frame-ancestors, for older browsers.
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
          },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
