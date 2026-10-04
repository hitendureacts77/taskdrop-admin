'use client';

import { useActionState, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { FormAction } from './ConfirmAction';
import { addNote, assignTag, saveSegment, sendBroadcast } from '@/lib/crm-actions';

function Result({ state }: { state: { ok: boolean; message: string } | null }) {
  if (!state) return null;
  return (
    <p className={state.ok ? 'confirm-done' : 'confirm-error'} role={state.ok ? 'status' : 'alert'}>
      {state.message}
    </p>
  );
}

/** A note about a person, with an optional follow-up date that shows on the Customers hub. */
export function NoteForm({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState(addNote, null);
  const ref = useRef<HTMLFormElement>(null);
  const id = useId();
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form action={formAction} ref={ref} className="reply">
      <input type="hidden" name="userId" value={userId} />
      <label className="sr-only" htmlFor={`${id}-body`}>
        Note
      </label>
      <textarea id={`${id}-body`} name="body" className="field textarea" rows={3} maxLength={4000} required placeholder="A private note only admins can see…" />
      <label className="crm-inline" htmlFor={`${id}-due`}>
        <span>Remind me on</span>
        <input id={`${id}-due`} name="followUp" type="date" className="field crm-date" aria-label="Follow-up date (optional)" />
        <small className="muted">optional</small>
      </label>
      <Result state={state} />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? 'Saving…' : 'Save note'}
      </button>
    </form>
  );
}

/** Add a tag by typing it; an existing tag with the same name is reused. */
export function TagForm({ userId, suggestions }: { userId: string; suggestions: string[] }) {
  const [state, formAction, pending] = useActionState(assignTag, null);
  const ref = useRef<HTMLFormElement>(null);
  const listId = useId();
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form action={formAction} ref={ref} className="crm-tagform">
      <input type="hidden" name="userId" value={userId} />
      <label className="sr-only" htmlFor={`${listId}-in`}>
        Add a tag
      </label>
      <input id={`${listId}-in`} name="name" className="field" list={listId} maxLength={30} required placeholder="Add a tag, e.g. VIP" autoComplete="off" />
      <datalist id={listId}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <button type="submit" className="btn btn-small" disabled={pending}>
        {pending ? 'Adding…' : 'Add tag'}
      </button>
      <Result state={state} />
    </form>
  );
}

/** A one-click action with no confirmation: pin, done, remove a tag. */
export function MiniButton({ action, hidden, children, title }: { action: FormAction; hidden: Record<string, string>; children: ReactNode; title?: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="crm-mini">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button type="submit" className="btn btn-small btn-ghost" disabled={pending} title={title}>
        {children}
      </button>
      {state && !state.ok ? <span className="confirm-error">{state.message}</span> : null}
    </form>
  );
}

/** Save the filters currently on screen as a named segment. */
export function SegmentSaveForm({ query }: { query: string }) {
  const [state, formAction, pending] = useActionState(saveSegment, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form action={formAction} ref={ref} className="crm-tagform">
      <input type="hidden" name="query" value={query} />
      <label className="sr-only" htmlFor="seg-name">
        Segment name
      </label>
      <input id="seg-name" name="name" className="field" maxLength={60} required placeholder="Name this segment, e.g. Quiet workers" autoComplete="off" />
      <button type="submit" className="btn btn-primary btn-small" disabled={pending}>
        {pending ? 'Saving…' : 'Save segment'}
      </button>
      <Result state={state} />
    </form>
  );
}

export type AudienceOption = { key: string; label: string; group: string; count: number };

/**
 * Compose a message. Nothing is sent until the second click, which says exactly
 * how many people will get it.
 */
export function BroadcastForm({
  audiences,
  defaultAudience,
  filtersQuery,
  fixedPerson,
}: {
  audiences: AudienceOption[];
  defaultAudience?: string;
  filtersQuery?: string;
  /** Message one person: the audience is fixed. */
  fixedPerson?: { id: string; name: string };
}) {
  const [state, formAction, pending] = useActionState(sendBroadcast, null);
  const [audience, setAudience] = useState(fixedPerson ? `user:${fixedPerson.id}` : defaultAudience ?? audiences[0]?.key ?? 'all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [confirming, setConfirming] = useState(false);
  const id = useId();

  useEffect(() => {
    if (state?.ok) {
      setTitle('');
      setBody('');
      setConfirming(false);
    }
  }, [state]);

  const chosen = audiences.find((a) => a.key === audience);
  const count = fixedPerson ? 1 : chosen?.count ?? 0;
  const who = fixedPerson ? fixedPerson.name : chosen?.label ?? 'this audience';
  const groups = [...new Set(audiences.map((a) => a.group))];
  const ready = title.trim().length > 0 && body.trim().length > 0;

  return (
    <form action={formAction} className="reply crm-compose">
      <input type="hidden" name="audience" value={audience} />
      <input type="hidden" name="label" value={fixedPerson ? '' : chosen?.label ?? ''} />
      {filtersQuery ? <input type="hidden" name="query" value={filtersQuery} /> : null}

      {fixedPerson ? null : (
        <label className="confirm-field" htmlFor={`${id}-aud`}>
          <span>Send to</span>
          <select id={`${id}-aud`} className="field" value={audience} onChange={(e) => (setAudience(e.target.value), setConfirming(false))}>
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
        </label>
      )}

      <label className="confirm-field" htmlFor={`${id}-title`}>
        <span>Title</span>
        <input id={`${id}-title`} name="title" className="field" maxLength={80} required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="The first line they see" autoComplete="off" />
      </label>
      <label className="confirm-field" htmlFor={`${id}-body`}>
        <span>Message</span>
        <textarea id={`${id}-body`} name="body" className="field textarea" rows={4} maxLength={500} required value={body} onChange={(e) => setBody(e.target.value)} placeholder="Keep it short and useful" />
        <small className="muted">{body.length}/500</small>
      </label>

      {state && !state.ok ? (
        <p className="confirm-error" role="alert">
          {state.message}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="confirm-done" role="status">
          {state.message}
        </p>
      ) : null}

      {!confirming ? (
        <button type="button" className="btn btn-primary" disabled={!ready || count === 0} onClick={() => setConfirming(true)}>
          {count === 0 ? 'Nobody to send to' : 'Review and send'}
        </button>
      ) : (
        <div className="confirm confirm-primary">
          <strong className="confirm-title">
            Send this to {count.toLocaleString('en-IN')} {count === 1 ? 'person' : 'people'}?
          </strong>
          <div className="confirm-body">
            <p>
              <strong>{who}</strong> will get “{title}” in their TaskDrop notifications, and a push on phones with the app. It can’t be taken back.
            </p>
          </div>
          <div className="confirm-actions">
            <button type="button" className="btn" onClick={() => setConfirming(false)} disabled={pending}>
              Back
            </button>
            <button type="submit" className="btn btn-primary" disabled={pending}>
              {pending ? 'Sending…' : `Yes, send to ${count.toLocaleString('en-IN')}`}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
