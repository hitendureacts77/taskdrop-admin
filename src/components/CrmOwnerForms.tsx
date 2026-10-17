'use client';

import { useActionState, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { assignOwners } from '@/lib/crm-actions';

type Staff = { id: string; name: string };

function Result({ state }: { state: { ok: boolean; message: string } | null }) {
  if (!state) return null;
  return (
    <p className={state.ok ? 'confirm-done' : 'confirm-error'} role={state.ok ? 'status' : 'alert'}>
      {state.message}
    </p>
  );
}

/** The tick box in a table head: ticks or clears every "ids" box in the same form. */
export function SelectAllBox() {
  return (
    <input
      type="checkbox"
      className="pick"
      aria-label="Select everyone on this page"
      onChange={(e) => {
        const on = e.currentTarget.checked;
        e.currentTarget.form?.querySelectorAll<HTMLInputElement>('input[name="ids"]').forEach((c) => {
          c.checked = on;
        });
      }}
    />
  );
}

/** One tick box per person, named "ids" so the form submits the ticked ones. */
export function PickBox({ id, name }: { id: string; name: string }) {
  return <input type="checkbox" name="ids" value={id} className="pick" aria-label={`Select ${name}`} />;
}

/**
 * Wraps a table of people: tick some, choose who looks after them (or nobody),
 * apply. The table itself is the children, so it stays server-rendered.
 */
export function BulkOwnerForm({ staff, me, children }: { staff: Staff[]; me: string; children: ReactNode }) {
  const [state, formAction, pending] = useActionState(assignOwners, null);
  const [count, setCount] = useState(0);
  const [choice, setChoice] = useState('');
  const ref = useRef<HTMLFormElement>(null);
  const id = useId();

  // React empties an action form once it has been submitted, ticks included.
  useEffect(() => {
    if (state) setCount(0);
  }, [state]);

  const recount = () => setCount(ref.current?.querySelectorAll('input[name="ids"]:checked').length ?? 0);

  return (
    <form action={formAction} ref={ref} onChange={recount}>
      {children}
      <div className="bulk-bar">
        <strong>{count ? `${count.toLocaleString('en-IN')} selected` : 'Tick people to change who looks after them'}</strong>
        <input type="hidden" name="owner" value={choice === 'none' ? '' : choice} />
        <label className="sr-only" htmlFor={`${id}-owner`}>
          Who should look after them
        </label>
        <select id={`${id}-owner`} className="field bulk-select" value={choice} onChange={(e) => setChoice(e.target.value)}>
          <option value="" disabled>
            Choose an owner…
          </option>
          <option value="none">No owner</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.id === me ? ' (me)' : ''}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary btn-small" disabled={pending || !count || !choice}>
          {pending ? 'Saving…' : 'Apply'}
        </button>
        <Result state={state} />
      </div>
    </form>
  );
}

/** Who looks after one person, on their page. */
export function OwnerForm({ userId, current, staff }: { userId: string; current: string | null; staff: Staff[] }) {
  const [state, formAction, pending] = useActionState(assignOwners, null);
  const id = useId();
  return (
    <form action={formAction} className="reply">
      <input type="hidden" name="ids" value={userId} />
      <label className="sr-only" htmlFor={`${id}-owner`}>
        Who looks after this person
      </label>
      <select id={`${id}-owner`} name="owner" className="field" defaultValue={current ?? ''} key={current ?? 'none'}>
        <option value="">No owner</option>
        {staff.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <Result state={state} />
      <button type="submit" className="btn btn-small" disabled={pending}>
        {pending ? 'Saving…' : 'Save'}
      </button>
    </form>
  );
}
