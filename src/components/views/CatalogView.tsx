import { ConfirmAction } from '../ConfirmAction';
import { addCatalogPhrase, hideCatalogTerm, mergeCatalogTerm, removeCatalogPhrase, renameCatalogTerm, unhideCatalogTerm } from '@/lib/catalog-actions';
import { alsoMatches, filterCounts, matchesFilter, sortRows, type CatalogFilter, type CatalogKind, type CatalogRow } from '@/lib/catalog-calc';
import type { Read } from '@/lib/growth';
import { Empty, PageHeader, Pill, Tabs } from '../ui';
import { ReadError, SetupNotice } from './SetupNotice';

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

export function CatalogView({ kind, filter, rows, now, canAct }: { kind: CatalogKind; filter: CatalogFilter; rows: Read<CatalogRow[]>; now: string; canAct: boolean }) {
  const at = new Date(now);
  const noun = kind === 'skill' ? 'skill' : 'category';
  const counts = filterCounts(rows.data, at);
  const shown = sortRows(rows.data.filter((r) => matchesFilter(r, filter, at)));
  const live = rows.data.filter((r) => r.status === 'live');

  return (
    <>
      <PageHeader
        title="Skills & categories"
        sub={`Ranked by how many ${kind === 'skill' ? 'workers have each skill' : 'tasks are in each category'}. The app shows them in this order.`}
      />
      <Tabs
        label="Kind"
        items={[
          { href: href('skill', 'all'), label: 'Skills', active: kind === 'skill' },
          { href: href('category', 'all'), label: 'Categories', active: kind === 'category' },
        ]}
      />
      <Tabs
        label="Show"
        small
        items={FILTERS.map((x) => ({ href: href(kind, x.f), label: x.label, active: filter === x.f, count: rows.setup || rows.error ? undefined : counts[x.f] }))}
      />
      {rows.setup ? <SetupNotice what="Skills & categories" migration="226_own_skills" /> : null}
      {rows.error ? <ReadError message={rows.error} /> : null}
      {!rows.setup && !rows.error ? (
        shown.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="th">Rank</th>
                  <th className="th">{kind === 'skill' ? 'Skill' : 'Category'}</th>
                  <th className="th num">{kind === 'skill' ? 'Workers' : 'Tasks'}</th>
                  <th className="th">Came from</th>
                  <th className="th">Also matches</th>
                  {canAct ? <th className="th" /> : null}
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id}>
                    <td className="td tabular">{r.rank ?? '–'}</td>
                    <td className="td">
                      <strong>{r.label}</strong> {r.status === 'hidden' ? <Pill tone="red">Hidden</Pill> : null}
                    </td>
                    <td className="td num tabular">{r.uses}</td>
                    <td className="td">
                      {r.source === 'builtin' ? (
                        <Pill tone="grey">Built in</Pill>
                      ) : (
                        <Pill tone="green">
                          Added by {r.createdByName ?? 'a worker'}, {shortDate(r.createdAt)}
                        </Pill>
                      )}
                    </td>
                    <td className="td small">{alsoMatches(r)}</td>
                    {canAct ? (
                      <td className="td">
                        <Actions row={r} kind={kind} noun={noun} others={live.filter((o) => o.id !== r.id)} />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title={`No ${noun}s here`}>Nothing matches this filter.</Empty>
        )
      ) : null}
    </>
  );
}

function Actions({ row, kind, noun, others }: { row: CatalogRow; kind: CatalogKind; noun: string; others: CatalogRow[] }) {
  const builtin = row.source === 'builtin';
  return (
    <div className="row-actions">
      <ConfirmAction
        action={renameCatalogTerm}
        hidden={{ termId: row.id }}
        trigger="Rename"
        tone="quiet"
        title={`Rename “${row.label}”?`}
        consequence={`The new name shows in the app and replaces the old one on every profile and job that uses this ${noun}. The change is written to the audit log.`}
        field={{ name: 'label', label: 'New name', required: true, defaultValue: row.label }}
        confirmLabel="Rename"
      />
      <ConfirmAction
        action={addCatalogPhrase}
        hidden={{ termId: row.id }}
        trigger="Add phrase"
        tone="quiet"
        title={`Add a phrase for “${row.label}”`}
        consequence={
          <>
            Words that mean the same thing. When someone types the phrase, the app asks them to pick {row.label} instead of adding a new {noun}.
            {row.phrases.length ? (
              <span className="small muted block">Existing phrases: {row.phrases.map((p) => p.phrase).join(', ')}. Remove one with the × buttons under Phrases.</span>
            ) : null}
          </>
        }
        field={{ name: 'phrase', label: 'Phrase', required: true, placeholder: 'e.g. teaching maths' }}
        confirmLabel="Add phrase"
      />
      {row.phrases.map((p) => (
        <ConfirmAction
          key={p.id}
          action={removeCatalogPhrase}
          hidden={{ phraseId: p.id }}
          trigger={`${p.phrase} ×`}
          tone="quiet"
          title={`Remove the phrase “${p.phrase}”?`}
          consequence={`It will no longer point to ${row.label}. Anyone typing it after this can add it as a new ${noun}.`}
          confirmLabel="Remove it"
        />
      ))}
      {!builtin && row.status === 'live' && others.length ? (
        <ConfirmAction
          action={mergeCatalogTerm}
          hidden={{ fromId: row.id }}
          trigger="Merge into…"
          tone="quiet"
          title={`Merge “${row.label}” into another ${noun}`}
          consequence={`${row.uses} ${kind === 'skill' ? (row.uses === 1 ? 'worker’s profile changes' : 'workers’ profiles change') : row.uses === 1 ? 'task changes' : 'tasks change'} from ${row.label} to the one you pick. “${row.label}” then points to it, so the next person who types it is asked to pick that one.`}
          choice={{
            name: 'toId',
            label: 'Merge into',
            options: others.map((o) => ({ value: o.id, label: `${o.label} (${o.uses})` })),
            defaultValue: others[0]?.id ?? '',
          }}
          confirmLabel="Merge"
        />
      ) : null}
      {!builtin ? (
        row.status === 'hidden' ? (
          <ConfirmAction
            action={unhideCatalogTerm}
            hidden={{ termId: row.id }}
            trigger="Unhide"
            tone="quiet"
            title={`Show “${row.label}” again?`}
            consequence={`The app offers it again, in its ranked place.`}
            confirmLabel="Unhide"
          />
        ) : (
          <ConfirmAction
            action={hideCatalogTerm}
            hidden={{ termId: row.id }}
            trigger="Hide"
            tone="danger"
            title={`Hide “${row.label}”?`}
            consequence={`The app stops offering it and refuses it when typed. Profiles and jobs that already use it are not changed, and you can unhide it any time.`}
            confirmLabel="Hide it"
          />
        )
      ) : null}
    </div>
  );
}
