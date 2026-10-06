import Link from 'next/link';
import { ClickRow } from '../Clickable';
import type { Tag, TagWithCount } from '@/lib/crm';
import type { UserFilter, UserRow } from '@/lib/data';
import { USER_FILTERS } from '@/lib/data';
import { istDate, timeAgo } from '@/lib/format';
import { initials } from '@/lib/labels';
import { Card, Empty, Money, PageHeader, Pager, Pill, SearchBox, Tabs } from '../ui';
import { TagChip } from './PersonCrm';

export type UsersData = {
  now: string;
  filter: UserFilter;
  q: string;
  page: number;
  pageSize: number;
  rows: UserRow[];
  total: number;
  /** The tag the list is narrowed to, and every tag that exists. */
  tag: string;
  allTags: TagWithCount[];
  tagsByUser: Record<string, Tag[]>;
  suspended: Record<string, string>;
};

const INTRO: Partial<Record<UserFilter, string>> = {
  new_today: 'Signed up today (Indian time).',
  available: 'Workers who switched on “available now” and haven’t switched off.',
  workers: 'People who finished worker sign-up and can quote for jobs.',
  money: 'People with money in their TaskDrop wallet, ready or still clearing.',
  admins: 'People who can open this panel.',
  suspended: 'People who can’t sign in or withdraw right now.',
  deleted: 'Accounts that were deleted, by the person or by an admin. Their paid jobs and money records stay.',
};

export function UsersView({ d }: { d: UsersData }) {
  const now = new Date(d.now);
  const href = (over: { filter?: string; page?: number; q?: string; tag?: string }) => {
    const p = new URLSearchParams();
    const filter = over.filter ?? d.filter;
    const q = over.q ?? d.q;
    const tag = over.tag ?? d.tag;
    if (filter !== 'all') p.set('filter', filter);
    if (q) p.set('q', q);
    if (tag) p.set('tag', tag);
    if (over.page) p.set('page', String(over.page));
    const s = p.toString();
    return `/users${s ? `?${s}` : ''}`;
  };
  const label = USER_FILTERS.find((f) => f.key === d.filter)?.label ?? 'Everyone';
  const activeTag = d.allTags.find((t) => t.id === d.tag);
  const exportQs = new URLSearchParams();
  if (d.filter !== 'all') exportQs.set('filter', d.filter);
  if (d.q) exportQs.set('q', d.q);
  if (d.tag) exportQs.set('tag', d.tag);

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'People' }]}
        title="People"
        sub="Everyone who uses TaskDrop, as a poster, a worker or both. Click a name to see their jobs, wallet and payouts."
        right={
          <span className="head-controls">
            <SearchBox
              action="/users"
              defaultValue={d.q}
              placeholder="Search by name or username"
              hidden={{ ...(d.filter !== 'all' ? { filter: d.filter } : {}), ...(d.tag ? { tag: d.tag } : {}) }}
            />
            <a className="btn btn-small" href={`/api/crm/export?${exportQs.toString()}`} download>
              Download spreadsheet
            </a>
          </span>
        }
      />
      <Tabs label="Show" items={USER_FILTERS.map((f) => ({ href: href({ filter: f.key, page: 0 }), label: f.label, active: f.key === d.filter }))} />
      {d.allTags.length ? (
        <nav className="tag-filter" aria-label="Filter by tag">
          <span className="muted small">Tag:</span>
          <Link href={href({ tag: '', page: 0 })} className={d.tag ? 'tag tag-grey' : 'tag tag-grey tag-on'} scroll={false}>
            Any
          </Link>
          {d.allTags.map((t) => (
            <Link key={t.id} href={href({ tag: t.id, page: 0 })} className={`tag tag-${t.color}${d.tag === t.id ? ' tag-on' : ''}`} scroll={false}>
              {t.name} <span className="tag-n">{t.people}</span>
            </Link>
          ))}
        </nav>
      ) : null}
      <Card
        title={
          <>
            {label}
            {activeTag ? <> tagged “{activeTag.name}”</> : null}
            {d.q ? <> matching “{d.q}”</> : null}
          </>
        }
        sub={
          <>
            {d.total.toLocaleString('en-IN')} {d.total === 1 ? 'person' : 'people'}
            {INTRO[d.filter] ? <> · {INTRO[d.filter]}</> : null}
          </>
        }
        flush
      >
        {d.rows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="th">Name</th>
                  <th className="th">Does</th>
                  <th className="th">Rating</th>
                  <th className="th num">Wallet</th>
                  <th className="th">Joined</th>
                  <th className="th">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {d.rows.map((u) => (
                  <ClickRow key={u.id} href={`/users/${u.id}`}>
                    <td className="td">
                      <span className="person">
                        <span className="avatar" aria-hidden="true">
                          {initials(u.name)}
                        </span>
                        <span>
                          <Link href={`/users/${u.id}`}>{u.name}</Link>
                          <span className="muted small block">{[u.username ? `@${u.username}` : null, u.place].filter(Boolean).join(' · ') || '—'}</span>
                          {d.tagsByUser[u.id]?.length ? (
                            <span className="tag-row-inline">
                              {d.tagsByUser[u.id]!.map((t) => (
                                <TagChip key={t.id} tag={t} />
                              ))}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </td>
                    <td className="td">
                      <span className="pill-row">
                        {u.isWorker ? <Pill tone="blue">Worker</Pill> : null}
                        {u.posterReviews > 0 || !u.isWorker ? <Pill tone="grey">Poster</Pill> : null}
                        {u.availableNow ? <Pill tone="green">Available now</Pill> : null}
                        {d.suspended[u.id] !== undefined ? <Pill tone="red" title={d.suspended[u.id]}>Suspended</Pill> : null}
                        {u.deletedAt ? <Pill tone="grey">Deleted</Pill> : null}
                      </span>
                    </td>
                    <td className="td small">
                      {u.workerReviews ? `★ ${u.workerRating.toFixed(1)} as worker (${u.workerReviews})` : null}
                      {u.workerReviews && u.posterReviews ? <br /> : null}
                      {u.posterReviews ? `★ ${u.posterRating.toFixed(1)} as poster (${u.posterReviews})` : null}
                      {!u.workerReviews && !u.posterReviews ? <span className="muted">No reviews</span> : null}
                    </td>
                    <td className="td num">
                      <Money minor={u.walletMinor} />
                      {u.clearingMinor ? (
                        <span className="muted small block">
                          + <Money minor={u.clearingMinor} /> clearing
                        </span>
                      ) : null}
                    </td>
                    <td className="td nowrap">{istDate(u.joinedAt)}</td>
                    <td className="td nowrap muted">{u.lastSeenAt ? timeAgo(u.lastSeenAt, now) : '—'}</td>
                  </ClickRow>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title={d.q ? 'Nobody matches that search' : 'Nobody here yet'}>
            {d.q ? (
              <>
                Try part of the name, or <Link href={href({ q: '', page: 0 })}>clear the search</Link>.
              </>
            ) : null}
          </Empty>
        )}
        <Pager page={d.page} pageSize={d.pageSize} total={d.total} hrefFor={(page) => href({ page })} />
      </Card>
    </>
  );
}
