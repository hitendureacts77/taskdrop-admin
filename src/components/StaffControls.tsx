'use client';

import Link from 'next/link';
import { useActionState, useState, type ChangeEvent } from 'react';
import type { FormAction } from './ConfirmAction';
import { STAFF_ROLES, type StaffRole } from '@/lib/staff-roles';

/** A role dropdown that saves when you press Save. Changing a role asks for the authenticator code (database-side). */
export function StaffRoleForm({ userId, role, name, action }: { userId: string; role: StaffRole; name: string; action: FormAction }) {
  const [picked, setPicked] = useState<string>(role);
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="staff-role-form">
      <input type="hidden" name="userId" value={userId} />
      <select
        className="field field-compact"
        name="role"
        value={picked}
        aria-label={`Role for ${name}`}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => setPicked(e.target.value)}
        disabled={pending}
      >
        {STAFF_ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      {picked !== role ? (
        <button type="submit" className="btn btn-small btn-primary" disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </button>
      ) : null}
      {state && !state.ok ? (
        <span className="staff-msg bad" role="alert">
          {state.message}
          {/Security page/i.test(state.message) ? (
            <>
              {' '}
              <Link href="/security">Open Security</Link>
            </>
          ) : null}
        </span>
      ) : null}
    </form>
  );
}

/** Staff alerts on/off. Saves straight away; it only changes who gets a notification. */
export function NotifyToggle({ userId, role, on, name, action, disabled }: { userId: string; role: StaffRole; on: boolean; name: string; action: FormAction; disabled?: boolean }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="staff-notify">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="role" value={role} />
      <input type="hidden" name="on" value={String(!on)} />
      <button
        type="submit"
        role="switch"
        aria-checked={on}
        aria-label={`Staff alerts for ${name}`}
        title={disabled ? 'Only a full Admin can change someone else’s alerts' : on ? 'Alerts on: tap to turn off' : 'Alerts off: tap to turn on'}
        className="switch"
        disabled={pending || disabled}
      >
        <span className="switch-knob" aria-hidden="true" />
      </button>
      {state && !state.ok ? (
        <span className="staff-msg bad" role="alert">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
