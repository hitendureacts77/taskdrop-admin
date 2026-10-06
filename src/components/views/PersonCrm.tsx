import Link from 'next/link';
import type { PersonCrm, Tag, TimelineEvent } from '@/lib/crm';
import { deleteAccount, deleteNote, removeTag, suspendUser, unsuspendUser, updateNote } from '@/lib/crm-actions';
import type { UserDetail } from '@/lib/data';
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

/** The banner on a deleted account's page: when, by whom, and why. */
export function DeletedBanner({ deletion }: { deletion: UserDetail['deletion'] }) {
  if (!deletion) return null;
  return (
    <Notice tone="blue" title="This account is deleted" icon="alert">
      <p>
        {deletion.by ? <>Deleted by {deletion.by}</> : <>The person deleted it themselves</>}, {istDateTime(deletion.at)}
        {deletion.reason ? <> — “{deletion.reason}”</> : null}. Their name, contact details and sign-in are gone and it can’t be
        signed in to again. Paid jobs, payments and withdrawals stay below for the records, as “Deleted user”.
      </p>
    </Notice>
  );
}

/** What each blocker means for the admin (the database words it for the person). */
const BLOCKER_FOR_ADMIN: Record<string, (first: string) => string> = {
  ADMIN: (f) => `${f} is an admin. Remove the admin role first.`,
  BALANCE: (f) => `${f}’s wallet isn’t at zero. Pay it out to them, or settle it, first.`,
  CLEARING: (f) => `Some of ${f}’s earnings are still clearing into their wallet.`,
  PAYOUT: (f) => `A withdrawal is still on its way to ${f}.`,
  TASKS_ACTIVE: (f) => `A job ${f} posted is in progress or in dispute.`,
  TASKS_FUNDED: (f) => `An open job ${f} posted is already paid for. Cancel it so the money goes back to their wallet.`,
  WORK_ACTIVE: (f) => `${f} is working on a job right now.`,
  PROMOTION: (f) => `A promotion of ${f}’s is still running or not settled yet.`,
  PAYMENT_PENDING: (f) => `A payment ${f} started in the last hour is still going through.`,
};

/**
 * Deleting an account for someone who asked through support, or closing one
 * for good. Shows what is in the way instead of the button when it can't go.
 */
export function DeleteAccountCard({ userId, name, blockers }: { userId: string; name: string; blockers: UserDetail['deletionBlockers'] }) {
  const first = name.split(' ')[0] ?? name;
  return (
    <Card title="Delete account" sub="When someone asks through support, or to close an account for good.">
      {blockers.length ? (
        <>
          <p className="small">Can’t delete it yet:</p>
          <ul className="plain-list small">
            {blockers.map((b) => (
              <li key={b.code}>{BLOCKER_FOR_ADMIN[b.code]?.(first) ?? b.message}</li>
            ))}
          </ul>
        </>
      ) : (
        <ConfirmAction
          action={deleteAccount}
          hidden={{ userId, name: first }}
          trigger="Delete account"
          tone="danger"
          title={`Delete ${name}’s account?`}
          consequence={
            <>
              {first} is signed out everywhere and their name, photo, contact details, saved payout details and sign-in methods are removed.
              Jobs that went ahead, payments and withdrawals stay, shown as “Deleted user”. <strong>This can’t be undone.</strong> Their phone
              number or Google account would make a new, empty account if used again.
            </>
          }
          field={{ name: 'reason', label: 'Why? (kept on record)', placeholder: 'e.g. asked by email on 6 Oct', required: true }}
          confirmLabel={`Yes, delete ${first}’s account`}
        />
      )}
    </Card>
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
    <Card title={`Message ${first}`} sub="Goes to their TaskDrop notifications, and a push on their phone." id="message">
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
