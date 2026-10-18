'use client';

import { useActionState, useEffect, useId, useRef } from 'react';
import { RULE_KINDS } from '@/lib/crm-calc';
import { saveRule } from '@/lib/rules-actions';

function Result({ state }: { state: { ok: boolean; message: string } | null }) {
  if (!state) return null;
  return (
    <p className={state.ok ? 'confirm-done' : 'confirm-error'} role={state.ok ? 'status' : 'alert'}>
      {state.message}
    </p>
  );
}

/**
 * Add a rule, or edit one (pass `rule`). Saving a rule never switches it on:
 * a new rule starts off, and an edited one keeps the on/off state it has.
 */
export function RuleForm({ rule }: { rule?: { id: string; name: string; kind: string; days: number; enabled: boolean } }) {
  const [state, formAction, pending] = useActionState(saveRule, null);
  const ref = useRef<HTMLFormElement>(null);
  const id = useId();
  useEffect(() => {
    if (state?.ok && !rule) ref.current?.reset();
  }, [state, rule]);
  return (
    <form action={formAction} ref={ref} className="lead-form">
      {rule ? <input type="hidden" name="id" value={rule.id} /> : null}
      <input type="hidden" name="enabled" value={rule?.enabled ? 'true' : 'false'} />
      <label className="confirm-field lead-note" htmlFor={`${id}-name`}>
        <span>Name</span>
        <input id={`${id}-name`} name="name" className="field" maxLength={120} required defaultValue={rule?.name ?? ''} placeholder="e.g. Topped up but has not posted a job" autoComplete="off" />
      </label>
      <label className="confirm-field" htmlFor={`${id}-kind`}>
        <span>When</span>
        <select id={`${id}-kind`} name="kind" className="field" defaultValue={rule?.kind ?? 'funded_no_task'}>
          {RULE_KINDS.map((k) => (
            <option key={k.key} value={k.key}>
              {k.label}
            </option>
          ))}
        </select>
      </label>
      <label className="confirm-field" htmlFor={`${id}-days`}>
        <span>Days (1 to 90)</span>
        <input id={`${id}-days`} name="days" type="number" inputMode="numeric" min={1} max={90} step={1} required className="field" defaultValue={rule?.days ?? 7} />
      </label>
      <span className="lead-save">
        <button type="submit" className="btn btn-small btn-primary" disabled={pending}>
          {pending ? 'Saving…' : rule ? 'Save changes' : 'Add rule'}
        </button>
        <Result state={state} />
      </span>
    </form>
  );
}
