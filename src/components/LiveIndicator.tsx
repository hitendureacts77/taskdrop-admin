'use client';

import { useLive } from './LiveProvider';

const LABEL = {
  connecting: { text: 'Connecting…', title: 'Joining the live feed.' },
  live: { text: 'Live', title: 'Numbers and the feed update by themselves as things happen in the app.' },
  reconnecting: { text: 'Reconnecting…', title: 'Lost the live connection. Retrying; numbers are still re-checked every minute.' },
  unavailable: { text: 'Live off', title: 'The live feed needs migration 091 on the database. Everything else works as before.' },
} as const;

/** "Live" / "Reconnecting…" in the top bar. */
export function LiveIndicator() {
  const live = useLive();
  if (!live) return null;
  const l = LABEL[live.status];
  return (
    <span className={`chip live-chip live-${live.status}`} title={l.title} role="status" aria-live="polite">
      <span className="live-dot" aria-hidden="true" /> {l.text}
    </span>
  );
}
