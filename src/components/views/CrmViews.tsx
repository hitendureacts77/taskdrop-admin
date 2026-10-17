import Link from 'next/link';
import type { ReactNode } from 'react';
import { ClickCard, ClickRow } from '../Clickable';
import { criteriaToQuery, describeCriteria, hasFilters, type Audience, type Broadcast, type CrmOverview, type Criteria, type MemberRow, type Segment, type TagWithCount } from '@/lib/crm';
import { deleteSegment, deleteTag, updateNote } from '@/lib/crm-actions';
import { istDate, istDateTime, timeAgo } from '@/lib/format';
import { initials } from '@/lib/labels';
import { ConfirmAction } from '../ConfirmAction';
import { BroadcastForm, MiniButton, SegmentSaveForm } from '../CrmForms';
import { BulkOwnerForm, PickBox, SelectAllBox } from '../CrmOwnerForms';
import { Card, Empty, HowItWorks, Money, PageHeader, Pager, Pill, StatLink, Tabs } from '../ui';
import { TagChip } from './PersonCrm';

// ------------------------------------------------------------------- hub --

export function CrmHubView({ o, now: nowIso }: { o: CrmOverview; now: string }) {
  const now = new Date(nowIso);
  const due = o.followUps.filter((f) => f.overdue).length;
  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Customers' }]}
        title="Customers"
        sub="Know your people: notes, tags, follow-ups, suspensions, and messages to the right group."
        right={
          <span className="head-controls">
            <Link className="btn btn-small" href="/crm/segments?owner=me">
              My customers
            </Link>
            <Link className="btn btn-small" href="/crm/leads">
              Leads
            </Link>
            <Link className="btn btn-small" href="/crm/segments">
              Segments
            </Link>
            <Link className="btn btn-primary btn-small" href="/crm/messages">
              Send a message
            </Link>
          </span>
        }
      />

      <div className="stats">
        <StatLink href="/users" icon="people" label="People" value={o.people.toLocaleString('en-IN')} />
        <StatLink href="/users?filter=suspended" icon="shield" label="Suspended" value={o.suspended.length.toLocaleString('en-IN')} />
        <StatLink href="#follow-ups" icon="clock" label="Follow-ups waiting" value={o.followUps.length.toLocaleString('en-IN')} sub={due ? `${due} due now` : 'None due yet'} />
        <StatLink href="/crm/messages" icon="megaphone" label="Messages sent" value={o.broadcastsTotal.toLocaleString('en-IN')} />
      </div>

      <HowItWorks
        open={false}
        title="What you can do here"
        steps={[
          <>
            Open anyone from <Link href="/users">People</Link> to add private notes, tags and follow-up reminders, send them a message, or suspend them.
          </>,
          <>
            <Link href="/crm/segments">Segments</Link> find groups by what they do (workers who haven’t been seen for 30 days, people with money in their wallet…). Save one and it keeps itself up to date.
          </>,
          <>
            <Link href="/crm/messages">Messages</Link> go to a person or a group, land in their TaskDrop notifications, and send a push to phones with the app.
          </>,
        ]}
      />

      <div className="grid-main-side">
        <div className="stack">
          <Card title="Follow-ups" sub="Reminders you set on a person’s notes, soonest first." id="follow-ups">
            {o.followUps.length ? (
              <ul className="plain-list">
                {o.followUps.map((f) => (
                  <ClickCard as="li" key={f.id} href={`/users/${f.userId}`}>
                    <span>
                      <Link href={`/users/${f.userId}`}>{f.person}</Link> — {f.body.length > 120 ? `${f.body.slice(0, 120)}…` : f.body}
                      <span className="muted small block">
                        {f.overdue ? <Pill tone="red">Due</Pill> : <Pill tone="grey">Coming up</Pill>} {istDate(f.dueAt)}
                      </span>
                    </span>
                    <MiniButton action={updateNote} hidden={{ noteId: f.id, userId: f.userId, what: 'done' }}>
                      Done
                    </MiniButton>
                  </ClickCard>
                ))}
              </ul>
            ) : (
              <Empty title="Nothing to follow up">Add a note on someone’s page with a reminder date and it will show up here.</Empty>
            )}
          </Card>

          <Card title="Recent notes" sub={`${o.notesTotal.toLocaleString('en-IN')} in total`}>
            {o.notes.length ? (
              <ul className="plain-list">
                {o.notes.map((n) => (
                  <ClickCard as="li" key={n.id} href={`/users/${n.userId}`}>
                    <span>
                      <Link href={`/users/${n.userId}`}>{n.person}</Link> — {n.body.length > 140 ? `${n.body.slice(0, 140)}…` : n.body}
                      <span className="muted small block">{timeAgo(n.at, now)}</span>
                    </span>
                  </ClickCard>
                ))}
              </ul>
            ) : (
              <p className="muted small">No notes yet.</p>
            )}
          </Card>

          <MessageHistoryCard rows={o.broadcasts} now={now} title="Latest messages" more />
        </div>

        <div className="stack">
          <Card title="Suspended" sub="Can’t sign in or withdraw. Their jobs and money are untouched.">
            {o.suspended.length ? (
              <ul className="plain-list">
                {o.suspended.map((s) => (
                  <ClickCard as="li" key={s.id} href={`/users/${s.id}`}>
                    <span>
                      <Link href={`/users/${s.id}`}>{s.name}</Link>
                      <span className="muted small block">
                        “{s.reason}” · {istDate(s.at)}
                      </span>
                    </span>
                  </ClickCard>
                ))}
              </ul>
            ) : (
              <p className="muted small">Nobody is suspended.</p>
            )}
          </Card>

          <Card title="Tags" sub="Click a tag to see who has it.">
            <TagList tags={o.tags} />
          </Card>
        </div>
      </div>
    </>
  );
}

function TagList({ tags }: { tags: TagWithCount[] }) {
  if (!tags.length) return <p className="muted small">No tags yet. Add one from any person’s page.</p>;
  return (
    <ul className="plain-list">
      {tags.map((t) => (
        <li key={t.id}>
          <span>
            <Link href={`/users?tag=${t.id}`}>
              <TagChip tag={t} />
            </Link>
            <span className="muted small"> {t.people.toLocaleString('en-IN')} {t.people === 1 ? 'person' : 'people'}</span>
          </span>
          <ConfirmAction
            action={deleteTag}
            hidden={{ tagId: t.id }}
            trigger="Delete"
            tone="quiet"
            title={`Delete the “${t.name}” tag?`}
            consequence={<>It is taken off {t.people.toLocaleString('en-IN')} {t.people === 1 ? 'person' : 'people'}. Nothing else changes. Segments that use it will match nobody.</>}
            confirmLabel="Yes, delete the tag"
          />
        </li>
      ))}
    </ul>
  );
}

function MessageHistoryCard({ rows, now, title, more }: { rows: Broadcast[]; now: Date; title: string; more?: boolean }) {
  return (
    <Card title={title} right={more ? <Link href="/crm/messages">All messages →</Link> : undefined} flush={rows.length > 0}>
      {rows.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="th">Message</th>
                <th className="th">Sent to</th>
                <th className="th num">People</th>
                <th className="th">When</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id}>
                  <td className="td">
                    <strong>{b.title}</strong>
                    <span className="small block">{b.body.length > 110 ? `${b.body.slice(0, 110)}…` : b.body}</span>
                  </td>
                  <td className="td small">{b.audience}</td>
                  <td className="td num">{b.recipients.toLocaleString('en-IN')}</td>
                  <td className="td nowrap small">
                    {timeAgo(b.at, now)}
                    <span className="muted block">{b.by}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted small">Nothing sent yet.</p>
      )}
    </Card>
  );
}

// -------------------------------------------------------------- segments --

export type SegmentsData = {
  criteria: Criteria;
  tags: TagWithCount[];
  rows: MemberRow[];
  total: number;
  page: number;
  pageSize: number;
  segments: Segment[];
  now: string;
  /** 'anyone', 'me', 'nobody' or a staff member's id: which owner's customers to show. */
  owner: string;
  staff: { id: string; name: string }[];
  me: string;
  /** Whether the signed-in staff role may change owners (people area). */
  canEdit: boolean;
};

export function SegmentsView({ d }: { d: SegmentsData }) {
  const now = new Date(d.now);
  const c = d.criteria;
  const query = criteriaToQuery(c);
  const ownerQuery = d.owner === 'anyone' ? '' : `owner=${d.owner}`;
  const ownered = ownerQuery ? (query ? `${query}&${ownerQuery}` : ownerQuery) : query;
  const withPage = (page: number) => `/crm/segments?${ownered}${ownered && page ? '&' : ''}${page ? `page=${page}` : ''}`;
  const ownerHref = (o: string) => {
    const q = [query, o === 'anyone' ? '' : `owner=${o}`].filter(Boolean).join('&');
    return `/crm/segments${q ? `?${q}` : ''}`;
  };
  const ownerFiltered = d.owner !== 'anyone';
  const wrapBulk = (table: ReactNode) => (d.canEdit ? <BulkOwnerForm staff={d.staff} me={d.me}>{table}</BulkOwnerForm> : table);

  return (
    <>
      <PageHeader
        crumbs={[{ href: '/crm', label: 'Customers' }, { label: 'Segments' }]}
        title="Segments"
        sub="Find a group of people by what they do. Preview it, save it, message it, or download it."
      />

      <Tabs
        label="Looked after by"
        items={[
          { href: ownerHref('anyone'), label: 'Everyone’s customers', active: d.owner === 'anyone' },
          { href: ownerHref('me'), label: 'My customers', active: d.owner === 'me' },
          { href: ownerHref('nobody'), label: 'No owner', active: d.owner === 'nobody' },
          ...(d.owner !== 'anyone' && d.owner !== 'me' && d.owner !== 'nobody' ? [{ href: ownerHref(d.owner), label: `${d.staff.find((s) => s.id === d.owner)?.name ?? 'Someone else'}’s`, active: true }] : []),
        ]}
      />

      <Card title="Find people" sub="Leave anything blank to ignore it. Suspended people are left out unless you tick the box.">
        <form key={`${query}|${d.owner}`} action="/crm/segments" method="get" className="seg-form">
          <label className="confirm-field">
            <span>Who</span>
            <select name="role" defaultValue={c.role ?? 'any'} className="field">
              <option value="any">Everyone</option>
              <option value="worker">Workers</option>
              <option value="poster">People who only post</option>
            </select>
          </label>
          <label className="confirm-field">
            <span>Joined in the last (days)</span>
            <input name="joined" type="number" min={1} max={3650} className="field" defaultValue={c.joined_within_days ?? ''} placeholder="any time" />
          </label>
          <label className="confirm-field">
            <span>Not seen for (days)</span>
            <input name="inactive" type="number" min={1} max={3650} className="field" defaultValue={c.inactive_days ?? ''} placeholder="doesn’t matter" />
          </label>
          <label className="confirm-field">
            <span>Has the tag</span>
            <select name="tag" defaultValue={c.tag_id ?? ''} className="field">
              <option value="">Any (or none)</option>
              {d.tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.people})
                </option>
              ))}
            </select>
          </label>
          <label className="confirm-field">
            <span>Wallet holds at least (₹)</span>
            <input name="minwallet" type="number" min={0} step="1" className="field" defaultValue={c.min_wallet_minor ? c.min_wallet_minor / 100 : ''} placeholder="any amount" />
          </label>
          <label className="confirm-field">
            <span>Looked after by</span>
            <select name="owner" defaultValue={d.owner} className="field">
              <option value="anyone">Anyone</option>
              <option value="me">Me</option>
              <option value="nobody">Nobody (no owner)</option>
              {d.staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.id === d.me ? ' (me)' : ''}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="seg-checks">
            <label>
              <input type="checkbox" name="never_posted" value="1" defaultChecked={c.never_posted} /> Never posted a job
            </label>
            <label>
              <input type="checkbox" name="live" value="1" defaultChecked={c.available_now} /> Available now
            </label>
            <label>
              <input type="checkbox" name="suspended" value="1" defaultChecked={c.include_suspended} /> Include suspended
            </label>
          </fieldset>
          <span className="seg-form-actions">
            <button type="submit" className="btn btn-primary">
              Show who matches
            </button>
            {hasFilters(c) || ownerFiltered ? (
              <Link className="btn" href="/crm/segments">
                Clear filters
              </Link>
            ) : null}
          </span>
        </form>
      </Card>

      <Card
        title={`${d.total.toLocaleString('en-IN')} ${d.total === 1 ? 'person matches' : 'people match'}`}
        sub={[describeCriteria(c, d.tags), ownerFiltered ? (d.owner === 'me' ? 'looked after by you' : d.owner === 'nobody' ? 'with no owner' : `looked after by ${d.staff.find((s) => s.id === d.owner)?.name ?? 'someone else'}`) : ''].filter(Boolean).join(' · ')}
        right={
          d.total > 0 ? (
            <span className="head-controls">
              {ownerFiltered ? null : (
                <Link className="btn btn-small btn-primary" href={`/crm/messages?${query}`}>
                  Message them
                </Link>
              )}
              <a className="btn btn-small" href={`/api/crm/export?segment=1${ownered ? `&${ownered}` : ''}`} download>
                Download spreadsheet
              </a>
            </span>
          ) : undefined
        }
        flush={d.rows.length > 0}
      >
        {d.rows.length ? (
          wrapBulk(
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {d.canEdit ? (
                    <th className="th pick-col">
                      <SelectAllBox />
                    </th>
                  ) : null}
                  <th className="th">Name</th>
                  <th className="th">Does</th>
                  <th className="th num">Wallet</th>
                  <th className="th">Joined</th>
                  <th className="th">Last seen</th>
                  <th className="th">Owner</th>
                </tr>
              </thead>
              <tbody>
                {d.rows.map((u) => (
                  <ClickRow key={u.id} href={`/users/${u.id}`}>
                    {d.canEdit ? (
                      <td className="td pick-col">
                        <PickBox id={u.id} name={u.name} />
                      </td>
                    ) : null}
                    <td className="td">
                      <span className="person">
                        <span className="avatar" aria-hidden="true">
                          {initials(u.name)}
                        </span>
                        <span>
                          <Link href={`/users/${u.id}`}>{u.name}</Link>
                          {u.tags.length ? (
                            <span className="tag-row-inline">
                              {u.tags.map((t) => (
                                <TagChip key={t.id} tag={t} />
                              ))}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </td>
                    <td className="td">
                      <span className="pill-row">
                        <Pill tone={u.isWorker ? 'blue' : 'grey'}>{u.isWorker ? 'Worker' : 'Poster'}</Pill>
                        {u.suspended ? <Pill tone="red">Suspended</Pill> : null}
                      </span>
                    </td>
                    <td className="td num">
                      <Money minor={u.walletMinor + u.clearingMinor} />
                    </td>
                    <td className="td nowrap">{istDate(u.joinedAt)}</td>
                    <td className="td nowrap muted">{u.lastSeenAt ? timeAgo(u.lastSeenAt, now) : '—'}</td>
                    <td className="td nowrap">{u.owner ? u.owner.name : <span className="muted">—</span>}</td>
                  </ClickRow>
                ))}
              </tbody>
            </table>
          </div>,
          )
        ) : (
          <Empty title="Nobody matches these filters">Loosen one of them and try again.</Empty>
        )}
        <Pager page={d.page} pageSize={d.pageSize} total={d.total} hrefFor={withPage} />
        {hasFilters(c) && !ownerFiltered && d.total > 0 ? (
          <div className="seg-save">
            <strong>Keep this group</strong>
            <span className="muted small">Saved segments update themselves as people change, and can be messaged in one click.</span>
            <SegmentSaveForm query={query} />
          </div>
        ) : null}
      </Card>

      <Card title="Saved segments" sub="Counts are live." flush={d.segments.length > 0}>
        {d.segments.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="th">Segment</th>
                  <th className="th num">People</th>
                  <th className="th">Saved</th>
                  <th className="th">What you can do</th>
                </tr>
              </thead>
              <tbody>
                {d.segments.map((s) => (
                  <ClickRow key={s.id} href={`/crm/segments?${criteriaToQuery(s.criteria)}`}>
                    <td className="td">
                      <strong>{s.name}</strong>
                      <span className="muted small block">{s.description}</span>
                    </td>
                    <td className="td num">{s.people.toLocaleString('en-IN')}</td>
                    <td className="td nowrap small">{istDate(s.createdAt)}</td>
                    <td className="td">
                      <span className="seg-actions">
                        <Link className="btn btn-small" href={`/crm/segments?${criteriaToQuery(s.criteria)}`}>
                          Preview
                        </Link>
                        <Link className="btn btn-small btn-primary" href={`/crm/messages?audience=segment:${s.id}`}>
                          Message
                        </Link>
                        <ConfirmAction
                          action={deleteSegment}
                          hidden={{ segmentId: s.id }}
                          trigger="Delete"
                          tone="quiet"
                          title={`Delete “${s.name}”?`}
                          consequence={<>Only the saved filter goes. Nobody is changed or messaged.</>}
                          confirmLabel="Yes, delete it"
                        />
                      </span>
                    </td>
                  </ClickRow>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted small">None yet. Pick some filters above and press “Show who matches”, then save the group.</p>
        )}
      </Card>
    </>
  );
}

// -------------------------------------------------------------- messages --

export type MessagesData = { audiences: Audience[]; defaultAudience: string; filtersQuery: string; history: Broadcast[]; now: string };

export function MessagesView({ d }: { d: MessagesData }) {
  const now = new Date(d.now);
  return (
    <>
      <PageHeader
        crumbs={[{ href: '/crm', label: 'Customers' }, { label: 'Messages' }]}
        title="Messages"
        sub="Tell people something. It lands in their TaskDrop notifications, and phones with the app get a push."
      />
      <div className="grid-main-side">
        <div className="stack">
          <Card title="Write a message" sub="Nothing is sent until you review it and confirm. To message one person, open them from People.">
            <BroadcastForm audiences={d.audiences} defaultAudience={d.defaultAudience} filtersQuery={d.filtersQuery || undefined} />
          </Card>
        </div>
        <div className="stack">
          <HowItWorks
            title="Good to know"
            steps={[
              <>You see how many people it will reach before you send. A single message goes to at most 5,000 people.</>,
              <>Suspended people are left out unless you chose them yourself.</>,
              <>A sent message can’t be taken back, so the history below keeps a record of what went to whom.</>,
            ]}
          />
        </div>
      </div>
      <MessageHistoryCard rows={d.history} now={now} title="Sent so far" />
    </>
  );
}
