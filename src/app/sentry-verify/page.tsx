'use client';

import { useEffect, useState } from 'react';

// TEMP (Phase 1 verify, remove after the check): throws in the browser on purpose when opened with ?t=token.
export default function SentryVerify() {
  const [hit, setHit] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('t') === '6743ef8a8d9f26a4') setHit(true);
  }, []);
  if (hit) throw new Error('Sentry verify: test error from the admin browser');
  return <p>ok</p>;
}
