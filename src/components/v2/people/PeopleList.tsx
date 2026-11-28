import * as v2 from '@/components/v2/ui';
import { TagChip } from '@/components/views/PersonCrm';
import { INTRO, type UsersData } from '@/components/views/UsersView';
import { USER_FILTERS, isTestName } from '@/lib/data';
import { inr, istDate, timeAgo } from '@/lib/format';
import { initials } from '@/lib/labels';
import { isTestUserId } from '@/lib/test-data';

/**
 * Admin v2 People list (/users). Same data and links as today's UsersView; v2 table, tabs and chips.
 * `hideTest` comes from the account menu; the rows and the total are already filtered by getUsers.
 */
export function PeopleList({ d, hideTest, contactsInExport }: { d: UsersData; hideTest: boolean; contactsInExport: boolean }) {
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

  const columns: v2.Column[] = [{ label: 'Name' }, { label: 'Does' }, { label: 'Rating' }, ...(d.hideMoney ? [] : [{ label: 'Wallet', right: true }]), { label: 'Joined' }, { label: 'Last seen' }];
  const rows: v2.Row[] = d.rows.map((u) => ({
    key: u.id,
    href: `/users/${u.id}`,
    test: isTestUserId(u.id) || isTestName(u.name),
    cells: [
      <span key="n" className="wp3-who">
        <span className="wp3-av" aria-hidden="true">
          {initials(u.name)}
        </span>
        <span>
          <b>{u.name}</b>
          <span className="v2-muted small block">{[u.username ? `@${u.username}` : null, u.place].filter(Boolean).join(' · ') || '—'}</span>
          {d.tagsByUser[u.id]?.length ? (
            <span className="wp3-tags">
              {d.tagsByUser[u.id]!.map((t) => (
                <TagChip key={t.id} tag={t} />
              ))}
            </span>
          ) : null}
        </span>
      </span>,
      <span key="d" className="v2-row wp3-pills">
        {u.isWorker ? <v2.Pill tone="earn">Worker</v2.Pill> : null}
        <v2.Pill tone="ok">Poster</v2.Pill>
        {u.availableNow ? <v2.Pill tone="ok">Available now</v2.Pill> : null}
        {d.suspended[u.id] !== undefined ? (
          <v2.Pill tone="danger" title={`Suspended: ${d.suspended[u.id]}`}>
            Suspended
          </v2.Pill>
        ) : null}
        {u.deletedAt ? <v2.Pill tone="mut">Deleted</v2.Pill> : null}
      </span>,
      <span key="r" className="small">
        {u.workerReviews ? (
          <>
            Worker <b>{u.workerRating.toFixed(1)}★</b> ({u.workerReviews})
          </>
        ) : null}
        {u.workerReviews && u.posterReviews ? <br /> : null}
        {u.posterReviews ? (
          <>
            Poster <b>{u.posterRating.toFixed(1)}★</b> ({u.posterReviews})
          </>
        ) : null}
        {!u.workerReviews && !u.posterReviews ? <span className="v2-muted">No reviews</span> : null}
      </span>,
      ...(d.hideMoney
        ? []
        : [
            <span key="w">
              <b>{inr(u.walletMinor)}</b>
              {u.clearingMinor ? <span className="small v2-muted block">+ {inr(u.clearingMinor)} clearing</span> : null}
            </span>,
          ]),
      <span key="j" className="small nowrap">
        {istDate(u.joinedAt)}
      </span>,
      <span key="s" className="small nowrap">
        {u.lastSeenAt ? timeAgo(u.lastSeenAt, now) : '—'}
      </span>,
    ],
  }));

  return (
    <>
      <v2.PageHeader
        crumbs={[{ label: 'People' }]}
        title="People"
        sub={
          d.hideMoney
            ? 'Everyone who uses TaskDrop, as a poster, a worker or both. Click a name to see their jobs.'
            : 'Everyone who uses TaskDrop, as a poster, a worker or both. Click a name to see their jobs, wallet and payouts.'
        }
        right={
          <div className="v2-row">
            <v2.TableSearch action="/users" value={d.q} placeholder="Search by name or username" keep={{ filter: d.filter !== 'all' ? d.filter : undefined, tag: d.tag || undefined }} />
            {d.q ? (
              <a className="v2-btn sm" href={href({ q: '', page: 0 })}>
                Clear search
              </a>
            ) : null}
            <a className="v2-btn sm" href={`/api/crm/export?${exportQs.toString()}`} download>
              Download spreadsheet
            </a>
          </div>
        }
      />
      <v2.Tabs
        label="Show"
        items={USER_FILTERS.filter((f) => !(d.hideMoney && f.key === 'money')).map((f) => ({ href: href({ filter: f.key, page: 0 }), label: f.label, active: f.key === d.filter, hot: f.key === 'suspended' }))}
      />
      {d.allTags.length ? (
        <div className="wp3-tagfilter">
          <span className="small v2-muted">Tag:</span>
          <v2.Chips
            label="Filter by tag"
            items={[
              { href: href({ tag: '', page: 0 }), label: 'Any', active: !d.tag },
              // With test data hidden, the per-tag counts (which include test people) are left out.
              ...d.allTags.map((t) => ({ href: href({ tag: t.id, page: 0 }), label: t.name, count: hideTest ? undefined : t.people, active: d.tag === t.id })),
            ]}
          />
        </div>
      ) : null}
      {hideTest ? <v2.Note tone="gold">Test data is hidden: fake seed people and E2E test accounts are left out of this list and its count.</v2.Note> : null}
      <v2.Card
        title={
          <>
            {label}
            {activeTag ? <> · tag “{activeTag.name}”</> : null}
            {d.q ? <> · matching “{d.q}”</> : null}
            {' · '}
            {d.total.toLocaleString('en-IN')} {d.total === 1 ? 'person' : 'people'}
          </>
        }
        sub={<>{INTRO[d.filter] ? `${INTRO[d.filter]} ` : ''}Pages of 30.</>}
      >
        <v2.DataTable
          columns={columns}
          rows={rows}
          caption="People"
          empty={d.q ? `Nobody matches “${d.q}”. Try part of the name, or clear the search.` : 'Nobody in this list. Try another filter or tag.'}
        />
        <v2.Pager page={d.page} pageSize={d.pageSize} total={d.total} hrefFor={(page) => href({ page })} />
      </v2.Card>
      <p className="small v2-muted wp3-foot">
        The spreadsheet has the current view: name, does, place, joined, last seen, tags, suspended, owner
        {d.hideMoney ? '' : ', wallet and clearing'}
        {contactsInExport ? ', email and phone' : ''}. {d.hideMoney ? 'Money columns are left out for Sales. ' : ''}Every download is written to the audit log; at most 10 a minute.
      </p>
    </>
  );
}
