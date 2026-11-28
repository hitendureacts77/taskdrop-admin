import Link from 'next/link';
import type { ReactNode } from 'react';
import * as v2 from '@/components/v2/ui';
import { payoutStatus, taskStatus, TICKET_STATUS, type Tone as OldTone } from '@/lib/labels';
import type { Group, SearchResults } from '@/lib/v2/search-data';

const inr = (minor: number) => `₹${(minor / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/** Today's status colours in the v2 words: green = done, blue = worker side, gold = waiting/held, red = problem. */
const TONE: Record<OldTone, v2.Tone> = { green: 'ok', blue: 'earn', gold: 'wait', red: 'danger', grey: 'mut' };

function Line({ href, left, right, test }: { href: string; left: ReactNode; right: ReactNode; test?: boolean }) {
  return (
    <Link href={href} className="v2-sline">
      <span>
        {left}
        <v2.TestTag show={Boolean(test)} />
      </span>
      <span className="r">{right}</span>
    </Link>
  );
}

function Section<T>({ title, isNew, group, allHref, row }: { title: string; isNew?: boolean; group: Group<T>; allHref: string; row: (r: T) => ReactNode }) {
  const more = group.total > group.rows.length;
  return (
    <v2.Card
      title={
        <>
          {title} ({group.total.toLocaleString('en-IN')}) {isNew ? <v2.NewTag /> : null}
        </>
      }
      right={
        <Link href={allHref} className="v2-btn ghost sm">
          All →
        </Link>
      }
    >
      {group.failed ? (
        <v2.Note tone="orange">Could not search this list just now. Try again in a minute.</v2.Note>
      ) : group.rows.length ? (
        <div className="v2-slist">
          {group.rows.map(row)}
          {more ? <p className="v2-muted v2-small">Showing the newest {group.rows.length}. Open “All” for the rest.</p> : null}
        </div>
      ) : (
        <p className="v2-muted v2-small v2-snone">Nothing matches.</p>
      )}
    </v2.Card>
  );
}

/**
 * Admin v2 /search: jobs, people, payouts (money roles) and help requests for
 * one query, ten of each, each with an "All →" link to its full list.
 */
export function SearchPageV2({ q, found, money }: { q: string; found: SearchResults | null; money: boolean }) {
  const enc = encodeURIComponent(q);
  return (
    <>
      <v2.PageHeader
        title="Search"
        sub={money ? 'Jobs, people, payouts and help requests in one place.' : 'Jobs, people and help requests in one place.'}
        crumbs={[{ label: 'Search' }]}
        right={<v2.TableSearch action="/search" value={q} placeholder="Type a job title or a person's name" />}
      />
      {!q || !found ? (
        <v2.Card>
          <v2.Empty title="Type a job title or a person's name" icon="search">
            <p>{money ? 'Or a full id, an @username, or a payout amount like 1470.' : 'Or a full id or an @username.'}</p>
          </v2.Empty>
        </v2.Card>
      ) : (
        <v2.Grid cols={2}>
          <Section
            title="Jobs"
            group={found.jobs}
            allHref={`/tasks?q=${enc}`}
            row={(t) => {
              const s = taskStatus(t.status);
              return <Line key={t.id} href={`/tasks/${t.id}`} left={t.title} test={t.test} right={<v2.Pill tone={TONE[s.tone]}>{s.label}</v2.Pill>} />;
            }}
          />
          <Section
            title="People"
            group={found.people}
            allHref={`/users?q=${enc}`}
            row={(p) => (
              <Line
                key={p.id}
                href={`/users/${p.id}`}
                left={p.name || 'No name'}
                test={p.test}
                right={p.walletMinor !== null ? `wallet ${inr(p.walletMinor)}` : p.username ? `@${p.username}` : ''}
              />
            )}
          />
          {money && found.payouts ? (
            <Section
              title="Payouts"
              isNew
              group={found.payouts}
              allHref={`/payouts?q=${enc}`}
              row={(w) => {
                const s = payoutStatus(w.status, w.name.split(' ')[0]);
                return <Line key={w.id} href={`/payouts/${w.id}`} left={`${inr(w.amountMinor)} to ${w.name}`} test={w.test} right={<v2.Pill tone={TONE[s.tone]}>{s.label}</v2.Pill>} />;
              }}
            />
          ) : null}
          <Section
            title="Help requests"
            isNew
            group={found.tickets}
            allHref="/support"
            row={(t) => {
              const s = TICKET_STATUS[t.status] ?? { label: t.status, tone: 'grey' as const };
              return (
                <Line
                  key={t.id}
                  href={`/support/${t.id}`}
                  left={
                    <>
                      {t.subject} <span className="v2-muted">· {t.user}</span>
                    </>
                  }
                  test={t.test}
                  right={<v2.Pill tone={TONE[s.tone]}>{s.label}</v2.Pill>}
                />
              );
            }}
          />
        </v2.Grid>
      )}
    </>
  );
}
