'use client';

import { useActionState, useEffect, useId, useRef } from 'react';
import { Icon } from '@/components/Icon';
import { lockReason } from '@/components/v2/roles';
import { useV2 } from '@/components/v2/V2Frame';
import { RULE_KINDS } from '@/lib/crm-calc';
import { saveRule } from '@/lib/rules-actions';

/**
 * "Add a rule" side card form (F423). Same server action as today (saveRule:
 * requireAdmin + staff role check + admin_save_crm_rule). A new rule starts
 * switched off. Quick action (tier 1): it changes nothing for customers until
 * someone turns the rule on, which asks to confirm.
 */
export function RuleAddV2() {
  const { role } = useV2();
  const locked = lockReason(role, 'admin');
  const [state, formAction, pending] = useActionState(saveRule, null);
  const ref = useRef<HTMLFormElement>(null);
  const id = useId();
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form action={formAction} ref={ref} className="wp8b-form">
      <input type="hidden" name="enabled" value="false" />
      <label htmlFor={`${id}-name`}>Name</label>
      <input id={`${id}-name`} name="name" maxLength={120} required placeholder="e.g. Paid in but has not posted" autoComplete="off" disabled={Boolean(locked)} />
      <label htmlFor={`${id}-kind`}>When</label>
      <select id={`${id}-kind`} name="kind" defaultValue="funded_no_task" disabled={Boolean(locked)}>
        {RULE_KINDS.map((k) => (
          <option key={k.key} value={k.key}>
            {k.label}
          </option>
        ))}
      </select>
      <label htmlFor={`${id}-days`}>Days (1 to 90)</label>
      <input id={`${id}-days`} name="days" type="number" inputMode="numeric" min={1} max={90} step={1} required defaultValue={7} disabled={Boolean(locked)} />
      <div className="wp8b-form-foot">
        <button type="submit" className="v2-btn pri sm" disabled={pending || Boolean(locked)} title={locked ?? undefined}>
          <Icon name={locked ? 'lock' : 'check'} size={14} />
          {pending ? 'Adding…' : 'Add rule'}
        </button>
        {state ? (
          <span className={state.ok ? 'wp8b-ok' : 'wp8b-err'} role={state.ok ? 'status' : 'alert'}>
            {state.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
