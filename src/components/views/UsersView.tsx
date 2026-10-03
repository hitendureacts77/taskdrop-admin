import Link from 'next/link';
import type { UserFilter, UserRow } from '@/lib/data';
import { USER_FILTERS } from '@/lib/data';
import { istDate, timeAgo } from '@/lib/format';
import { initials } from '@/lib/labels';
import { Card, Empty, Money, PageHeader, Pager, Pill, SearchBox, Tabs } from '../ui';

export type UsersData = { now: string; filter: UserFilter; q: string; page: number; pageSize: number; rows: UserRow[]; total: number };

const INTRO: Partial<Record<UserFilter, string>> = {
  new_today: 'Signed up today (Indian time).',
  available: 'Workers who switched on “available now” and haven’t switched off.',
  workers: 'People who finished worker sign-up and can quote for jobs.',
  money: 'People with money in their TaskDrop wallet, ready or still clearing.',
  admins: 'People who can open this panel.',
};

export function UsersView({ d }: { d: UsersData }) {
  const now = new Date(d.now);
  const href = (over: { filter?: string; page?: number; q?: string }) => {
    const p = new URLSearchParams();
    const filter = over.filter ?? d.filter;
    const q = over.q ?? d.q;
    if (filter !== 'all') p.set('filter', filter);
    if (q) p.set('q', q);
    if (over.page) p.set('page', String(over.page));
    const s = p.toString();
    return `/users${s ? `?${s}` : ''}`;
  };
  const label = USER_FILTERS.find((f) => f.key === d.filter)?.label ?? 'Everyone';

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'People' }]}
        title="People"
        sub="Everyone who uses TaskDrop, as a poster, a worker or both. Click a name to see their jobs, wallet and payouts."
        right={<SearchBox action="/users" defaultValue={d.q} placeholder="Search by name or username" hidden={d.filter !== 'all' ? { filter: d.filter } : undefined} />}
      />
      <Tabs label="Show" items={USER_FILTERS.map((f) => ({ href: href({ filter: f.key, page: 0 }), label: f.label, active: f.key === d.filter }))} />
      <Card
        title={
          <>
            {label}
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
                  <tr key={u.id}>
                    <td className="td">
                      <span className="person">
                        <span className="avatar" aria-hidden="true">
                          {initials(u.name)}
                        </span>
                        <span>
                          <Link href={`/users/${u.id}`}>{u.name}</Link>
                          <span className="muted small block">{[u.username ? `@${u.username}` : null, u.place].filter(Boolean).join(' · ') || '—'}</span>
                        </span>
                      </span>
                    </td>
                    <td className="td">
                      <span className="pill-row">
                        {u.isWorker ? <Pill tone="blue">Worker</Pill> : null}
                        {u.posterReviews > 0 || !u.isWorker ? <Pill tone="grey">Poster</Pill> : null}
                        {u.availableNow ? <Pill tone="green">Available now</Pill> : null}
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
                  </tr>
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
