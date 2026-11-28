'use client';

import { useActionState, useEffect, useId, useRef } from 'react';
import { logNotice } from '@/lib/copyright-actions';
import { useV2 } from '../V2Frame';
import { lockReason } from '../roles';

/** Log a copyright notice (v2 look). Same fields and server action as today's form. */
export function LogNoticeFormV2() {
  const { role } = useV2();
  const locked = lockReason(role, 'people');
  const [state, formAction, pending] = useActionState(logNotice, null);
  const ref = useRef<HTMLFormElement>(null);
  const id = useId();
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form action={formAction} ref={ref} className="wp5-form">
      <label htmlFor={`${id}-who`}>Who sent it</label>
      <input id={`${id}-who`} name="complainant" maxLength={200} required autoComplete="off" placeholder="Name, and the company they act for" />
      <label htmlFor={`${id}-email`}>Their email</label>
      <input id={`${id}-email`} name="email" type="email" maxLength={200} required autoComplete="off" />
      <label htmlFor={`${id}-work`}>Their copyrighted work</label>
      <textarea id={`${id}-work`} name="work" rows={2} maxLength={2000} required placeholder="What it is, and where the original is" />
      <label htmlFor={`${id}-material`}>Where it is on TaskDrop, in their words</label>
      <textarea id={`${id}-material`} name="material" rows={2} maxLength={2000} required />
      <label htmlFor={`${id}-job`}>The job it is on</label>
      <input id={`${id}-job`} name="job" maxLength={300} autoComplete="off" placeholder="Paste the job link or id" />
      <div className="wp5-hint">Needed to take down a job’s photo or post. The person who posted it is filled in from the job.</div>
      <label htmlFor={`${id}-person`}>Or the person, for a profile photo</label>
      <input id={`${id}-person`} name="person" maxLength={300} autoComplete="off" placeholder="Paste their People page link or id" />
      {state ? (
        <p className={state.ok ? 'wp5-ok' : 'wp5-err'} role={state.ok ? 'status' : 'alert'}>
          {state.message}
        </p>
      ) : null}
      <button type="submit" className="v2-btn pri sm" disabled={pending || Boolean(locked)} title={locked ?? undefined}>
        {pending ? 'Saving…' : 'Log notice'}
      </button>
    </form>
  );
}
