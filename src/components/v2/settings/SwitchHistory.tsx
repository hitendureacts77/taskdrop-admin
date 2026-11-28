import * as v2 from '@/components/v2/ui';
import { istDateTime } from '@/lib/format';
import type { HistoryRow } from '@/lib/controls-history';

/** Switch history (design swHistoryCard): every switch change, who made it and why. Also in the Audit log. */
export function SwitchHistory({ rows, error }: { rows: HistoryRow[]; error: string | null }) {
  return (
    <v2.Card
      title={
        <>
          Switch history <v2.NewTag />
        </>
      }
      sub="Every switch change, who made it and why. Also in the Audit log."
    >
      {error ? (
        <v2.ErrorState detail={error} />
      ) : (
        <v2.DataTable
          columns={[{ label: 'When' }, { label: 'Who' }, { label: 'Switch' }, { label: 'Change' }, { label: 'Why' }]}
          empty="No switch has been changed yet"
          rows={rows.map((h, i) => ({
            key: `${h.at}-${i}`,
            cells: [
              <span key="w" className="wp8a-small">
                {istDateTime(h.at)}
              </span>,
              h.who,
              <span key="s">
                {h.changes.map((c) => c.what).join(', ')}
                {h.place ? <span className="v2-muted"> · {h.place}</span> : null}
              </span>,
              <span key="c">
                {h.changes
                  .filter((c) => c.from || c.to)
                  .map((c, j) => (
                    <span key={j} className="v2-ba wp8a-ba">
                      <span className="from">{c.from}</span>→<span className="to">{c.to}</span>
                    </span>
                  ))}
              </span>,
              <span key="y" className="v2-muted wp8a-small">
                {h.why ?? '—'}
              </span>,
            ],
          }))}
        />
      )}
    </v2.Card>
  );
}
