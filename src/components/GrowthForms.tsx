'use client';

import { useActionState, useEffect, useId, useRef } from 'react';
import { addFollowUp, finishFollowUp } from '@/lib/growth-actions';

function Result({ state }: { state: { ok: boolean; message: string } | null }) {
  if (!state) return null;
  return (
    <p className={state.ok ? 'confirm-done' : 'confirm-error'} role={state.ok ? 'status' : 'alert'}>
      {state.message}
    </p>
  );
}

/** A follow-up for a member of staff, optionally about one person. */
export function FollowUpForm({ staff, me, userId }: { staff: { id: string; name: string }[]; me: string; userId?: string }) {
  const [state, formAction, pending] = useActionState(addFollowUp, null);
  const ref = useRef<HTMLFormElement>(null);
  const id = useId();
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form action={formAction} ref={ref} className="reply">
      {userId ? <input type="hidden" name="userId" value={userId} /> : null}
      <label className="sr-only" htmlFor={`${id}-title`}>
        What needs doing
      </label>
      <input id={`${id}-title`} name="title" className="field" maxLength={200} required placeholder="What needs doing? e.g. Call about the stuck withdrawal" />
      <label className="sr-only" htmlFor={`${id}-detail`}>
        Details
      </label>
      <textarea id={`${id}-detail`} name="detail" className="field textarea" rows={2} maxLength={2000} placeholder="Details (optional)" />
      <label className="crm-inline" htmlFor={`${id}-due`}>
        <span>Due</span>
        <input id={`${id}-due`} name="due" type="date" className="field crm-date" aria-label="Due date (optional)" />
        <small className="muted">optional</small>
      </label>
      <label className="crm-inline" htmlFor={`${id}-owner`}>
        <span>Give to</span>
        <select id={`${id}-owner`} name="owner" className="field" defaultValue={me}>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.id === me ? ' (me)' : ''}
            </option>
          ))}
        </select>
      </label>
      <Result state={state} />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? 'Adding…' : 'Add follow-up'}
      </button>
    </form>
  );
}

/** Tick a follow-up off, or reopen a finished one. */
export function FinishButton({ taskId, reopen }: { taskId: string; reopen?: boolean }) {
  const [state, formAction, pending] = useActionState(finishFollowUp, null);
  return (
    <form action={formAction}>
      <input type="hidden" name="taskId" value={taskId} />
      {reopen ? <input type="hidden" name="reopen" value="1" /> : null}
      <button type="submit" className="btn" disabled={pending}>
        {pending ? '…' : reopen ? 'Reopen' : 'Mark done'}
      </button>
      {state && !state.ok ? <Result state={state} /> : null}
    </form>
  );
}
