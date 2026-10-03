'use client';

import { useActionState, useEffect, useState, type ChangeEvent, type ReactNode } from 'react';

export type ActionResult = { ok: boolean; message: string } | null;
export type FormAction = (prev: ActionResult, form: FormData) => Promise<ActionResult>;

/**
 * Every button that moves money goes through this: the first click only opens
 * a panel that says, in plain words, exactly what will happen to whose money.
 * Nothing is sent to the server until the second, clearly-labelled button.
 */
export function ConfirmAction({
  action,
  hidden,
  trigger,
  tone = 'primary',
  title,
  consequence,
  field,
  confirmLabel,
}: {
  action: FormAction;
  hidden: Record<string, string>;
  /** The first button. */
  trigger: string;
  tone?: 'primary' | 'danger' | 'quiet';
  title: string;
  /** What happens, to whose money, and whether it can be undone. */
  consequence: ReactNode;
  field?: { name: string; label: string; placeholder?: string; required?: boolean; help?: string; defaultValue?: string; inputMode?: 'text' | 'decimal' | 'numeric' };
  confirmLabel: string;
}) {
  const [open, setOpen] = useState(false);
  // Controlled, because React resets an action form's fields after every submit -- a typed UTR must survive an error.
  const [value, setValue] = useState(field?.defaultValue ?? '');
  const [state, formAction, pending] = useActionState(action, null);

  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  const triggerClass = tone === 'danger' ? 'btn btn-quiet-danger' : tone === 'quiet' ? 'btn' : 'btn btn-primary';

  if (!open) {
    return (
      <div className="confirm-wrap">
        <button type="button" className={triggerClass} onClick={() => setOpen(true)}>
          {trigger}
        </button>
        {state?.ok ? (
          <p className="confirm-done" role="status">
            {state.message}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className={`confirm confirm-${tone === 'danger' ? 'danger' : 'primary'}`}>
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <strong className="confirm-title">{title}</strong>
      <div className="confirm-body">{consequence}</div>
      {field ? (
        <label className="confirm-field">
          <span>{field.label}</span>
          <input
            className="field"
            name={field.name}
            placeholder={field.placeholder}
            required={field.required}
            value={value}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
            inputMode={field.inputMode}
            maxLength={200}
            autoComplete="off"
          />
          {field.help ? <small>{field.help}</small> : null}
        </label>
      ) : null}
      {state && !state.ok ? (
        <p className="confirm-error" role="alert">
          {state.message}
        </p>
      ) : null}
      <div className="confirm-actions">
        <button type="button" className="btn" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </button>
        <button type="submit" className={tone === 'danger' ? 'btn btn-danger' : 'btn btn-primary'} disabled={pending}>
          {pending ? 'Saving…' : confirmLabel}
        </button>
      </div>
    </form>
  );
}
