import { EntriesView, ENTRY_WHEN, type EntryWhen } from '@/components/views/EntriesView';
import { getLedger, isTimestamp, isUuid, requireAdmin } from '@/lib/data';
import { addIstDays, istMidnight, istParts, startOfIstDay } from '@/lib/days';
import { LEDGER_KIND } from '@/lib/labels';

type SP = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function EntriesPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const whenRaw = first(sp.when);
  const when: EntryWhen = ENTRY_WHEN.some((w) => w.key === whenRaw) ? (whenRaw as EntryWhen) : 'all';
  const kindRaw = first(sp.kind);
  const kind = kindRaw && LEDGER_KIND[kindRaw] ? kindRaw : null;

  const now = new Date();
  const { y, m } = istParts(now);
  let since: Date | undefined;
  let until: Date | undefined;
  if (when === 'today') since = startOfIstDay(now);
  else if (when === '7d') since = addIstDays(startOfIstDay(now), -6);
  else if (when === 'month') since = istMidnight(y, m, 1);
  else if (when === 'lastmonth') {
    since = istMidnight(y, m - 1, 1);
    until = istMidnight(y, m, 1);
  }

  // ?before=<created_at>|<id>: keyset paging, so lines sharing a timestamp are never skipped.
  const [cursorAt, cursorId] = (first(sp.before) ?? '').split('|');
  const cursor = cursorAt && cursorId && isTimestamp(cursorAt) && isUuid(cursorId) ? { at: cursorAt, id: cursorId } : null;

  const PAGE = 50;
  const rows = await getLedger({ kind: kind ?? undefined, since, before: until?.toISOString(), after: cursor ?? undefined, limit: PAGE + 1 });
  const entries = rows.slice(0, PAGE);
  const last = entries[entries.length - 1];
  return (
    <EntriesView
      d={{
        when,
        kind,
        entries,
        olderCursor: rows.length > PAGE && last ? `${last.at}|${last.id}` : null,
        isFirstPage: !cursor,
      }}
    />
  );
}
