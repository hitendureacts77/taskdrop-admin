'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { useLive } from '@/components/LiveProvider';
import {
  describeSla,
  NEEDS_DEADLINE_HOURS,
  NEEDS_FILTER_LABEL,
  NEEDS_FILTER_ORDER,
  NEEDS_ICON,
  NEEDS_LABEL,
  needsFilterHref,
  needsSummary,
  visibleNeeds,
  waitingFor,
  type NeedsFilter,
  type NeedsKind,
  type RankedNeed,
} from '@/lib/needs-you';
import { staffCanSee } from '@/lib/staff-roles';
import { useV2 } from '../V2Frame';
import * as v2 from '../ui';

/**
 * Admin v2 "Needs you": the one list of waiting work (withdrawals, refunds,
 * disputes, help requests, copyright notices), most urgent first. Same live
 * data as today's NeedsYou (LiveProvider), with the kind filter, the
 * "Hide test data" switch and a promise bar per row.
 */

const SLA_TONE = { late: 'danger', soon: 'bad', ok: 'ok' } as const;
const ICON_TONE: Record<NeedsKind, string> = { payout: 'gold', refund: 'jade', dispute: 'orange', help: 'blue', copyright: 'red' };
const ACTION: Record<NeedsKind, string> = { payout: 'Pay', refund: 'Review', dispute: 'Decide', help: 'Reply', copyright: 'Decide' };
const HOUR = 3_600_000;

function useNow() {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  return nowMs;
}

function PromiseBar({ n, nowMs }: { n: RankedNeed; nowMs: number }) {
  const windowMs = NEEDS_DEADLINE_HOURS[n.kind] * HOUR;
  const ratio = Math.min(1, Math.max(0, (windowMs - n.sla.msLeft) / windowMs));
  return (
    <div className="wp4-wbar">
      <span className="tr" aria-hidden="true">
        <span className={`fi ${n.sla.state}`} style={{ width: `${Math.max(4, ratio * 100)}%` }} />
      </span>
      <span>
        {n.sla.state === 'late' ? <b className="late">{describeSla(n.sla)}</b> : describeSla(n.sla)} · waiting {waitingFor(n.since, nowMs)} · {NEEDS_DEADLINE_HOURS[n.kind]} h promise
      </span>
    </div>
  );
}

function Row({ n, nowMs, short }: { n: RankedNeed; nowMs: number; short: boolean }) {
  return (
    <li className={`wp4-ibx${n.sla.state === 'late' ? ' late' : ''}`}>
      <span className={`ic ${ICON_TONE[n.kind]}`} aria-hidden="true">
        <Icon name={NEEDS_ICON[n.kind]} size={16} />
      </span>
      <div className="body">
        <div className="t">
          <Link href={n.href}>{n.title}</Link> <v2.TestTag show={Boolean(n.test)} />
        </div>
        <div className="meta">
          {NEEDS_LABEL[n.kind]} · {n.sub}
        </div>
        {short ? (
          <div className="wp4-when">
            <v2.Pill tone={SLA_TONE[n.sla.state]} title={`Promised within ${NEEDS_DEADLINE_HOURS[n.kind]} hours.`}>
              {describeSla(n.sla)}
            </v2.Pill>
            <span>waiting {waitingFor(n.since, nowMs)}</span>
          </div>
        ) : (
          <PromiseBar n={n} nowMs={nowMs} />
        )}
      </div>
      <div className="acts">
        {short ? null : <v2.Pill tone={SLA_TONE[n.sla.state]}>{describeSla(n.sla)}</v2.Pill>}
        <Link className={`v2-btn sm${n.sla.state === 'late' ? ' pri' : ''}`} href={n.href} aria-label={`${short ? 'Open' : ACTION[n.kind]}: ${n.title}`}>
          {short ? 'Open' : ACTION[n.kind]}
        </Link>
      </div>
    </li>
  );
}

function SkeletonRows({ n }: { n: number }) {
  return (
    <div aria-busy="true">
      <v2.Loading lines={n} label="Loading what needs you" />
    </div>
  );
}

function SummaryPills({ s }: { s: { total: number; late: number; soon: number } }) {
  if (s.total === 0) return <v2.Pill tone="ok">All clear</v2.Pill>;
  return (
    <span className="wp4-pills">
      {s.late ? <v2.Pill tone="danger">{s.late} late</v2.Pill> : null}
      {s.soon ? <v2.Pill tone="bad">{s.soon} due soon</v2.Pill> : null}
      <v2.Pill tone="mut">{s.total} waiting</v2.Pill>
    </span>
  );
}

/** The dashboard card: top items with "See all N". */
export function V2NeedsCard({ limit = 6, sales = false }: { limit?: number; sales?: boolean }) {
  const live = useLive();
  const { hideTest } = useV2();
  const nowMs = useNow();
  if (!live) return null;
  const view = live.needs ? visibleNeeds(live.needs, { hideTest, filter: 'all' }) : null;
  const s = view ? needsSummary(view.all) : null;
  return (
    <v2.Card
      title="Needs you now"
      sub={sales ? 'Help requests and copyright notices, most urgent first.' : 'Withdrawals, refunds, disputes, help requests and copyright notices, most urgent first.'}
      right={
        <span className="wp4-pills">
          {s ? s.late ? <v2.Pill tone="danger">{s.late} late</v2.Pill> : s.total === 0 ? <v2.Pill tone="ok">All clear</v2.Pill> : null : null}
          <Link className="v2-btn sm" href="/needs-you">
            See all{s ? ` ${s.total}` : ''}
          </Link>
        </span>
      }
    >
      {!view ? (
        <SkeletonRows n={3} />
      ) : view.all.length ? (
        <ul className="wp4-needs">
          {view.all.slice(0, limit).map((n) => (
            <Row key={`${n.kind}-${n.id}`} n={n} nowMs={nowMs} short />
          ))}
        </ul>
      ) : (
        <v2.Empty title="Nothing is waiting on you" icon="check">
          All clear.
        </v2.Empty>
      )}
    </v2.Card>
  );
}

/** The /needs-you page body: summary, kind chips, the full list and the promise rules. */
export function V2NeedsBoard({ filter }: { filter: NeedsFilter }) {
  const live = useLive();
  const { hideTest, role } = useV2();
  const nowMs = useNow();
  if (!live) return null;
  if (!live.needs) {
    return (
      <v2.Card>
        <SkeletonRows n={6} />
      </v2.Card>
    );
  }
  const view = visibleNeeds(live.needs, { hideTest, filter });
  const money = staffCanSee(role, 'money');
  const kinds = NEEDS_FILTER_ORDER.filter((k) => money || (k !== 'payout' && k !== 'refund' && k !== 'dispute'));
  const s = needsSummary(view.all);

  return (
    <>
      <div className="wp4-board-head">
        <SummaryPills s={s} />
      </div>
      <v2.Chips
        label="Show"
        items={[
          { href: needsFilterHref('all'), label: 'All', count: view.all.length, active: filter === 'all' },
          ...kinds.map((k) => ({ href: needsFilterHref(k), label: NEEDS_FILTER_LABEL[k], count: view.counts[k], active: filter === k })),
        ]}
      />
      {view.hidden ? (
        <v2.Note>
          <Icon name="eye" size={14} /> {view.hidden} test {view.hidden === 1 ? 'row is' : 'rows are'} hidden (fake seed people and “[e2e]” jobs). Turn off “Hide test data” in your account menu to see them.
        </v2.Note>
      ) : null}
      <v2.Card>
        {view.rows.length ? (
          <ul className="wp4-needs">
            {view.rows.map((n) => (
              <Row key={`${n.kind}-${n.id}`} n={n} nowMs={nowMs} short={false} />
            ))}
          </ul>
        ) : (
          <v2.Empty title="Nothing is waiting on you" icon="check">
            When a withdrawal, refund, dispute, help request or copyright notice comes in, it shows here.
          </v2.Empty>
        )}
      </v2.Card>
      <p className="wp4-foot">
        Promise: 24 hours for withdrawals, refunds, help requests and copyright notices; 48 hours for disputes. Red rows are past the promise. This list updates by itself.
      </p>
    </>
  );
}
