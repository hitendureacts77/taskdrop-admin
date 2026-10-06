'use client';

import { useState } from 'react';
import { Icon } from './Icon';

/** The old way, for when the Clipboard API is blocked (http, iframes, permissions). */
function copyByHand(value: string): boolean {
  const el = document.createElement('textarea');
  el.value = value;
  el.setAttribute('readonly', '');
  el.style.position = 'fixed';
  el.style.opacity = '0';
  document.body.appendChild(el);
  el.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  el.remove();
  return ok;
}

/** Copies a UPI id, account number or IFSC so nobody retypes a digit wrong. */
export function CopyButton({ value, label, compact }: { value: string; label: string; compact?: boolean }) {
  const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle');
  const flash = (s: 'done' | 'failed') => {
    setState(s);
    setTimeout(() => setState('idle'), 1800);
  };
  return (
    <button
      type="button"
      className={`btn btn-small btn-ghost${compact ? ' btn-icon' : ''}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          flash('done');
        } catch {
          flash(copyByHand(value) ? 'done' : 'failed');
        }
      }}
      aria-label={`Copy ${label}`}
      title={state === 'failed' ? 'Your browser blocked copying. Select the text and press Ctrl+C.' : `Copy ${label}`}
    >
      <Icon name={state === 'done' ? 'check' : 'copy'} size={14} />
      {compact ? null : state === 'done' ? 'Copied' : state === 'failed' ? 'Select it and press Ctrl+C' : 'Copy'}
    </button>
  );
}
