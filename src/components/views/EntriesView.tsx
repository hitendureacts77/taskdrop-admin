import Link from 'next/link';
import { ClickRow } from '../Clickable';
import type { LedgerEntry } from '@/lib/data';
import { istDateTime } from '@/lib/format';
import { LEDGER_KIND, ledgerKind } from '@/lib/labels';
import { Card, Empty, JobLink, Money, PageHeader, Pill, Tabs } from '../ui';

export const ENTRY_WHEN = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 days' },
  { key: 'month', label: 'This month' },
  { key: 'lastmonth', label: 'Last month' },
  { key: 'all', label: 'All time' },
] as const;
export type EntryWhen = (typeof ENTRY_WHEN)[number]['key'];

export type EntriesData = {
  when: EntryWhen;
  kind: string | null;
  entries: LedgerEntry[];
  /** Pass as ?before= to load the next (older) page, or null when this is the end. */
  olderCursor: string | null;
  isFirstPage: boolean;
};

export function EntriesView({ d }: { d: EntriesData }) {
  const qs = (over: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const merged = { when: d.when, kind: d.kind, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/money/entries?${p.toString()}`;
  };
  const sum = d.entries.reduce((a, l) => a + l.amount, 0);
  const whenLabel = ENTRY_WHEN.find((w) => w.key === d.when)?.label ?? '';
  const kindLabel = d.kind ? ledgerKind(d.kind).label : 'All types';

  return (
    <>
      <PageHeader
        crumbs={[{ href: '/money', label: 'Earnings & escrow' }, { label: 'Entries' }]}
        title="Earnings entries"
        sub="Every rupee TaskDrop has earned, one line per earning, with the job it came from."
      />
      <div className="filters">
        <Tabs label="When" items={ENTRY_WHEN.map((w) => ({ href: qs({ when: w.key, before: null }), label: w.label, active: w.key === d.when }))} small />
        <Tabs
          label="Type"
          small
          items={[
            { href: qs({ kind: null }), label: 'All types', active: !d.kind },
            ...Object.entries(LEDGER_KIND).map(([k, v]) => ({ href: qs({ kind: k }), label: v.label, active: d.kind === k })),
          ]}
        />
      </div>
      <Card
        title={`${kindLabel} · ${whenLabel}`}
        sub={
          d.entries.length ? (
            <>
              {d.entries.length} entr{d.entries.length === 1 ? 'y' : 'ies'} on this page, adding up to <Money minor={sum} />.
            </>
          ) : undefined
        }
        flush
      >
        {d.entries.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="th">When</th>
                  <th className="th">Type</th>
                  <th className="th">Job</th>
                  <th className="th">Note</th>
                  <th className="th num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {d.entries.map((l) => {
                  const k = ledgerKind(l.kind);
                  return (
                    <ClickRow key={l.id} href={l.taskId ? `/tasks/${l.taskId}` : qs({ kind: l.kind, before: null })}>
                      <td className="td nowrap">{istDateTime(l.at)}</td>
                      <td className="td">
                        <Pill tone={k.tone}>{k.label}</Pill>
                      </td>
                      <td className="td">{l.taskId ? <JobLink id={l.taskId} title={l.title ?? 'Job'} /> : <span className="muted">—</span>}</td>
                      <td className="td muted small">{l.note ?? ''}</td>
                      <td className="td num">
                        <Money minor={l.amount} />
                      </td>
                    </ClickRow>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Nothing here">No {d.kind ? ledgerKind(d.kind).label.toLowerCase() : 'earnings'} were booked {whenLabel === 'All time' ? 'yet' : `in ${whenLabel.toLowerCase()}`}.</Empty>
        )}
        {!d.isFirstPage || d.olderCursor ? (
          <div className="pager">
            <span />
            <span className="pager-links">
              {!d.isFirstPage ? (
                <Link className="btn btn-small" href={qs({ before: null })}>
                  ← Newest
                </Link>
              ) : null}
              {d.olderCursor ? (
                <Link className="btn btn-small" href={qs({ before: d.olderCursor })}>
                  Older →
                </Link>
              ) : null}
            </span>
          </div>
        ) : null}
      </Card>
    </>
  );
}
