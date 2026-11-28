import * as v2 from '@/components/v2/ui';
import { Confirm } from '@/components/v2/Confirm';
import { addCatalogPhrase, hideCatalogTerm, mergeCatalogTerm, removeCatalogPhrase, renameCatalogTerm, unhideCatalogTerm } from '@/lib/catalog-actions';
import { filterCounts, isNewThisWeek, matchesFilter, sortRows, type CatalogFilter, type CatalogKind, type CatalogRow } from '@/lib/catalog-calc';
import type { Read } from '@/lib/growth';
import { isTestTitle } from '@/lib/test-data';

/**
 * Admin v2 Skills & categories (WP9, F310–F317). Same data and server actions
 * as today's CatalogView; only the look and the confirm boxes change.
 */

const FILTERS: { f: CatalogFilter; label: string }[] = [
  { f: 'all', label: 'All' },
  { f: 'added', label: 'Added by workers' },
  { f: 'new', label: 'New this week' },
  { f: 'hidden', label: 'Hidden' },
];

function href(kind: CatalogKind, f: CatalogFilter): string {
  const q = new URLSearchParams();
  if (kind === 'category') q.set('kind', 'category');
  if (f !== 'all') q.set('f', f);
  const s = q.toString();
  return s ? `/catalog?${s}` : '/catalog';
}

function shortDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(iso));
}

/** Live rows count for a kind tab (hidden ones included, merged never). */
function liveCount(r: Read<CatalogRow[]>): number | undefined {
  return r.setup || r.error ? undefined : r.data.filter((x) => x.status !== 'merged').length;
}

export function CatalogV2({
  kind,
  filter,
  rows,
  other,
  now,
  canAct,
  hideTest,
}: {
  kind: CatalogKind;
  filter: CatalogFilter;
  rows: Read<CatalogRow[]>;
  /** The other kind's list, only for the count on its tab. */
  other: Read<CatalogRow[]>;
  now: string;
  canAct: boolean;
  hideTest: boolean;
}) {
  const at = new Date(now);
  const noun = kind === 'skill' ? 'skill' : 'category';
  const nouns = kind === 'skill' ? 'skills' : 'categories';
  const data = rows.data.filter((r) => !hideTest || !isTestTitle(r.label));
  const counts = filterCounts(data, at);
  const shown = sortRows(data.filter((r) => matchesFilter(r, filter, at)));
  const live = data.filter((r) => r.status === 'live');
  const skills = kind === 'skill' ? liveCount(rows) : liveCount(other);
  const cats = kind === 'category' ? liveCount(rows) : liveCount(other);
  const newAdded = data.filter((r) => r.status === 'live' && r.source === 'user' && isNewThisWeek(r, at)).length;

  return (
    <>
      <v2.PageHeader
        title="Skills & categories"
        sub={kind === 'skill' ? 'Ranked by how many workers have each skill. The app shows them in this order.' : 'Ranked by how many tasks are in each category. The app shows them in this order.'}
        crumbs={[{ label: 'Help & safety', href: '/support' }, { label: 'Skills & categories' }]}
      />
      <v2.Tabs
        label="Kind"
        items={[
          { href: href('skill', 'all'), label: 'Skills', count: skills, active: kind === 'skill' },
          { href: href('category', 'all'), label: 'Categories', count: cats, active: kind === 'category' },
        ]}
      />
      <v2.Chips
        label="Show"
        items={FILTERS.map((x) => ({ href: href(kind, x.f), label: x.label, active: filter === x.f, count: rows.setup || rows.error ? undefined : counts[x.f] }))}
      />
      {rows.setup ? <v2.SetupNotice what="Skills & categories" /> : null}
      {rows.error ? <v2.ErrorState detail={rows.error} retryHref={href(kind, filter)} /> : null}
      {!rows.setup && !rows.error ? (
        <>
          {newAdded ? (
            <v2.Note tone="blue">
              <b>
                {newAdded} new {newAdded === 1 ? noun : nouns}
              </b>{' '}
              {newAdded === 1 ? 'was' : 'were'} added by {kind === 'skill' ? 'workers' : 'people'} this week. Merge typos into the right {noun}, and hide junk.
            </v2.Note>
          ) : null}
          {canAct ? null : (
            <v2.Note tone="blue" title="View only">
              You can look, but only Admin, Support and Sales can change the list.
            </v2.Note>
          )}
          <v2.Card
            title={`${shown.length} ${shown.length === 1 ? noun : nouns} shown`}
            sub="Built-in ones can be renamed and get phrases. Ones added by workers can also be merged or hidden."
          >
            <v2.DataTable
              caption={`${nouns} ranked`}
              columns={[{ label: 'Rank' }, { label: kind === 'skill' ? 'Skill' : 'Category' }, { label: kind === 'skill' ? 'Workers' : 'Tasks', right: true }, { label: 'Came from' }, { label: 'Also matches' }, { label: '' }]}
              empty="Nothing here. Try another filter."
              rows={shown.map((r) => ({
                key: r.id,
                test: !hideTest && isTestTitle(r.label),
                cells: [
                  <b key="rank">{r.rank != null ? `#${r.rank}` : '–'}</b>,
                  <span key="name" className="wp9-name">
                    <b>{r.label}</b>
                    {r.status === 'hidden' ? <v2.Pill tone="mut">Hidden</v2.Pill> : null}
                    {r.source === 'user' && isNewThisWeek(r, at) ? <v2.Pill tone="earn">New this week</v2.Pill> : null}
                  </span>,
                  r.uses.toLocaleString('en-IN'),
                  <span key="src" className="wp9-small">
                    {r.source === 'builtin' ? 'Built in' : `Added by ${r.createdByName ?? 'a worker'}, ${shortDate(r.createdAt)}`}
                  </span>,
                  <Phrases key="ph" row={r} noun={noun} />,
                  <Actions key="act" row={r} kind={kind} noun={noun} others={live.filter((o) => o.id !== r.id)} />,
                ],
              }))}
            />
          </v2.Card>
        </>
      ) : null}
    </>
  );
}

function Phrases({ row, noun }: { row: CatalogRow; noun: string }) {
  if (!row.phrases.length && !row.mergedLabels.length) return <span className="wp9-small wp9-muted">None</span>;
  return (
    <span className="wp9-phrases">
      {row.phrases.map((p) => (
        <span key={p.id} className="wp9-phrase">
          {p.phrase}
          <Confirm
            action={removeCatalogPhrase}
            hidden={{ phraseId: p.id }}
            label={<span aria-label={`Remove the phrase ${p.phrase}`}>×</span>}
            tier={2}
            area="people"
            tone="plain"
            small
            title={`Remove “${p.phrase}”?`}
            body={<p>Typing “{p.phrase}” no longer points to {row.label}. Anyone typing it after this can add it as a new {noun}.</p>}
            confirmLabel="Remove phrase"
          />
        </span>
      ))}
      {row.mergedLabels.map((m) => (
        <span key={`m-${m}`} className="wp9-phrase" title="Merged into this one">
          {m}
        </span>
      ))}
    </span>
  );
}

function Actions({ row, kind, noun, others }: { row: CatalogRow; kind: CatalogKind; noun: string; others: CatalogRow[] }) {
  const user = row.source === 'user';
  const target = others[0];
  return (
    <span className="wp9-acts">
      <Confirm
        action={renameCatalogTerm}
        hidden={{ termId: row.id }}
        label="Rename"
        tier={2}
        area="people"
        tone="plain"
        small
        title={`Rename “${row.label}”?`}
        body={<p>The new name shows in the app and replaces the old one on every profile and job that uses this {noun}. The change is written to the audit log.</p>}
        fields={
          <>
            <label htmlFor={`wp9-ren-${row.id}`}>New name</label>
            <input id={`wp9-ren-${row.id}`} name="label" defaultValue={row.label} required minLength={2} maxLength={60} autoComplete="off" />
          </>
        }
        confirmLabel="Rename"
      />
      <Confirm
        action={addCatalogPhrase}
        hidden={{ termId: row.id }}
        label="Add phrase"
        tier={2}
        area="people"
        tone="plain"
        small
        title={`Add a phrase for “${row.label}”`}
        body={
          <p>
            Words that mean the same thing. When someone types the phrase, the app asks them to pick {row.label} instead of adding a new {noun}.
          </p>
        }
        fields={
          <>
            <label htmlFor={`wp9-ph-${row.id}`}>Phrase</label>
            <input id={`wp9-ph-${row.id}`} name="phrase" required maxLength={60} placeholder="e.g. tap repair" autoComplete="off" />
          </>
        }
        confirmLabel="Add phrase"
      />
      {user && row.status === 'live' && target ? (
        <Confirm
          action={mergeCatalogTerm}
          hidden={{ fromId: row.id }}
          label="Merge into…"
          tier={2}
          area="people"
          tone="plain"
          small
          title={`Merge “${row.label}” into another ${noun}?`}
          body={
            <p>
              {row.uses} {kind === 'skill' ? (row.uses === 1 ? 'worker’s profile changes' : 'workers’ profiles change') : row.uses === 1 ? 'task changes' : 'tasks change'} from {row.label} to the one you
              pick. “{row.label}” then points to it, so the next person who types it is asked to pick that one.
            </p>
          }
          fields={
            <>
              <label htmlFor={`wp9-mg-${row.id}`}>Merge into</label>
              <select id={`wp9-mg-${row.id}`} name="toId" defaultValue={target.id}>
                {others.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label} ({o.uses})
                  </option>
                ))}
              </select>
            </>
          }
          confirmLabel="Merge"
        />
      ) : null}
      {user ? (
        row.status === 'hidden' ? (
          <Confirm
            action={unhideCatalogTerm}
            hidden={{ termId: row.id }}
            label="Unhide"
            tier={2}
            area="people"
            tone="plain"
            small
            title={`Unhide “${row.label}”?`}
            body={<p>The app offers it again, in its ranked place.</p>}
            confirmLabel="Unhide"
          />
        ) : (
          <Confirm
            action={hideCatalogTerm}
            hidden={{ termId: row.id }}
            label="Hide"
            tier={2}
            area="people"
            tone="plain"
            small
            title={`Hide “${row.label}”?`}
            body={<p>The app stops offering it and refuses it when typed. Profiles and jobs that already use it are not changed, and you can unhide it any time.</p>}
            confirmLabel="Hide"
          />
        )
      ) : null}
    </span>
  );
}
