'use client';

import { useState } from 'react';
import { Icon } from './Icon';

/** Copies a UPI id, account number or IFSC so nobody retypes a digit wrong. */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-small btn-ghost"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          // Clipboard blocked (non-https or permissions): select-and-copy still works on the text itself.
        }
      }}
      aria-label={`Copy ${label}`}
    >
      <Icon name={done ? 'check' : 'copy'} size={14} />
      {done ? 'Copied' : 'Copy'}
    </button>
  );
}
