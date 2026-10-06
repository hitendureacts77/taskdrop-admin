import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TaskDrop Admin',
  description: 'Internal admin panel -- staff only.',
  robots: { index: false, follow: false },
};

// Every page is rendered per request. The Content-Security-Policy carries a
// fresh nonce for each request (src/middleware.ts), and a prerendered page
// cannot have one stamped on its scripts -- it would load blank under the CSP.
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Same typeface the mobile app ships (Plus Jakarta Sans), self-hosted:
            the @font-face rules are in globals.css. No third-party requests. */}
        <link
          rel="preload"
          href="/fonts/plus-jakarta-sans-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
