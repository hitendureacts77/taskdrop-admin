'use client';

import type { ComponentProps } from 'react';
import type { ConfirmAction } from '@/components/ConfirmAction';
import { Confirm } from '@/components/v2/Confirm';
import type { V2Area } from '@/components/v2/roles';

/** Today's ConfirmAction props, plus how the v2 box should ask (tier, word to type, who may act). */
export type MoneyConfirmProps = ComponentProps<typeof ConfirmAction> & { v2?: { tier?: 2 | 3; word?: string; area?: V2Area } };

/**
 * Admin v2 stand-in for ConfirmAction on the money pages: the same server action, hidden values and input
 * field, shown in the foundation's Confirm box (tier 2 check and confirm, or tier 3 type the amount).
 * The server action still checks the role, the MFA gate and the input; this is only the front door.
 */
export function MoneyConfirm(p: MoneyConfirmProps) {
  const tier = p.v2?.tier ?? (p.v2?.word ? 3 : 2);
  const f = p.field;
  const c = p.choice;
  const fields =
    f || c ? (
      <div className="v2-fields">
        {c ? (
          <label className="v2-field">
            <span>{c.label}</span>
            <select name={c.name} defaultValue={c.defaultValue}>
              {c.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {c.help ? <small className="v2-muted">{c.help}</small> : null}
          </label>
        ) : null}
        {f ? (
          <label className="v2-field">
            <span>{f.label}</span>
            <input
              name={f.name}
              placeholder={f.placeholder}
              required={f.required}
              defaultValue={f.defaultValue}
              inputMode={f.inputMode}
              pattern={f.pattern}
              title={f.title}
              autoComplete="off"
              maxLength={160}
            />
            {f.help ? <small className="v2-muted">{f.help}</small> : null}
          </label>
        ) : null}
      </div>
    ) : undefined;
  return (
    <Confirm
      action={p.action}
      hidden={p.hidden}
      label={p.trigger}
      tier={tier}
      area={p.v2?.area ?? 'money'}
      tone={p.tone === 'danger' ? 'danger' : p.tone === 'quiet' ? 'plain' : 'pri'}
      title={p.title}
      body={<p>{p.consequence}</p>}
      fields={fields}
      word={tier === 3 ? p.v2?.word : undefined}
      confirmLabel={p.confirmLabel}
      asSwitch={p.asSwitch ? { on: p.asSwitch.on } : undefined}
    />
  );
}
