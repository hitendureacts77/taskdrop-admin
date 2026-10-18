'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/** Last line of defence: an error in the root layout itself. */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: 32 }}>
        <h1>Something went wrong</h1>
        <p>Nothing was changed. Reload the page; if it keeps happening, the error has been reported.</p>
      </body>
    </html>
  );
}
