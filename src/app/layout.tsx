import type { Metadata } from 'next';
import { EnvRibbon } from '@/components/EnvRibbon';
import { showStagingRibbon } from '@/lib/environment';
import { getEnvironment } from '@/lib/environment-server';
import { getV2, getV2Theme } from '@/lib/v2-gate-server';
import './globals.css';
// Admin design v2: every rule is scoped to [data-v2], so these do nothing while the gate is off.
import './v2.css';
import './v2/wp1-money.css';
import './v2/wp2-disputes-jobs.css';
import './v2/wp3-people.css';
import './v2/wp4-dashboard.css';
import './v2/wp5-safety-support.css';
import './v2/wp6-crm.css';
import './v2/wp7-reports-team.css';
import './v2/wp8a-settings.css';
import './v2/wp8b-settings-tools.css';
import './v2/wp9-catalog-feedback-promotions.css';
import './v2/wp10-search-shell.css';

export const metadata: Metadata = {
  // Each page names itself, so tabs and history tell the pages apart (A1-6).
  title: { default: 'TaskDrop Admin', template: '%s · TaskDrop Admin' },
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
  // Admin design v2 gate (lib/v2-gate.ts): only then are data-v2 and the forced theme set.
  const v2 = await getV2();
  const theme = v2 ? await getV2Theme() : 'system';
  return (
    <html lang="en" data-ribbon={ribbon ? 'on' : undefined} data-v2={v2 ? 'on' : undefined} data-theme={v2 && theme !== 'system' ? theme : undefined}>
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
