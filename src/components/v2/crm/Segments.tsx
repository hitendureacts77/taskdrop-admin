/** v2 Segments with the filter builder, /crm/segments (F342-F351). */
import Link from 'next/link';
import * as v2 from '@/components/v2/ui';
import { Confirm } from '@/components/v2/Confirm';
import { criteriaToQuery, describeCriteria, hasFilters, type Criteria, type MemberRow, type Segment, type TagWithCount } from '@/lib/crm';
import { deleteSegment } from '@/lib/crm-actions';
import { inr, istDate, timeAgo } from '@/lib/format';
import { isTestUserId } from '@/lib/test-data';
import { OwnerBarV2, PickV2, SaveSegmentV2 } from './forms';
import { CUSTOMERS_CRUMB, Who, nf } from './shared';

export type SegmentsV2Data = {
  criteria: Criteria;
  tags: TagWithCount[];
  rows: MemberRow[];
  total: number;
  page: number;
  pageSize: number;
  segments: Segment[];
  now: string;
  /** 'anyone', 'me', 'nobody' or a staff member's id. */
  owner: string;
  staff: { id: string; name: string }[];
  me: string;
  canEdit: boolean;
  hideMoney: boolean;
  hideTest: boolean;
};

export function SegmentsV2({ d }: { d: SegmentsV2Data }) {
  const now = new Date(d.now);
  const c = d.criteria;
  const query = criteriaToQuery(c);
  const ownerQuery = d.owner === 'anyone' ? '' : `owner=${encodeURIComponent(d.owner)}`;
  const ownered = [query, ownerQuery].filter(Boolean).join('&');
  const withPage = (page: number) => {
    const q = [ownered, page ? `page=${page}` : ''].filter(Boolean).join('&');
    return `/crm/segments${q ? `?${q}` : ''}`;
  };
  const ownerHref = (o: string) => {
    const q = [query, o === 'anyone' ? '' : `owner=${encodeURIComponent(o)}`].filter(Boolean).join('&');
    return `/crm/segments${q ? `?${q}` : ''}`;
  };
  const ownerFiltered = d.owner !== 'anyone';
  const staffName = (id: string) => d.staff.find((s) => s.id === id)?.name ?? 'someone else';
  const tags = d.hideTest ? d.tags.filter((t) => !t.testOnly) : d.tags;
  const describe = [describeCriteria(c, d.tags), ownerFiltered ? (d.owner === 'me' ? 'looked after by you' : d.owner === 'nobody' ? 'with no owner' : `looked after by ${staffName(d.owner)}`) : '']
    .filter(Boolean)
    .join(' · ');

  const columns: v2.Column[] = [
    ...(d.canEdit ? [{ label: 'Tick' }] : []),
    { label: 'Name' },
    { label: 'Does' },
    ...(d.hideMoney ? [] : [{ label: 'Wallet', right: true }]),
    { label: 'Joined' },
    { label: 'Last seen' },
    { label: 'Owner' },
  ];

  return (
    <>
      <v2.PageHeader title="Segments" sub="Find a group of people by what they do. Preview it, save it, message it, or download it." crumbs={[CUSTOMERS_CRUMB, { label: 'Segments' }]} />

      <v2.Tabs
        label="Looked after by"
        items={[
          { href: ownerHref('anyone'), label: 'Everyone’s customers', active: d.owner === 'anyone' },
          { href: ownerHref('me'), label: 'My customers', active: d.owner === 'me' },
          { href: ownerHref('nobody'), label: 'No owner', active: d.owner === 'nobody' },
          ...(ownerFiltered && d.owner !== 'me' && d.owner !== 'nobody' ? [{ href: ownerHref(d.owner), label: `${staffName(d.owner)}’s`, active: true }] : []),
        ]}
      />

      <v2.Card title="Find people" sub="Leave anything blank to ignore it. Suspended people are left out unless you tick the box.">
        <form key={`${query}|${d.owner}`} action="/crm/segments" method="get" className="wp6-seg">
          <div>
            <label htmlFor="sg-role">Who</label>
            <select id="sg-role" name="role" defaultValue={c.role ?? 'any'}>
              <option value="any">Everyone</option>
              <option value="worker">Workers</option>
              <option value="poster">People who only post</option>
            </select>
          </div>
          <div>
            <label htmlFor="sg-joined">Joined in the last (days)</label>
            <input id="sg-joined" name="joined" type="number" min={1} max={3650} defaultValue={c.joined_within_days ?? ''} placeholder="any time" />
          </div>
          <div>
            <label htmlFor="sg-inactive">Not seen for (days)</label>
            <input id="sg-inactive" name="inactive" type="number" min={1} max={3650} defaultValue={c.inactive_days ?? ''} placeholder="doesn’t matter" />
          </div>
          <div>
            <label htmlFor="sg-tag">Has the tag</label>
            <select id="sg-tag" name="tag" defaultValue={c.tag_id ?? ''}>
              <option value="">Any (or none)</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({nf(t.people)})
                </option>
              ))}
            </select>
          </div>
          {d.hideMoney ? null : (
            <div>
              <label htmlFor="sg-wallet">Wallet holds at least (₹)</label>
              <input id="sg-wallet" name="minwallet" type="number" min={0} step="1" defaultValue={c.min_wallet_minor ? c.min_wallet_minor / 100 : ''} placeholder="any amount" />
            </div>
          )}
          <div>
            <label htmlFor="sg-platform">Uses</label>
            <select id="sg-platform" name="platform" defaultValue={c.platform ?? ''}>
              <option value="">Any platform</option>
              <option value="android">Android</option>
              <option value="ios">iOS</option>
              <option value="web">Web</option>
            </select>
          </div>
          <div>
            <label htmlFor="sg-below">App older than</label>
            <input id="sg-below" name="below" type="text" inputMode="decimal" pattern="[0-9]{1,6}(\.[0-9]{1,6}){0,2}" maxLength={20} defaultValue={c.app_version_below ?? ''} placeholder="e.g. 1.4.0" />
          </div>
          <div>
            <label htmlFor="sg-owner">Looked after by</label>
            <select id="sg-owner" name="owner" defaultValue={d.owner}>
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
          </div>
          <fieldset>
            <legend className="sr-only">More filters</legend>
            <label className="wp6-check">
              <input type="checkbox" name="never_posted" value="1" defaultChecked={c.never_posted} /> Never posted a job
            </label>
            <label className="wp6-check">
              <input type="checkbox" name="live" value="1" defaultChecked={c.available_now} /> Available now
            </label>
            <label className="wp6-check">
              <input type="checkbox" name="suspended" value="1" defaultChecked={c.include_suspended} /> Include suspended
            </label>
          </fieldset>
          <div className="v2-row wp6-seg-go">
            <button type="submit" className="v2-btn pri sm">
              Show who matches
            </button>
            {hasFilters(c) || ownerFiltered ? (
              <Link className="v2-btn sm" href="/crm/segments">
                Clear filters
              </Link>
            ) : null}
          </div>
        </form>
      </v2.Card>

      <div className="wp6-gap">
        <v2.Card title={`${nf(d.total)} ${d.total === 1 ? 'person matches' : 'people match'}`} sub={describe}>
          {d.total > 0 ? (
            <div className="v2-row wp6-bar">
              {ownerFiltered ? null : (
                <Link className="v2-btn sm" href={`/crm/messages${query ? `?${query}` : ''}`}>
                  Message them
                </Link>
              )}
              <a className="v2-btn sm" href={`/api/crm/export?segment=1${ownered ? `&${ownered}` : ''}`} download>
                Download spreadsheet
              </a>
              {d.canEdit && hasFilters(c) && !ownerFiltered ? <SaveSegmentV2 query={query} /> : null}
            </div>
          ) : null}
          {d.hideTest ? <p className="v2-muted wp6-small">Test accounts are left out of this list and its count. A message still goes to everyone who matches.</p> : null}
          {d.canEdit && d.rows.length ? <OwnerBarV2 staff={d.staff} me={d.me} /> : null}
          <v2.DataTable
            caption="People who match"
            columns={columns}
            empty="Nobody matches. Change the filters above."
            rows={d.rows.map((u) => ({
              key: u.id,
              cells: [
                ...(d.canEdit ? [<PickV2 key="t" id={u.id} name={u.name} />] : []),
                <Who
                  key="n"
                  id={u.id}
                  name={u.name}
                  test={!d.hideTest && isTestUserId(u.id)}
                  sub={u.tags.length ? u.tags.map((t) => t.name).join(' · ') : undefined}
                />,
                <span key="d" className="v2-row wp6-tight">
                  <v2.Pill tone={u.isWorker ? 'earn' : 'ok'}>{u.isWorker ? 'Worker' : 'Poster'}</v2.Pill>
                  {u.suspended ? <v2.Pill tone="danger">Suspended</v2.Pill> : null}
                </span>,
                ...(d.hideMoney ? [] : [inr(u.walletMinor + u.clearingMinor)]),
                <span key="j" className="wp6-small">
                  {istDate(u.joinedAt)}
                </span>,
                <span key="s" className="wp6-small">
                  {u.lastSeenAt ? timeAgo(u.lastSeenAt, now) : '—'}
                </span>,
                <span key="o" className="wp6-small">
                  {u.owner ? u.owner.name : <span className="v2-muted">No owner</span>}
                </span>,
              ],
            }))}
          />
          <v2.Pager page={d.page} pageSize={d.pageSize} total={d.total} hrefFor={withPage} />
        </v2.Card>
      </div>

      <div className="wp6-gap">
        <v2.Card title="Saved segments" sub={`Counts are live.${d.hideMoney ? ' Segments that filter by wallet are hidden for your role.' : ''}`}>
          <v2.DataTable
            caption="Saved segments"
            columns={[{ label: 'Name' }, { label: 'People now', right: true }, { label: 'Saved' }, { label: '' }]}
            empty="None yet. Pick some filters above, press “Show who matches”, then save the group."
            rows={d.segments.map((s) => {
              const q = criteriaToQuery(s.criteria);
              return {
                key: s.id,
                cells: [
                  <span key="n" className="wp6-msg">
                    <b>{s.name}</b>
                    <span className="v2-muted">{s.description}</span>
                  </span>,
                  nf(s.people),
                  <span key="d" className="wp6-small">
                    {istDate(s.createdAt)}
                  </span>,
                  <span key="a" className="v2-row wp6-tight wp6-end">
                    <Link className="v2-btn sm" href={`/crm/segments${q ? `?${q}` : ''}`}>
                      Open
                    </Link>
                    <Link className="v2-btn sm" href={`/crm/messages?audience=segment:${s.id}`}>
                      Message
                    </Link>
                    <Confirm
                      action={deleteSegment}
                      hidden={{ segmentId: s.id }}
                      label="Delete"
                      tier={2}
                      area="people"
                      tone="danger"
                      small
                      title={`Delete the segment “${s.name}”?`}
                      body={<p>Only the saved filters go. Nobody is told and nothing changes for the people in it.</p>}
                      confirmLabel="Delete segment"
                    />
                  </span>,
                ],
              };
            })}
          />
        </v2.Card>
      </div>
    </>
  );
}
