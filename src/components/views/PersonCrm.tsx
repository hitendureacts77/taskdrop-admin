import Link from 'next/link';
import type { PersonCrm, Tag, TimelineEvent } from '@/lib/crm';
import { deleteNote, removeTag, suspendUser, unsuspendUser, updateNote } from '@/lib/crm-actions';
import { istDate, istDateTime } from '@/lib/format';
import { ConfirmAction } from '../ConfirmAction';
import { BroadcastForm, MiniButton, NoteForm, TagForm } from '../CrmForms';
import { Card, Notice } from '../ui';

export function TagChip({ tag }: { tag: Tag }) {
  return <span className={`tag tag-${tag.color}`}>{tag.name}</span>;
}

/** The red banner on a suspended person's page, with the way back. */
export function SuspensionBanner({ userId, name, crm }: { userId: string; name: string; crm: PersonCrm }) {
  const s = crm.suspension;
  if (!s) return null;
  const first = name.split(' ')[0] ?? name;
  return (
    <Notice tone="red" title={`${name} is suspended`} icon="alert">
      <p>
        “{s.reason}” — by {s.by}, {istDateTime(s.at)}. {first} can’t sign in or withdraw. Their jobs and money are exactly where they were.
      </p>
      <ConfirmAction
        action={unsuspendUser}
        hidden={{ userId, name: first }}
        trigger={`Let ${first} back in`}
        tone="quiet"
        title={`Let ${first} sign in again?`}
        consequence={<>They can use TaskDrop as normal straight away, and get a notification saying so.</>}
        field={{ name: 'note', label: 'Why (optional)', placeholder: 'e.g. sorted it out on a call' }}
        confirmLabel={`Yes, let ${first} back in`}
      />
    </Notice>
  );
}

/** The Suspend button in the page header. Admins can’t be suspended from here. */
export function SuspendButton({ userId, name, isAdmin, crm }: { userId: string; name: string; isAdmin: boolean; crm: PersonCrm }) {
  if (isAdmin || crm.suspension) return null;
  const first = name.split(' ')[0] ?? name;
  return (
    <ConfirmAction
      action={suspendUser}
      hidden={{ userId, name: first }}
      trigger="Suspend"
      tone="danger"
      title={`Suspend ${name}?`}
      consequence={
        <>
          {first} is signed out now and can’t sign in or withdraw until you let them back in. Their jobs and wallet money <strong>stay exactly as they are</strong>; you decide what to do with those. You can undo this any time.
        </>
      }
      field={{ name: 'reason', label: 'Why? (kept on their record)', placeholder: 'e.g. posting spam jobs', required: true }}
      confirmLabel={`Yes, suspend ${first}`}
    />
  );
}

export function TagsCard({ userId, crm }: { userId: string; crm: PersonCrm }) {
  return (
    <Card title="Tags" sub="Labels only admins see. Use them to group people, then message or export the group.">
      {crm.tags.length ? (
        <ul className="tag-row">
          {crm.tags.map((t) => (
            <li key={t.id}>
              <TagChip tag={t} />
              <MiniButton action={removeTag} hidden={{ userId, tagId: t.id }} title={`Remove “${t.name}”`}>
                ✕
              </MiniButton>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small">No tags yet.</p>
      )}
      <TagForm userId={userId} suggestions={crm.allTags.filter((t) => !crm.tags.some((x) => x.id === t.id)).map((t) => t.name)} />
    </Card>
  );
}

export function NotesCard({ userId, crm, now }: { userId: string; crm: PersonCrm; now: Date }) {
  return (
    <Card title="Notes & follow-ups" sub="Private to admins. Add a reminder date and it shows on the Customers hub when it’s due.">
      <NoteForm userId={userId} />
      {crm.notes.length ? (
        <ul className="notes">
          {crm.notes.map((n) => {
            const overdue = n.followUpAt && !n.doneAt && new Date(n.followUpAt).getTime() <= now.getTime();
            return (
              <li key={n.id} className={n.pinned ? 'note pinned' : 'note'}>
                <p className="prose">{n.body}</p>
                <span className="muted small block">
                  {n.pinned ? '📌 ' : ''}
                  {n.author} · {istDateTime(n.createdAt)}
                  {n.followUpAt ? (
                    <>
                      {' · '}
                      {n.doneAt ? <>follow-up done {istDate(n.doneAt)}</> : <strong className={overdue ? 'due' : ''}>follow up {istDate(n.followUpAt)}{overdue ? ' (due)' : ''}</strong>}
                    </>
                  ) : null}
                </span>
                <span className="note-actions">
                  <MiniButton action={updateNote} hidden={{ noteId: n.id, userId, what: n.pinned ? 'unpin' : 'pin' }}>
                    {n.pinned ? 'Unpin' : 'Pin'}
                  </MiniButton>
                  {n.followUpAt ? (
                    <MiniButton action={updateNote} hidden={{ noteId: n.id, userId, what: n.doneAt ? 'reopen' : 'done' }}>
                      {n.doneAt ? 'Reopen follow-up' : 'Mark follow-up done'}
                    </MiniButton>
                  ) : null}
                  <MiniButton action={deleteNote} hidden={{ noteId: n.id, userId }}>
                    Delete
                  </MiniButton>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="muted small">No notes yet.</p>
      )}
    </Card>
  );
}

export function MessageCard({ userId, name, crm }: { userId: string; name: string; crm: PersonCrm }) {
  const first = name.split(' ')[0] ?? name;
  return (
    <Card title={`Message ${first}`} sub="Goes to their TaskDrop notifications, and a push on their phone.">
      <BroadcastForm audiences={[]} fixedPerson={{ id: userId, name }} />
      {crm.messages.length ? (
        <>
          <h3 className="sub-head">Sent to {first}</h3>
          <ul className="plain-list">
            {crm.messages.map((m) => (
              <li key={m.id}>
                <span>
                  <strong>{m.title}</strong>
                  <span className="small block">{m.body}</span>
                  <span className="muted small block">
                    {m.by} · {istDateTime(m.at)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Card>
  );
}

export function SuspensionHistory({ crm }: { crm: PersonCrm }) {
  if (!crm.suspensionHistory.length) return null;
  return (
    <Card title="Past suspensions">
      <ul className="plain-list">
        {crm.suspensionHistory.map((s) => (
          <li key={s.id}>
            <span>
              “{s.reason}”
              <span className="muted small block">
                Suspended by {s.by}, {istDate(s.at)} · lifted {s.liftedAt ? istDate(s.liftedAt) : ''}
                {s.liftedBy ? ` by ${s.liftedBy}` : ''}
                {s.liftNote ? ` — ${s.liftNote}` : ''}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function TimelineCard({ events, first }: { events: TimelineEvent[]; first: string }) {
  return (
    <Card title={`${first}’s activity`} sub="Everything that has happened to them, newest first.">
      <ol className="activity">
        {events.map((e, i) => (
          <li key={i}>
            <span className={`act-dot act-${e.tone}`} aria-hidden="true" />
            <span>
              <strong>{e.label}</strong>
              {e.detail ? (
                <>
                  {' · '}
                  {e.href ? <Link href={e.href}>{e.detail}</Link> : <span>{e.detail}</span>}
                </>
              ) : e.href ? (
                <>
                  {' · '}
                  <Link href={e.href}>open</Link>
                </>
              ) : null}
              <span className="muted small block">{istDateTime(e.at)}</span>
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
