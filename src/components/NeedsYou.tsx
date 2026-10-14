'use client';

import Link from 'next/link';
import { describeSla, NEEDS_ICON, NEEDS_LABEL, waitingFor, type RankedNeed } from '@/lib/needs-you';
import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { useLive } from './LiveProvider';
import { Card, Empty, Pill } from './ui';

const TONE = { late: 'red', soon: 'gold', ok: 'grey' } as const;

function Row({ n, nowMs }: { n: RankedNeed; nowMs: number }) {
  return (
    <li className={`need-row need-${n.sla.state}`}>
      <Link href={n.href} className="need-link">
        <span className="need-icon" aria-hidden="true">
          <Icon name={NEEDS_ICON[n.kind]} size={16} />
        </span>
        <span className="need-text">
          <strong>{n.title}</strong>
          <span>
            {NEEDS_LABEL[n.kind]} · {n.sub}
          </span>
        </span>
        <span className="need-when">
          <Pill tone={TONE[n.sla.state]} title={`Waiting ${waitingFor(n.since, nowMs)}. Promised within ${n.kind === 'dispute' ? '48' : '24'} hours.`}>
            {describeSla(n.sla)}
          </Pill>
          <span className="need-wait">waiting {waitingFor(n.since, nowMs)}</span>
        </span>
        <span className="btn btn-primary btn-small need-go" aria-hidden="true">
          Open
        </span>
      </Link>
    </li>
  );
}

/**
 * Everything waiting on a person, most urgent first, each with how long it has
 * waited and how long is left of the promise TaskDrop makes (24 hours for
 * withdrawals, refunds, help requests and copyright notices; 48 for disputes).
 * Updates by itself with the rest of the live panel.
 */
export function NeedsYou({ limit }: { limit?: number }) {
  const live = useLive();
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  if (!live) return null;
  const { needs, needsSummary: s } = live;

  const shown = needs ? (limit ? needs.slice(0, limit) : needs) : [];
  const more = needs && limit && needs.length > limit ? needs.length - limit : 0;

  const pill = !needs ? null : s.total === 0 ? (
    <Pill tone="green">All clear</Pill>
  ) : s.late > 0 ? (
    <Pill tone="red">{s.late} late</Pill>
  ) : s.soon > 0 ? (
    <Pill tone="gold">{s.soon} due soon</Pill>
  ) : (
    <Pill tone="blue">{s.total} waiting</Pill>
  );

  return (
    <Card
      title="Needs you now"
      sub="Withdrawals, refunds, disputes, help requests and copyright notices, most urgent first."
      right={pill}
      flush
    >
      {!needs ? (
        <ul className="need-list" aria-busy="true">
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i} className="need-row skeleton-row" aria-hidden="true" />
          ))}
        </ul>
      ) : shown.length ? (
        <>
          <ul className="need-list">
            {shown.map((n) => (
              <Row key={`${n.kind}-${n.id}`} n={n} nowMs={nowMs} />
            ))}
          </ul>
          {more ? (
            <div className="need-more">
              <Link href="/needs-you">
                See all {needs.length} <Icon name="arrow" size={14} />
              </Link>
            </div>
          ) : null}
        </>
      ) : (
        <Empty title="Nothing is waiting on you">Withdrawals, refunds, disputes, help requests and copyright notices appear here the moment they need a person.</Empty>
      )}
    </Card>
  );
}
