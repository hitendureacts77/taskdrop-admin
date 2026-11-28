'use client';

/**
 * v2 forms for the Customers pages (WP6). They call today's server actions,
 * which re-check the admin, the staff role and write the audit line; nothing
 * here decides who may act (the locked state only mirrors roles.ts).
 */
import { useActionState, useEffect, useId, useRef, useState } from 'react';
import type { ActionResult } from '@/components/ConfirmAction';
import { Confirm } from '@/components/v2/Confirm';
import { useV2 } from '@/components/v2/V2Frame';
import { lockReason } from '@/components/v2/roles';
import { assignOwners, saveSegment, sendBroadcast } from '@/lib/crm-actions';
import { LEAD_KINDS } from '@/lib/crm-calc';
import { addFollowUp } from '@/lib/growth-actions';
import { addLead } from '@/lib/leads-actions';

type Staff = { id: string; name: string };

function Result({ state }: { state: ActionResult }) {
  if (!state) return null;
  return (
    <p className={state.ok ? 'wp6-ok' : 'wp6-err'} role={state.ok ? 'status' : 'alert'}>
      {state.message}
    </p>
  );
}

/** The people area (Admin, Support, Sales) may change CRM things; others see why not. */
function useLocked() {
  const { role } = useV2();
  return lockReason(role, 'people');
}

function StaffOptions({ staff, me }: { staff: Staff[]; me: string }) {
  return (
    <>
      {staff.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
          {s.id === me ? ' (me)' : ''}
        </option>
      ))}
    </>
  );
}

// ------------------------------------------------------------ follow-ups --

export function AddFollowUpV2({ staff, me }: { staff: Staff[]; me: string }) {
  const [state, formAction, pending] = useActionState(addFollowUp, null);
  const ref = useRef<HTMLFormElement>(null);
  const id = useId();
  const locked = useLocked();
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form action={formAction} ref={ref} className="wp6-form">
      <label htmlFor={`${id}-t`}>What needs doing</label>
      <input id={`${id}-t`} name="title" maxLength={200} required placeholder="Call about the stuck withdrawal" disabled={Boolean(locked)} />
      <label htmlFor={`${id}-d`}>
        Details <span className="v2-muted">(optional)</span>
      </label>
      <textarea id={`${id}-d`} name="detail" rows={2} maxLength={2000} disabled={Boolean(locked)} />
      <label htmlFor={`${id}-due`}>
        Due <span className="v2-muted">(optional)</span>
      </label>
      <input id={`${id}-due`} name="due" type="date" disabled={Boolean(locked)} />
      <label htmlFor={`${id}-o`}>Give to</label>
      <select id={`${id}-o`} name="owner" defaultValue={me} disabled={Boolean(locked)}>
        <StaffOptions staff={staff} me={me} />
      </select>
      <Result state={state} />
      <button type="submit" className="v2-btn pri sm" disabled={pending || Boolean(locked)} title={locked ?? undefined}>
        {pending ? 'Adding…' : 'Add follow-up'}
      </button>
    </form>
  );
}

// ------------------------------------------------------------------ leads --

export function AddLeadV2({ staff, me }: { staff: Staff[]; me: string }) {
  const [state, formAction, pending] = useActionState(addLead, null);
  const ref = useRef<HTMLFormElement>(null);
  const id = useId();
  const locked = useLocked();
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  const off = Boolean(locked);
  return (
    <form action={formAction} ref={ref} className="wp6-form">
      <label htmlFor={`${id}-n`}>Name</label>
      <input id={`${id}-n`} name="name" maxLength={120} required autoComplete="off" placeholder="e.g. Sharma Tiffin Service" disabled={off} />
      <label htmlFor={`${id}-c`}>
        Phone, email or link <span className="v2-muted">(optional)</span>
      </label>
      <input id={`${id}-c`} name="contact" maxLength={200} autoComplete="off" disabled={off} />
      <label htmlFor={`${id}-k`}>Is a</label>
      <select id={`${id}-k`} name="kind" defaultValue="business" disabled={off}>
        {LEAD_KINDS.map((k) => (
          <option key={k.key} value={k.key}>
            {k.label}
          </option>
        ))}
      </select>
      <label htmlFor={`${id}-s`}>
        Where you found them <span className="v2-muted">(optional)</span>
      </label>
      <input id={`${id}-s`} name="source" maxLength={120} autoComplete="off" placeholder="e.g. Instagram" disabled={off} />
      <label htmlFor={`${id}-note`}>
        Note <span className="v2-muted">(optional)</span>
      </label>
      <textarea id={`${id}-note`} name="note" rows={2} maxLength={2000} disabled={off} />
      <label htmlFor={`${id}-o`}>Looked after by</label>
      <select id={`${id}-o`} name="owner" defaultValue={me} disabled={off}>
        <option value="">No owner</option>
        <StaffOptions staff={staff} me={me} />
      </select>
      <Result state={state} />
      <button type="submit" className="v2-btn pri sm" disabled={pending || off} title={locked ?? undefined}>
        {pending ? 'Adding…' : 'Add lead'}
      </button>
    </form>
  );
}

// --------------------------------------------------------------- segments --

/** Save the filters on screen as a named segment (F349). */
export function SaveSegmentV2({ query }: { query: string }) {
  const [state, formAction, pending] = useActionState(saveSegment, null);
  const ref = useRef<HTMLFormElement>(null);
  const locked = useLocked();
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form action={formAction} ref={ref} className="wp6-inline">
      <input type="hidden" name="query" value={query} />
      <label className="sr-only" htmlFor="wp6-seg-name">
        Segment name
      </label>
      <input id="wp6-seg-name" name="name" maxLength={60} required autoComplete="off" placeholder="Name this segment" disabled={Boolean(locked)} />
      <button type="submit" className="v2-btn sm" disabled={pending || Boolean(locked)} title={locked ?? undefined}>
        {pending ? 'Saving…' : 'Save as a segment'}
      </button>
      <Result state={state} />
    </form>
  );
}

/** Tick box per person, named "ids" so the owner form submits the ticked ones. */
export function PickV2({ id, name }: { id: string; name: string }) {
  return <input type="checkbox" name="ids" value={id} form="wp6-owner-form" className="wp6-pick" aria-label={`Tick ${name}`} />;
}

/** Every person tick box on the page (they sit in the table, outside the form). */
const boxes = () => Array.from(document.querySelectorAll<HTMLInputElement>('input[form="wp6-owner-form"][name="ids"]'));

/**
 * The bar above the matches table (F348): tick everyone on the page, choose an
 * owner (or nobody), apply. The tick boxes in the table join this form through
 * their form="wp6-owner-form" attribute, so the table stays server-rendered.
 */
export function OwnerBarV2({ staff, me }: { staff: Staff[]; me: string }) {
  const [state, formAction, pending] = useActionState(assignOwners, null);
  const [count, setCount] = useState(0);
  const [choice, setChoice] = useState('');
  const id = useId();
  const locked = useLocked();

  useEffect(() => {
    const recount = () => setCount(boxes().filter((b) => b.checked).length);
    document.addEventListener('change', recount);
    return () => document.removeEventListener('change', recount);
  }, []);
  useEffect(() => {
    if (state?.ok) {
      boxes().forEach((b) => (b.checked = false));
      setCount(0);
    }
  }, [state]);

  return (
    <form id="wp6-owner-form" action={formAction} className="wp6-bulk">
      <label className="wp6-check">
        <input
          type="checkbox"
          aria-label="Select everyone on this page"
          disabled={Boolean(locked)}
          onChange={(e) => {
            const on = e.currentTarget.checked;
            boxes().forEach((b) => (b.checked = on));
            setCount(on ? boxes().length : 0);
          }}
        />
        Select everyone on this page
      </label>
      <span className="v2-muted">{count ? `${count.toLocaleString('en-IN')} ticked · look after them:` : 'Look after them:'}</span>
      <input type="hidden" name="owner" value={choice === 'none' ? '' : choice} />
      <label className="sr-only" htmlFor={`${id}-o`}>
        Who should look after them
      </label>
      <select id={`${id}-o`} value={choice} onChange={(e) => setChoice(e.target.value)} disabled={Boolean(locked)}>
        <option value="" disabled>
          Choose an owner…
        </option>
        <option value="none">No owner</option>
        <StaffOptions staff={staff} me={me} />
      </select>
      <button type="submit" className="v2-btn sm" disabled={pending || !count || !choice || Boolean(locked)} title={locked ?? undefined}>
        {pending ? 'Saving…' : 'Apply'}
      </button>
      <Result state={state} />
    </form>
  );
}

// --------------------------------------------------------------- messages --

export type AudienceV2 = { key: string; label: string; group: string; count: number };

/**
 * Write a message (F352-F354). Nothing is sent from this form: "Review and send"
 * opens the confirm box, which says exactly how many people get it. Enter in a
 * box never sends (the boxes are not inside a form).
 */
export function BroadcastV2({ audiences, defaultAudience, filtersQuery }: { audiences: AudienceV2[]; defaultAudience: string; filtersQuery?: string }) {
  const [audience, setAudience] = useState(defaultAudience || audiences[0]?.key || 'all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const id = useId();
  const chosen = audiences.find((a) => a.key === audience);
  const count = chosen?.count ?? 0;
  const groups = [...new Set(audiences.map((a) => a.group))];
  const ready = title.trim().length > 0 && body.trim().length > 0 && count > 0;
  const people = `${count.toLocaleString('en-IN')} ${count === 1 ? 'person' : 'people'}`;

  // Clear the boxes once a message has gone; the server action does every check.
  const send = async (prev: ActionResult, fd: FormData): Promise<ActionResult> => {
    const r = await sendBroadcast(prev, fd);
    if (r?.ok) {
      setTitle('');
      setBody('');
      setSent(r.message);
    }
    return r;
  };

  const hidden: Record<string, string> = { audience, label: chosen?.label ?? '', title, body };
  if (filtersQuery) hidden.query = filtersQuery;

  return (
    <div className="wp6-form">
      <label htmlFor={`${id}-a`}>Send to</label>
      <select id={`${id}-a`} value={audience} onChange={(e) => setAudience(e.target.value)}>
        {groups.map((g) => (
          <optgroup key={g} label={g}>
            {audiences
              .filter((a) => a.group === g)
              .map((a) => (
                <option key={a.key} value={a.key}>
                  {a.label} ({a.count.toLocaleString('en-IN')})
                </option>
              ))}
          </optgroup>
        ))}
      </select>
      <label htmlFor={`${id}-t`}>Title</label>
      <input id={`${id}-t`} maxLength={80} value={title} onChange={(e) => (setTitle(e.target.value), setSent(null))} placeholder="The first line they see" autoComplete="off" />
      <div className="wp6-hint">{title.length}/80</div>
      <label htmlFor={`${id}-b`}>Message</label>
      <textarea id={`${id}-b`} rows={4} maxLength={500} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Keep it short and useful" />
      <div className="wp6-hint">{body.length}/500</div>
      {sent ? (
        <p className="wp6-ok" role="status">
          {sent}
        </p>
      ) : null}
      <div className="v2-row wp6-send">
        {ready ? (
          <Confirm
            action={send}
            hidden={hidden}
            label="Review and send"
            tier={2}
            area="people"
            title={`Send this to ${people}?`}
            body={
              <ul className="wp6-list">
                <li>
                  <b>{chosen?.label}</b> get “{title.trim()}” in their TaskDrop notifications; phones with the app get a push.
                </li>
                <li>At most 5,000 people per message. Suspended people are left out unless you picked them.</li>
                <li>
                  <b>It can’t be taken back.</b> It is kept in “Sent so far”.
                </li>
              </ul>
            }
            confirmLabel={`Send to ${people}`}
          />
        ) : (
          <button type="button" className="v2-btn pri" disabled>
            {count === 0 ? 'Nobody to send to' : 'Review and send'}
          </button>
        )}
        <span className="v2-muted wp6-small">Pressing Enter never sends.</span>
      </div>
    </div>
  );
}
