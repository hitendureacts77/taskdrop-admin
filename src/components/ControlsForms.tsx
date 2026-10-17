'use client';

import { useActionState, useId } from 'react';
import { setControlText } from '@/lib/controls-actions';

function Result({ state }: { state: { ok: boolean; message: string } | null }) {
  if (!state) return null;
  return (
    <p className={state.ok ? 'confirm-done' : 'confirm-error'} role={state.ok ? 'status' : 'alert'}>
      {state.message}
    </p>
  );
}

type Values = {
  maintenance_message: string;
  min_version: string;
  update_url: string;
  banner_text: string;
  banner_level: string;
  banner_link: string;
  banner_ends_at: string;
};

/** The wording and version controls for one platform. Clearing a box and saving clears that control. */
export function ControlTextForm({ platform, label, values }: { platform: string; label: string; values: Values }) {
  const [state, formAction, pending] = useActionState(setControlText, null);
  const id = useId();
  return (
    <form action={formAction} className="reply">
      <input type="hidden" name="platform" value={platform} />
      <strong>{label}</strong>
      <label htmlFor={`${id}-mm`} className="muted small">
        Message shown while it is down for maintenance
      </label>
      <input id={`${id}-mm`} name="maintenance_message" className="field" maxLength={500} defaultValue={values.maintenance_message} placeholder="We’ll be back soon." />
      <label htmlFor={`${id}-mv`} className="muted small">
        Oldest app version still allowed (for example 1.4.0). Older apps are asked to update.
      </label>
      <input id={`${id}-mv`} name="min_version" className="field" maxLength={20} defaultValue={values.min_version} placeholder="No minimum" inputMode="decimal" />
      <label htmlFor={`${id}-uu`} className="muted small">
        Where people go to update (a link starting with https://)
      </label>
      <input id={`${id}-uu`} name="update_url" className="field" maxLength={500} defaultValue={values.update_url} placeholder="https://…" />
      <label htmlFor={`${id}-bt`} className="muted small">
        Banner shown at the top of the app
      </label>
      <input id={`${id}-bt`} name="banner_text" className="field" maxLength={300} defaultValue={values.banner_text} placeholder="No banner" />
      <label className="crm-inline" htmlFor={`${id}-bl`}>
        <span>Look</span>
        <select id={`${id}-bl`} name="banner_level" className="field" defaultValue={values.banner_level || 'info'}>
          <option value="info">Information</option>
          <option value="warning">Warning</option>
          <option value="critical">Serious</option>
        </select>
      </label>
      <label htmlFor={`${id}-blk`} className="muted small">
        Banner link (optional, starting with https://)
      </label>
      <input id={`${id}-blk`} name="banner_link" className="field" maxLength={500} defaultValue={values.banner_link} placeholder="https://…" />
      <label className="crm-inline" htmlFor={`${id}-be`}>
        <span>Banner ends</span>
        <input id={`${id}-be`} name="banner_ends_at" type="date" className="field crm-date" defaultValue={values.banner_ends_at} />
        <small className="muted">optional</small>
      </label>
      <Result state={state} />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? 'Saving…' : `Save for ${label}`}
      </button>
    </form>
  );
}
