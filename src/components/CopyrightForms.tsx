'use client';

import { useActionState, useEffect, useId, useRef } from 'react';
import { logNotice } from '@/lib/copyright-actions';

/**
 * Log a copyright notice that arrived at the designated agent's address.
 * Copy it in as received; checking it has the six parts comes next.
 */
export function LogNoticeForm() {
  const [state, formAction, pending] = useActionState(logNotice, null);
  const ref = useRef<HTMLFormElement>(null);
  const id = useId();
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form action={formAction} ref={ref} className="reply">
      <label className="confirm-field" htmlFor={`${id}-who`}>
        <span>Who sent it</span>
        <input id={`${id}-who`} name="complainant" className="field" maxLength={200} required autoComplete="off" placeholder="Name, and the company they act for" />
      </label>
      <label className="confirm-field" htmlFor={`${id}-email`}>
        <span>Their email</span>
        <input id={`${id}-email`} name="email" type="email" className="field" maxLength={200} required autoComplete="off" />
      </label>
      <label className="confirm-field" htmlFor={`${id}-work`}>
        <span>Their copyrighted work</span>
        <textarea id={`${id}-work`} name="work" className="field textarea" rows={2} maxLength={2000} required placeholder="What it is, and where the original is" />
      </label>
      <label className="confirm-field" htmlFor={`${id}-material`}>
        <span>Where it is on TaskDrop, in their words</span>
        <textarea id={`${id}-material`} name="material" className="field textarea" rows={2} maxLength={2000} required />
      </label>
      <label className="confirm-field" htmlFor={`${id}-job`}>
        <span>The job it is on</span>
        <input id={`${id}-job`} name="job" className="field" maxLength={300} autoComplete="off" placeholder="Paste the job link or id" />
        <small>Needed to take down a job’s photo or post. The person who posted it is filled in from the job.</small>
      </label>
      <label className="confirm-field" htmlFor={`${id}-person`}>
        <span>Or the person, for a profile photo</span>
        <input id={`${id}-person`} name="person" className="field" maxLength={300} autoComplete="off" placeholder="Paste their People page link or id" />
      </label>
      {state ? (
        <p className={state.ok ? 'confirm-done' : 'confirm-error'} role={state.ok ? 'status' : 'alert'}>
          {state.message}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? 'Saving…' : 'Log notice'}
      </button>
    </form>
  );
}
