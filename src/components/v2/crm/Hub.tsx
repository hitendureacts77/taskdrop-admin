/** v2 Customer hub, /crm (F318-F329). Today's data and actions; only the look is new. */
import Link from 'next/link';
import * as v2 from '@/components/v2/ui';
import { Confirm } from '@/components/v2/Confirm';
import { deleteTag, updateNote } from '@/lib/crm-actions';
import type { Broadcast, CrmOverview } from '@/lib/crm';
import { istDate, timeAgo } from '@/lib/format';
import { isTestUserId } from '@/lib/test-data';
import { isTestBroadcast } from '@/lib/crm';
import { CUSTOMERS_CRUMB, CrmShortcuts, How, Who, clip, nf } from './shared';

export function MessagesTable({ rows, now, hideTest }: { rows: Broadcast[]; now: Date; hideTest: boolean }) {
  return (
    <v2.DataTable
      caption="Messages sent"
      columns={[{ label: 'Message' }, { label: 'Sent to' }, { label: 'People', right: true }, { label: 'When' }, { label: 'By' }]}
      empty="Nothing sent yet"
      rows={rows.map((b) => ({
        key: b.id,
        test: !hideTest && isTestBroadcast(b),
        cells: [
          <span key="m" className="wp6-msg">
            <b>{b.title}</b>
            <span className="v2-muted">{clip(b.body, 110)}</span>
          </span>,
          <span key="a" className="wp6-small">
            {b.toUser ? <Link href={`/users/${b.toUser}`}>{b.audience}</Link> : b.audience}
          </span>,
          nf(b.recipients),
          <span key="w" className="wp6-small" title={istDate(b.at)}>
            {timeAgo(b.at, now)}
          </span>,
          <span key="by" className="wp6-small">
            {b.by}
          </span>,
        ],
      }))}
    />
  );
}

export function CrmHubV2({ o, now: nowIso, hideTest }: { o: CrmOverview; now: string; hideTest: boolean }) {
  const now = new Date(nowIso);
  const due = o.followUps.filter((f) => f.overdue).length;
  const tags = hideTest ? o.tags.filter((t) => !t.testOnly) : o.tags;
  const hiddenTags = o.tags.length - tags.length;
  return (
    <>
      <v2.PageHeader title="Customer hub" sub="Know your people: notes, tags, follow-ups, suspensions, and messages to the right group." crumbs={[CUSTOMERS_CRUMB, { label: 'Customer hub' }]} />
      <CrmShortcuts />

      <v2.Grid cols={4}>
        <v2.Tile label="People" value={nf(o.people)} foot={<Link href="/users">Everyone →</Link>} />
        <v2.Tile label="Suspended" value={nf(o.suspended.length)} tone={o.suspended.length ? 'orange' : undefined} foot={<Link href="/users?filter=suspended">See who →</Link>} />
        <v2.Tile
          label="Follow-ups waiting"
          value={nf(o.followUps.length)}
          tone="gold"
          foot={
            <>
              {due ? `${nf(due)} due now` : 'None due yet'} · <a href="#follow-ups">see below →</a>
            </>
          }
        />
        <v2.Tile label="Messages sent" value={nf(o.broadcastsTotal)} foot={<Link href="/crm/messages">All messages →</Link>} />
      </v2.Grid>

      <div className="wp6-gap">
        <How
          title="What you can do here"
          steps={[
            ['Notes and follow-ups', <>Write a private note on a person’s page and pick a date: it shows below on that day.</>],
            ['Tags', <>Label people (VIP, Business…) and find them again in a click.</>],
            ['Segments', <>Find a group by what they do, save it, download it or message it.</>],
            ['Messages', <>Send a notification and a push to a group.</>],
            ['Leads', <>Keep track of people and businesses who are not on TaskDrop yet.</>],
          ]}
        />
      </div>

      <v2.Grid cols="main" className="wp6-gap">
        <div className="wp6-stack">
          <v2.Card title="Follow-ups from notes" sub="Reminders set on a person’s notes, soonest first." id="follow-ups">
            <v2.DataTable
              caption="Follow-ups from notes"
              columns={[{ label: 'Person' }, { label: 'Note' }, { label: 'Due' }, { label: '' }]}
              empty="Nothing to follow up. Add a note on someone’s page with a reminder date."
              rows={o.followUps.map((f) => ({
                key: f.id,
                late: f.overdue,
                cells: [
                  <Who key="p" id={f.userId} name={f.person} test={!hideTest && isTestUserId(f.userId)} />,
                  <span key="n" className="wp6-small">
                    {clip(f.body, 120)}
                  </span>,
                  f.overdue ? (
                    <v2.Pill key="d" tone="danger">
                      Due · {istDate(f.dueAt)}
                    </v2.Pill>
                  ) : (
                    <v2.Pill key="d" tone="mut">
                      Coming up · {istDate(f.dueAt)}
                    </v2.Pill>
                  ),
                  <Confirm
                    key="b"
                    action={updateNote}
                    hidden={{ noteId: f.id, userId: f.userId, what: 'done' }}
                    undo={{ action: updateNote, hidden: { noteId: f.id, userId: f.userId, what: 'reopen' } }}
                    label="Done"
                    tier={1}
                    area="people"
                    small
                  />,
                ],
              }))}
            />
          </v2.Card>

          <v2.Card title="Recent notes" sub={`${nf(o.notesTotal)} in total. Newest first.`}>
            {o.notes.length ? (
              <ul className="wp6-lines">
                {o.notes.map((n) => (
                  <li key={n.id}>
                    <span className="v2-muted wp6-small">
                      <Link href={`/users/${n.userId}`}>{n.person}</Link> · {timeAgo(n.at, now)}
                      <v2.TestTag show={!hideTest && isTestUserId(n.userId)} />
                    </span>
                    <span className="wp6-small">{clip(n.body, 140)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <v2.Empty title="No notes yet">Open someone from People to write the first one.</v2.Empty>
            )}
          </v2.Card>

          <v2.Card
            title="Latest messages"
            right={
              <Link className="v2-btn ghost sm" href="/crm/messages">
                All messages →
              </Link>
            }
          >
            <MessagesTable rows={o.broadcasts} now={now} hideTest={hideTest} />
          </v2.Card>
        </div>

        <div className="wp6-stack">
          <v2.Card title="Suspended" sub="Can’t sign in or withdraw. Their jobs and money are untouched.">
            {o.suspended.length ? (
              <ul className="wp6-lines">
                {o.suspended.map((s) => (
                  <li key={s.id}>
                    <Who id={s.id} name={s.name} sub={istDate(s.at)} test={!hideTest && isTestUserId(s.id)} />
                    <span className="wp6-small">“{s.reason}”</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="v2-muted wp6-small">Nobody is suspended.</p>
            )}
          </v2.Card>

          <v2.Card title="Tags" sub="Click a tag to see who has it.">
            {tags.length ? (
              <ul className="wp6-lines">
                {tags.map((t) => (
                  <li key={t.id} className="wp6-spread">
                    <Link href={`/users?tag=${t.id}`}>
                      <span className={`wp6-tag t-${t.color}`}>
                        {t.name}
                      </span>{' '}
                      <span className="v2-muted wp6-small">
                        · {nf(t.people)} {t.people === 1 ? 'person' : 'people'}
                      </span>
                    </Link>
                    <Confirm
                      action={deleteTag}
                      hidden={{ tagId: t.id }}
                      label="Delete"
                      tier={2}
                      area="people"
                      tone="danger"
                      small
                      title={`Delete the tag “${t.name}”?`}
                      body={
                        <p>
                          {t.people === 0 ? 'Nobody has this tag, so no one is affected.' : `It is taken off ${nf(t.people)} ${t.people === 1 ? 'person' : 'people'}.`} Their notes and everything else stay. Segments that use it will match nobody.
                        </p>
                      }
                      confirmLabel="Delete tag"
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="v2-muted wp6-small">No tags yet. Add one from any person’s page.</p>
            )}
            {hideTest && hiddenTags ? (
              <p className="v2-muted wp6-small">
                {nf(hiddenTags)} {hiddenTags === 1 ? 'tag that only test accounts have is' : 'tags that only test accounts have are'} hidden.
              </p>
            ) : null}
          </v2.Card>
        </div>
      </v2.Grid>
    </>
  );
}
