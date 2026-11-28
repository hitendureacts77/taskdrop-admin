import Link from 'next/link';
import * as v2 from '@/components/v2/ui';
import { EVENT_WORDS, type AuditRow } from '@/lib/admin-config';
import type { AuditScope } from '@/lib/audit-scope';
import { auditArea, auditChanges, auditReason, auditSentence, diffMaps, V2_AUDIT_AREAS } from '@/lib/audit-words';
import { istDateTime, timeAgo } from '@/lib/format';
import type { StaffRole } from '@/lib/staff-roles';
import { isTestUserId } from '@/lib/test-data';
import { SettingsToolsHead } from './SettingsToolsHead';

const LINES: { key: AuditScope; label: string }[] = [
  { key: 'default', label: 'Without heartbeats' },
  { key: 'staff', label: 'Staff only' },
  { key: 'all', label: 'Every line' },
];

function hrefOf(r: AuditRow): string | null {
  if (r.table === 'payouts' && r.targetId) return `/payouts/${r.targetId}`;
  if (r.personId) return `/users/${r.personId}`;
  if (r.taskId) return `/tasks/${r.taskId}`;
  return null;
}

function About({ r }: { r: AuditRow }) {
  if (r.personId && r.table !== 'payouts') {
    return (
      <div className="v2-muted wp8b-sm">
        About <Link href={`/users/${r.personId}`}>{r.personName}</Link>
      </div>
    );
  }
  if (r.taskId) {
    return (
      <div className="v2-muted wp8b-sm">
        About job <Link href={`/tasks/${r.taskId}`}>{r.taskTitle ?? 'this job'}</Link>
      </div>
    );
  }
  if (r.table === 'payouts' && r.targetId) {
    return (
      <div className="v2-muted wp8b-sm">
        About <Link href={`/payouts/${r.targetId}`}>this withdrawal</Link>
      </div>
    );
  }
  return null;
}

function What({ r }: { r: AuditRow }) {
  const sentence = auditSentence(r, EVENT_WORDS);
  const href = hrefOf(r);
  const changes = auditChanges(r);
  const why = auditReason(r);
  const maps = diffMaps(changes);
  const showDetail = r.detail && r.table !== 'event' && !why;
  return (
    <div className="wp8b-what">
      <div>{href ? <Link href={href}>{sentence}</Link> : sentence}</div>
      <About r={r} />
      {changes.length ? <v2.DiffList before={maps.before} after={maps.after} /> : null}
      {why ? <div className="wp8b-sm">Why: “{why}”</div> : null}
      {showDetail ? <div className="v2-muted wp8b-sm">{r.detail}</div> : null}
      <details className="wp8b-raw">
        <summary>Technical details (for the developer)</summary>
        <pre className="v2-mono">{JSON.stringify({ action: r.action, table: r.table, target: r.targetId, before: r.before, after: r.after, detail: r.detail }, null, 2)}</pre>
      </details>
    </div>
  );
}

/** Audit log (F438–F442): areas, which lines, search, plain before → after, pages of 40. */
export function AuditV2({
  rows,
  total,
  table,
  page,
  pageSize,
  scope,
  q,
  role,
  now: nowIso,
}: {
  rows: AuditRow[];
  total: number;
  table: string | null;
  page: number;
  pageSize: number;
  scope: AuditScope;
  q: string;
  role: StaffRole;
  now: string;
}) {
  const now = new Date(nowIso);
  const href = (o: { t?: string | null; s?: AuditScope; p?: number; q?: string }) => {
    const t = o.t === undefined ? table : o.t;
    const s = o.s ?? scope;
    const qq = o.q ?? q;
    const params = new URLSearchParams({ ...(t ? { table: t } : {}), ...(s !== 'default' ? { who: s } : {}), ...(qq ? { q: qq } : {}), ...(o.p ? { page: String(o.p) } : {}) });
    const qs = params.toString();
    return `/settings/audit${qs ? `?${qs}` : ''}`;
  };
  return (
    <>
      <SettingsToolsHead active="/settings/audit" role={role} sub="Every change to money, settings and admin access, recorded by the database. Nobody can edit or delete these lines." />
      <v2.Chips
        label="Area"
        items={[{ href: href({ t: null }), label: 'Everything', active: !table }, ...Object.entries(V2_AUDIT_AREAS).map(([k, label]) => ({ href: href({ t: k }), label, active: table === k }))]}
      />
      <div className="wp8b-bar">
        <v2.Chips label="Which lines" items={LINES.map((l) => ({ href: href({ s: l.key }), label: l.label, active: scope === l.key }))} />
        <div className="v2-row">
          <v2.TableSearch action="/settings/audit" value={q} placeholder="Search what happened" keep={{ table: table ?? undefined, who: scope !== 'default' ? scope : undefined }} />
          <v2.NewTag />
        </div>
      </div>
      <v2.Card title="Audit log" sub="Before → after is written in plain words. Pages of 40.">
        <v2.DataTable
          columns={[{ label: 'When' }, { label: 'Who' }, { label: 'Area' }, { label: 'What happened' }]}
          empty={q ? `Nothing matches “${q}”.` : table ? 'Nothing in this area yet.' : 'Nothing recorded yet.'}
          rows={rows.map((r) => ({
            key: String(r.id),
            test: isTestUserId(r.personId),
            cells: [
              <span className="wp8b-when" title={istDateTime(r.at)}>
                {istDateTime(r.at)}
                <span className="v2-muted wp8b-sm">{timeAgo(r.at, now)}</span>
              </span>,
              r.actor ? <Link href={`/users/${r.actor}`}>{r.actorName}</Link> : <span className="v2-muted">{r.actorName}</span>,
              <v2.Pill tone="mut">{auditArea(r.table)}</v2.Pill>,
              <What r={r} />,
            ],
          }))}
        />
        <v2.Pager page={page} pageSize={pageSize} total={total} hrefFor={(p) => href({ p })} />
      </v2.Card>
    </>
  );
}
