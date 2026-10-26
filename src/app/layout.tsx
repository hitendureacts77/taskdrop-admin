import type { Metadata } from 'next';
import { EnvRibbon } from '@/components/EnvRibbon';
import { showStagingRibbon } from '@/lib/environment';
import { getEnvironment } from '@/lib/environment-server';
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The staging ribbon lives here, above every page including sign-in. The
  // html attribute tells the stylesheet how tall it is, so the sticky sidebar
  // and top bar sit just below it instead of under it.
  const ribbon = showStagingRibbon(await getEnvironment());
  return (
    <html lang="en" data-ribbon={ribbon ? 'on' : undefined}>
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
      <body>
        {ribbon ? <EnvRibbon /> : null}
        {children}
      </body>
    </html>
  );
}
