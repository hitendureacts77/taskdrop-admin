import Link from 'next/link';
import type { TicketDetail, TicketRow } from '@/lib/data';
import { istDateTime, timeAgo } from '@/lib/format';
import type { FormAction } from '@/components/ConfirmAction';
import { isTestRow } from '@/lib/test-data';
import { Confirm } from '../Confirm';
import * as v2 from '../ui';
import { ReplyBoxV2 } from './ReplyBoxV2';

export type TicketTab = 'waiting' | 'answered' | 'resolved' | 'all';

const STATUS: Record<string, { label: string; tone: v2.Tone }> = {
  waiting: { label: 'Waiting for a reply', tone: 'wait' },
  answered: { label: 'Answered', tone: 'earn' },
  resolved: { label: 'Resolved', tone: 'ok' },
};

const CATEGORY: Record<string, string> = {
  payment: 'Payment',
  task: 'A job',
  account: 'Their account',
  safety: 'Safety',
  bug: 'Something broken',
  other: 'Something else',
};

const statusOf = (s: string) => STATUS[s] ?? { label: 'Other', tone: 'mut' as const };
export const categoryWords = (c: string) => CATEGORY[c] ?? 'Something else';

const TABS: { key: TicketTab; label: string }[] = [
  { key: 'waiting', label: 'Waiting for a reply' },
  { key: 'answered', label: 'Answered' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'all', label: 'All' },
];

/** Help requests (v2): the same four tabs as today with counts, a table that turns into cards on a phone. */
export function SupportListV2({ rows, counts, status, now: nowIso }: { rows: TicketRow[]; counts: Record<TicketTab, number | null>; status: TicketTab; now: string }) {
  const now = new Date(nowIso);
  const total = counts[status] ?? rows.length;
  return (
    <>
      <v2.PageHeader
        crumbs={[{ label: 'Help & safety', href: '/support' }, { label: 'Help requests' }]}
        title="Help requests"
        sub="Questions and problems people sent from the app. Open one to read it and reply."
      />
      <v2.Tabs
        label="Show"
        items={TABS.map((t) => ({
          href: t.key === 'waiting' ? '/support' : `/support?status=${t.key}`,
          label: t.label,
          count: counts[t.key] ?? undefined,
          hot: t.key === 'waiting' && (counts.waiting ?? 0) > 0,
          active: t.key === status,
        }))}
      />
      <v2.Card
        title={`${total.toLocaleString('en-IN')} conversation${total === 1 ? '' : 's'}`}
        sub={`Showing ${rows.length.toLocaleString('en-IN')} of ${total.toLocaleString('en-IN')}. ${status === 'waiting' ? 'Longest waiting first.' : 'Newest message first.'}`}
      >
        <v2.DataTable
          caption="Help requests"
          columns={[{ label: 'Subject' }, { label: 'From' }, { label: 'About' }, { label: 'Status' }, { label: 'Last message' }]}
          rows={rows.map((t) => {
            const st = statusOf(t.status);
            return {
              key: t.id,
              href: `/support/${t.id}`,
              test: isTestRow({ userId: t.userId, title: t.subject }),
              late: t.status === 'waiting' && now.getTime() - new Date(t.updatedAt).getTime() > 24 * 3600_000,
              cells: [
                <b key="s">{t.subject}</b>,
                <Link key="u" href={`/users/${t.userId}`}>
                  {t.user}
                </Link>,
                categoryWords(t.category),
                <v2.Pill key="p" tone={st.tone}>
                  {st.label}
                </v2.Pill>,
                <span key="t" title={istDateTime(t.updatedAt)}>
                  {timeAgo(t.updatedAt, now)}
                </span>,
              ],
            };
          })}
          empty={status === 'waiting' ? 'Nobody is waiting for a reply' : 'Nothing here'}
        />
      </v2.Card>
    </>
  );
}

/** One help request (v2). `reply` and `resolve` are left out for a role that may not answer: read only (B133). */
export function TicketV2({ t, reply, resolve }: { t: TicketDetail; reply?: FormAction; resolve?: FormAction }) {
  const st = statusOf(t.status);
  const first = t.user.split(' ')[0] || t.user;
  const canAnswer = Boolean(reply && resolve);
  return (
    <>
      <v2.PageHeader
        crumbs={[{ label: 'Help requests', href: '/support?status=all' }, { label: t.subject }]}
        title={
          <>
            {t.subject} <v2.TestTag show={isTestRow({ userId: t.userId, title: t.subject })} /> <v2.Pill tone={st.tone}>{st.label}</v2.Pill>
          </>
        }
        sub={
          <>
            From <Link href={`/users/${t.userId}`}>{t.user}</Link> · about {categoryWords(t.category).toLowerCase()}
            {t.page ? ` · sent from ${t.page}` : ''} · opened {istDateTime(t.createdAt)}
          </>
        }
      />
      {!canAnswer ? (
        <v2.Note tone="blue" title="View only">
          Your role can read this conversation, but only Admin, Support and Sales can reply or resolve it.
        </v2.Note>
      ) : null}
      <v2.Grid cols="main">
        <div className="wp5-stack">
          <v2.Card title="Conversation" sub={`${first} on the left, staff on the right.`}>
            {t.messages.length ? (
              <ol className="wp5-chat">
                {t.messages.map((m) => (
                  <li key={m.id} className={m.fromStaff ? 'staff' : 'person'}>
                    <p>{m.body}</p>
                    <small>
                      {m.fromStaff ? 'TaskDrop team' : m.author} · {istDateTime(m.createdAt)}
                    </small>
                  </li>
                ))}
              </ol>
            ) : (
              <v2.Empty title="No messages yet" icon="inbox" />
            )}
          </v2.Card>
          {reply ? (
            <v2.Card title={`Reply to ${first}`} sub="They get a notification in the app.">
              <ReplyBoxV2 action={reply} ticketId={t.id} />
            </v2.Card>
          ) : null}
        </div>
        <div className="wp5-side">
          <v2.Card title="Done?">
            {t.status !== 'resolved' ? (
              <>
                <p className="wp5-small">Resolve it when there’s nothing left to do. They can still write back.</p>
                {resolve ? (
                  <Confirm
                    action={resolve}
                    hidden={{ ticketId: t.id }}
                    label="Mark as resolved"
                    tier={2}
                    area="people"
                    title="Mark this help request as resolved?"
                    body={<p>It moves to Resolved. If {first} writes again, it opens again. No money is involved.</p>}
                    confirmLabel="Resolve"
                  />
                ) : null}
              </>
            ) : (
              <p className="wp5-small">
                <v2.Pill tone="ok">Already resolved</v2.Pill> They can still write back; it opens again if they do.
              </p>
            )}
          </v2.Card>
          <v2.Card title="About this request">
            <v2.KV
              rows={[
                ['From', <Link key="u" href={`/users/${t.userId}`}>{t.user}</Link>],
                ['About', categoryWords(t.category)],
                ['Sent from', t.page ?? 'Not recorded'],
                ['Opened', istDateTime(t.createdAt)],
                ['Last message', istDateTime(t.updatedAt)],
              ]}
            />
          </v2.Card>
        </div>
      </v2.Grid>
    </>
  );
}
