'use client';

import { useActionState, useEffect, useId, useRef, useState, useTransition, type ReactNode } from 'react';
import type { ActionResult, FormAction } from '@/components/ConfirmAction';
import { Icon } from '@/components/Icon';
import { lockReason, wordMatches, type V2Area } from './roles';
import { useV2 } from './V2Frame';

/**
 * Every v2 button that changes something (design: act()). No authenticator codes.
 *
 *   tier 1  Quick: runs at once, toast with optional Undo (tags, owner, follow-ups).
 *   tier 2  Check and confirm: a box says what happens to whose money; optional reason box.
 *   tier 3  Type to confirm: as tier 2, then type a word or the amount (e.g. 1470, DECIDE).
 *
 * The box always shows STAGING or PRODUCTION. A role that may not act sees the
 * button locked, with the reason on hover (roles.ts). The server action still
 * checks the role and everything else: this is only the front door.
 *
 * The action is a normal FormAction (same type as today's ConfirmAction): it
 * receives `hidden`, `reason` (when asked) and any `fields` inputs in FormData.
 */
export type ConfirmProps = {
  action: FormAction;
  hidden?: Record<string, string>;
  /** The button text. */
  label: ReactNode;
  tier: 1 | 2 | 3;
  area: V2Area;
  tone?: 'pri' | 'danger' | 'warn' | 'earn' | 'plain';
  small?: boolean;
  /** Box title, e.g. "Pay ₹1,470 to Ravi?" (tiers 2 and 3). */
  title?: string;
  /** What happens, to whose money, and whether it can be undone. */
  body?: ReactNode;
  /** Ask for a reason (sent as `reason`). Required unless optional is set. */
  reason?: { label?: string; placeholder?: string; optional?: boolean; minLength?: number };
  /** Tier 3: the word or amount to type. */
  word?: string;
  /** Extra inputs inside the form (selects, amounts). Give them a name. */
  fields?: ReactNode;
  confirmLabel?: string;
  /** Tier 1: an action that undoes it, offered in the toast. */
  undo?: { action: FormAction; hidden?: Record<string, string> };
  /** Show the button as an on/off switch in this state. */
  asSwitch?: { on: boolean; red?: boolean };
};

const TONE_CLASS = { pri: 'v2-btn pri', danger: 'v2-btn danger', warn: 'v2-btn warn', earn: 'v2-btn earn', plain: 'v2-btn' } as const;

function Toast({ result, onUndo, onClose }: { result: { ok: boolean; message: string }; onUndo?: () => void; onClose: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onClose, 6000);
    return () => window.clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`v2-toast${result.ok ? '' : ' bad'}`} role="status" aria-live="polite">
      <span>{result.message}</span>
      {result.ok && onUndo ? (
        <button type="button" onClick={onUndo}>
          Undo
        </button>
      ) : null}
      <button type="button" onClick={onClose} aria-label="Close">
        ×
      </button>
    </div>
  );
}

export function Confirm(p: ConfirmProps) {
  const { role, env } = useV2();
  const locked = lockReason(role, p.area);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [toast, setToast] = useState<{ ok: boolean; message: string } | null>(null);
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(p.action, null);
  const [undoPending, startUndo] = useTransition();
  const firstField = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const titleId = useId();
  const lastState = useRef<ActionResult>(null);

  useEffect(() => {
    if (!state || state === lastState.current) return;
    lastState.current = state;
    if (state.ok) {
      setOpen(false);
      setTyped('');
      setToast(state);
    } else if (p.tier === 1) {
      setToast(state);
    }
  }, [state, p.tier]);

  useEffect(() => {
    if (!open) return;
    firstField.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !pending && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, pending]);

  const btnClass = `${TONE_CLASS[p.tone ?? (p.tier === 1 ? 'plain' : 'pri')]}${p.small ? ' sm' : ''}`;
  const hiddenInputs = Object.entries(p.hidden ?? {}).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />);
  const wordOk = p.tier !== 3 || (p.word ? wordMatches(typed, p.word) : false);

  const runUndo = () => {
    const undo = p.undo;
    if (!undo) return;
    const fd = new FormData();
    for (const [k, v] of Object.entries(undo.hidden ?? {})) fd.set(k, v);
    startUndo(async () => {
      const r = await undo.action(null, fd);
      setToast(r ?? { ok: true, message: 'Undone.' });
    });
  };

  const trigger = p.asSwitch ? (
    <button
      type={p.tier === 1 ? 'submit' : 'button'}
      role="switch"
      aria-checked={p.asSwitch.on}
      aria-label={typeof p.label === 'string' ? p.label : undefined}
      title={locked ?? (typeof p.label === 'string' ? p.label : undefined)}
      className={`v2-tg${p.asSwitch.red ? ' red' : ''}`}
      disabled={Boolean(locked) || pending}
      onClick={p.tier === 1 ? undefined : () => setOpen(true)}
    />
  ) : (
    <button
      type={p.tier === 1 ? 'submit' : 'button'}
      className={btnClass}
      disabled={Boolean(locked) || pending}
      title={locked ?? undefined}
      aria-disabled={locked ? true : undefined}
      onClick={p.tier === 1 ? undefined : () => setOpen(true)}
    >
      {locked ? <Icon name="lock" size={14} /> : null}
      {p.label}
    </button>
  );

  return (
    <>
      {p.tier === 1 ? (
        <form action={formAction} className="v2-inline-form">
          {hiddenInputs}
          {trigger}
        </form>
      ) : (
        trigger
      )}

      {open && p.tier !== 1 ? (
        <div className="v2-scrim" onMouseDown={(e) => e.target === e.currentTarget && !pending && setOpen(false)}>
          <div className="v2-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <form action={formAction}>
              {hiddenInputs}
              <div className="mh">
                <div>
                  <div className="tier">{p.tier === 2 ? 'Check and confirm' : 'Type to confirm'}</div>
                  <h2 id={titleId}>{p.title ?? p.label}</h2>
                </div>
              </div>
              <div className="mb">
                {p.body}
                <div className={`envl ${env === 'production' ? 'prd' : 'stg'}`}>
                  {env === 'production' ? 'PRODUCTION: real people and real money' : 'STAGING: fake money and fake data'}
                </div>
                {p.fields}
                {p.reason ? (
                  <>
                    <label htmlFor={`${titleId}-reason`}>{p.reason.label ?? 'Reason (saved in the audit log)'}</label>
                    <textarea
                      id={`${titleId}-reason`}
                      name="reason"
                      rows={2}
                      required={!p.reason.optional}
                      minLength={p.reason.minLength ?? (p.reason.optional ? undefined : 3)}
                      maxLength={500}
                      placeholder={p.reason.placeholder}
                      ref={(el) => {
                        if (!firstField.current) firstField.current = el;
                      }}
                    />
                  </>
                ) : null}
                {p.tier === 3 && p.word ? (
                  <>
                    <label htmlFor={`${titleId}-word`}>
                      Type <b>{p.word}</b> to confirm
                    </label>
                    <input
                      id={`${titleId}-word`}
                      className="word"
                      name="confirm_word"
                      autoComplete="off"
                      value={typed}
                      onChange={(e) => setTyped(e.target.value)}
                      ref={(el) => {
                        if (!p.reason && el) firstField.current = el;
                      }}
                    />
                  </>
                ) : null}
                <p className="err" role="alert">
                  {state && !state.ok ? state.message : ''}
                </p>
              </div>
              <div className="mf">
                <button type="button" className="v2-btn" onClick={() => setOpen(false)} disabled={pending}>
                  Cancel
                </button>
                <button type="submit" className={TONE_CLASS[p.tone ?? 'pri']} disabled={pending || !wordOk}>
                  {pending ? 'Working…' : (p.confirmLabel ?? 'Confirm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {toast ? <Toast result={toast} onUndo={p.undo && !undoPending ? runUndo : undefined} onClose={() => setToast(null)} /> : null}
    </>
  );
}
