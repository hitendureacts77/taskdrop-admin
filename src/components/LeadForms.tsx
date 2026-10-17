'use client';

import { useActionState, useEffect, useId, useRef } from 'react';
import { LEAD_KINDS, LEAD_STAGES } from '@/lib/crm-calc';
import { addLead, updateLead } from '@/lib/leads-actions';

type Staff = { id: string; name: string };

function Result({ state }: { state: { ok: boolean; message: string } | null }) {
  if (!state) return null;
  return (
    <p className={state.ok ? 'confirm-done' : 'confirm-error'} role={state.ok ? 'status' : 'alert'}>
      {state.message}
    </p>
  );
}

/** Add someone who is not in the app yet. Only the name is needed. */
export function AddLeadForm({ staff, me }: { staff: Staff[]; me: string }) {
  const [state, formAction, pending] = useActionState(addLead, null);
  const ref = useRef<HTMLFormElement>(null);
  const id = useId();
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form action={formAction} ref={ref} className="reply">
      <label className="sr-only" htmlFor={`${id}-name`}>
        Name
      </label>
      <input id={`${id}-name`} name="name" className="field" maxLength={120} required placeholder="Name, e.g. Sharma Tiffin Service" autoComplete="off" />
      <label className="sr-only" htmlFor={`${id}-contact`}>
        Phone, email or link
      </label>
      <input id={`${id}-contact`} name="contact" className="field" maxLength={200} placeholder="Phone, email or link (optional)" autoComplete="off" />
      <label className="crm-inline" htmlFor={`${id}-kind`}>
        <span>Is a</span>
        <select id={`${id}-kind`} name="kind" className="field" defaultValue="business">
          {LEAD_KINDS.map((k) => (
            <option key={k.key} value={k.key}>
              {k.label}
            </option>
          ))}
        </select>
      </label>
      <label className="sr-only" htmlFor={`${id}-source`}>
        Where you found them
      </label>
      <input id={`${id}-source`} name="source" className="field" maxLength={120} placeholder="Where you found them (optional)" autoComplete="off" />
      <label className="sr-only" htmlFor={`${id}-note`}>
        Note
      </label>
      <textarea id={`${id}-note`} name="note" className="field textarea" rows={2} maxLength={2000} placeholder="Note (optional)" />
      <label className="crm-inline" htmlFor={`${id}-owner`}>
        <span>Looked after by</span>
        <select id={`${id}-owner`} name="owner" className="field" defaultValue={me}>
          <option value="">Nobody yet</option>
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
        {pending ? 'Adding…' : 'Add lead'}
      </button>
    </form>
  );
}

/** Stage, owner and note for one lead, saved together. */
export function LeadEditForm({ leadId, stage, ownerId, note, staff, me }: { leadId: string; stage: string; ownerId: string | null; note: string | null; staff: Staff[]; me: string }) {
  const [state, formAction, pending] = useActionState(updateLead, null);
  const id = useId();
  return (
    <form action={formAction} className="lead-form">
      <input type="hidden" name="leadId" value={leadId} />
      <label className="confirm-field" htmlFor={`${id}-stage`}>
        <span>Stage</span>
        <select id={`${id}-stage`} name="stage" className="field" defaultValue={stage}>
          {LEAD_STAGES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label className="confirm-field" htmlFor={`${id}-owner`}>
        <span>Looked after by</span>
        <select id={`${id}-owner`} name="owner" className="field" defaultValue={ownerId ?? ''}>
          <option value="">Nobody</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.id === me ? ' (me)' : ''}
            </option>
          ))}
        </select>
      </label>
      <label className="confirm-field lead-note" htmlFor={`${id}-note`}>
        <span>Note</span>
        <textarea id={`${id}-note`} name="note" className="field textarea" rows={2} maxLength={2000} defaultValue={note ?? ''} placeholder="What was said, what happens next" />
      </label>
      <span className="lead-save">
        <button type="submit" className="btn btn-small btn-primary" disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </button>
        <Result state={state} />
      </span>
    </form>
  );
}
