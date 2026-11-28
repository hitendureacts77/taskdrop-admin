'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';
import type { FormAction } from '@/components/ConfirmAction';
import { useV2 } from '../V2Frame';
import { lockReason } from '../roles';

/** Reply box for one help request (v2): 4,000 characters with a counter; sends with today's reply action. */
export function ReplyBoxV2({ action, ticketId }: { action: FormAction; ticketId: string }) {
  const { role } = useV2();
  const locked = lockReason(role, 'people');
  const [state, formAction, pending] = useActionState(action, null);
  const [len, setLen] = useState(0);
  const ref = useRef<HTMLFormElement>(null);
  const id = useId();
  useEffect(() => {
    if (state?.ok) {
      ref.current?.reset();
      setLen(0);
    }
  }, [state]);
  return (
    <form action={formAction} ref={ref} className="wp5-form">
      <input type="hidden" name="ticketId" value={ticketId} />
      <label htmlFor={`${id}-body`} className="sr-only">
        Your reply
      </label>
      <textarea
        id={`${id}-body`}
        name="body"
        rows={4}
        maxLength={4000}
        required
        placeholder="Write your reply…"
        disabled={Boolean(locked)}
        onChange={(e) => setLen(e.target.value.length)}
      />
      <div className="wp5-hint">{len.toLocaleString('en-IN')}/4,000</div>
      {state ? (
        <p className={state.ok ? 'wp5-ok' : 'wp5-err'} role={state.ok ? 'status' : 'alert'}>
          {state.message}
        </p>
      ) : null}
      <button type="submit" className="v2-btn pri sm" disabled={pending || Boolean(locked)} title={locked ?? undefined}>
        {pending ? 'Sending…' : 'Send reply'}
      </button>
    </form>
  );
}
