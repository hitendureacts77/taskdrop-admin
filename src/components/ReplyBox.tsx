'use client';

import { useActionState, useEffect, useRef } from 'react';
import type { FormAction } from './ConfirmAction';

export function ReplyBox({ action, ticketId }: { action: FormAction; ticketId: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form action={formAction} ref={ref} className="reply">
      <input type="hidden" name="ticketId" value={ticketId} />
      <label className="sr-only" htmlFor="reply-body">
        Your reply
      </label>
      <textarea id="reply-body" name="body" className="field textarea" rows={5} maxLength={4000} required placeholder="Write your reply…" />
      {state ? (
        <p className={state.ok ? 'confirm-done' : 'confirm-error'} role={state.ok ? 'status' : 'alert'}>
          {state.message}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? 'Sending…' : 'Send reply'}
      </button>
    </form>
  );
}
