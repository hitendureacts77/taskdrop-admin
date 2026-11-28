import Link from 'next/link';
import { Icon } from '@/components/Icon';
import * as v2 from '@/components/v2/ui';
import type { Check, Health } from '@/lib/admin-config';
import { istDateTime, istTime, timeAgo } from '@/lib/format';
import { moneyHealthLine } from '@/lib/growth-calc';
import type { StaffRole } from '@/lib/staff-roles';
import { regionWords } from './reads';
import { SettingsToolsHead } from './SettingsToolsHead';

/** What each check reads, in plain words (the table or function name stays small, for the developer). */
const PLAIN: Record<string, string> = {
  Database: 'Reads the settings',
  'Money ledger': 'Reads the money book',
  'Earnings totals': 'Adds up TaskDrop’s earnings',
  'Payout queue': 'Reads waiting withdrawals',
  'RazorpayX money position': 'Compares money held with money owed',
  'Customer hub (CRM)': 'Reads customer notes and tags',
  'Copyright notices': 'Reads the notices list',
  'Account deletion': 'Reads deletion requests',
  'Audit log': 'Reads the latest lines',
  'Service key': 'The server-only key is set on this server',
};

const SLOW_MS = 1000;
const NOT_THERE = /does not exist|could not find|schema cache|PGRST20[24]|42P01|42883/i;

function CheckLine({ c }: { c: Check }) {
  const tech = c.what.replace(/\s*·\s*migration \d+/i, '');
  const missing = !c.ok && NOT_THERE.test(c.detail);
  return (
    <li className="wp8b-check">
      <span className={`st ${c.ok ? 'y' : 'n'}`} aria-hidden="true">
        <Icon name={c.ok ? 'check' : 'close'} size={14} />
      </span>
      <span className="tx">
        <b>{c.name}</b>
        <span className="v2-muted wp8b-sm">
          {PLAIN[c.name] ?? tech} <span className="v2-mono">({tech})</span>
        </span>
        {!c.ok ? <span className="wp8b-err wp8b-sm">{missing ? 'Not set up on this server yet.' : <span className="v2-mono">{c.detail}</span>}</span> : null}
      </span>
      {!c.ok ? (
        <v2.Pill tone="danger">Failing</v2.Pill>
      ) : c.ms === null ? (
        <v2.Pill tone="ok">{c.detail}</v2.Pill>
      ) : c.ms > SLOW_MS ? (
        <v2.Pill tone="wait">{`${(c.ms / 1000).toFixed(1)} s · slow`}</v2.Pill>
      ) : (
        <v2.Pill tone="ok">{`${c.ms} ms`}</v2.Pill>
      )}
    </li>
  );
}

/** System health (F432–F437): checks, what is waiting, latest activity, this server. */
export function HealthV2({ h, role, appEnv }: { h: Health; role: StaffRole; appEnv: string | null }) {
  const failing = h.checks.filter((c) => !c.ok);
  const moneyLine = moneyHealthLine(h.moneyOpen);
  const queues = [
    { label: 'Payouts', n: h.queues.payouts, href: '/payouts' },
    { label: 'Disputes', n: h.queues.disputes, href: '/disputes' },
    { label: 'Refunds', n: h.queues.refunds, href: '/refunds' },
    { label: 'Help requests', n: h.queues.support, href: '/support' },
  ];
  const waiting = queues.reduce((s, q) => s + q.n, 0);
  const checked = `Checked ${istTime(h.checkedAt)}`;
  return (
    <>
      <SettingsToolsHead
        active="/settings/health"
        role={role}
        sub="Whether each part of the panel can read what it needs, and what is waiting."
        right={
          <>
            <span className="v2-muted wp8b-sm" title={istDateTime(h.checkedAt)}>
              {checked}
            </span>
            <Link href="/settings/health" className="v2-btn sm" prefetch={false}>
              <Icon name="refresh" size={14} /> Check again
            </Link>
          </>
        }
      />
      <div className="wp8b-gap">
        {failing.length ? (
          <v2.Note tone="red" title={`${failing.length} check${failing.length === 1 ? '' : 's'} failing`}>
            {failing.map((c) => c.name).join(', ')}. Details below. {checked}.
          </v2.Note>
        ) : moneyLine ? (
          <v2.Note tone="orange" title="The checks pass, but the Money check needs a look">
            All {h.checks.length} checks pass. <Link href="/money/reconcile">{moneyLine}</Link>. {checked}.
          </v2.Note>
        ) : (
          <v2.Note tone="jade" title="Everything is working">
            All {h.checks.length} checks pass. {checked}.
          </v2.Note>
        )}
      </div>
      <v2.Grid cols="main">
        <v2.Card title="Checks" sub="Each part of the panel, tested by reading what it depends on.">
          <ul className="wp8b-checks">
            {h.checks.map((c) => (
              <CheckLine key={c.name} c={c} />
            ))}
          </ul>
        </v2.Card>
        <div className="wp8b-stack">
          <v2.Card title="Waiting for you" sub={waiting ? `${waiting.toLocaleString('en-IN')} in all` : 'Nothing waiting'}>
            <ul className="wp8b-links">
              {queues.map((q) => (
                <li key={q.label}>
                  <Link href={q.href}>{q.label}</Link>
                  <v2.Pill tone={q.n ? 'bad' : 'ok'}>{q.n.toLocaleString('en-IN')}</v2.Pill>
                </li>
              ))}
            </ul>
          </v2.Card>
          <v2.Card title="Latest activity" sub="If these stop moving, something upstream may be stuck.">
            <ul className="wp8b-links">
              {h.latest.map((l) => (
                <li key={l.label}>
                  <Link href={l.href}>{l.label}</Link>
                  <span className="v2-muted wp8b-sm" title={l.at ? istDateTime(l.at) : undefined}>
                    {l.at ? timeAgo(l.at) : 'Never'}
                  </span>
                </li>
              ))}
            </ul>
          </v2.Card>
          <v2.Card title="This server">
            <v2.KV
              rows={[
                ['Hosting environment', <v2.Pill tone={h.runtime.env === 'production' ? 'ok' : 'wait'}>{h.runtime.env}</v2.Pill>],
                ['App environment', appEnv ? <v2.Pill tone={appEnv === 'production' ? 'ok' : 'wait'}>{appEnv}</v2.Pill> : <span className="v2-muted">Could not read</span>],
                ['Version', h.runtime.commit ? <span className="v2-mono">{h.runtime.commit}</span> : '—'],
                ['Region', regionWords(h.runtime.region) ?? '—'],
                ['Node', h.runtime.node],
              ]}
            />
            <p className="v2-muted wp8b-sm wp8b-gap">“Hosting environment” is what the hosting service calls this build (staging builds can say “preview”). “App environment” is the app’s own setting.</p>
          </v2.Card>
        </div>
      </v2.Grid>
    </>
  );
}
