import Link from 'next/link';
import type { Notice, NoticeStatus } from '@/lib/copyright';
import { rejectNotice, recordCounter, restoreNotice, takeDown } from '@/lib/copyright-actions';
import { istDate, timeAgo } from '@/lib/format';
import type { Tone } from '@/lib/labels';
import { ConfirmAction } from '../ConfirmAction';
import { LogNoticeForm } from '../CopyrightForms';
import { Card, Empty, HowItWorks, PageHeader, Pill } from '../ui';

/** Upheld notices against one person at which suspension is offered. */
const REPEAT_INFRINGER = 3;

const STATUS: Record<NoticeStatus, { label: string; tone: Tone }> = {
  received: { label: 'Waiting', tone: 'gold' },
  removed: { label: 'Taken down', tone: 'red' },
  countered: { label: 'Counter-notice', tone: 'blue' },
  rejected: { label: 'Rejected', tone: 'grey' },
  restored: { label: 'Restored', tone: 'green' },
};

const REMOVED: Record<NonNullable<Notice['removedWhat']>, string> = {
  media: 'Job photo or video',
  listing: 'Whole post',
  avatar: 'Profile photo',
};

export function CopyrightView({ ready, rows, now }: { ready: boolean; rows: Notice[]; now: string }) {
  const at = new Date(now);
  // Today in India, as YYYY-MM-DD: restore dates are Indian calendar days.
  const today = at.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const waiting = rows.filter((r) => r.status === 'received');
  const down = rows.filter((r) => r.status === 'removed' || r.status === 'countered');
  const closed = rows.filter((r) => r.status === 'rejected' || r.status === 'restored');

  return (
    <>
      <PageHeader
        title="Copyright notices"
        sub="Takedown requests sent to TaskDrop’s designated copyright agent. Log each one here, then take the material down, or reject the notice."
      />
      {!ready ? (
        <Card>
          <Empty title="Not switched on yet">
            The database does not have the copyright tables. Apply migration 085 (supabase/migrations/…_085_copyright_takedowns.sql), then reload.
          </Empty>
        </Card>
      ) : (
        <>
          <div className="grid-main-side">
            <div className="stack">
              <Card title="Log a notice" sub="Copy it in from the agent’s inbox as you received it.">
                <LogNoticeForm />
              </Card>
            </div>
            <div className="stack">
              <HowItWorks
                title="What the law expects"
                steps={[
                  <>A valid notice has six parts: a signature; the work; where it is on TaskDrop; the sender’s contact details; a good-faith statement; and a statement, under penalty of perjury, that it is accurate and they are authorized. Reject one that is missing any.</>,
                  <>Take valid notices down quickly. Nothing is deleted: the file is detached so only its uploader can see it, and the uploader is told automatically.</>,
                  <>If the uploader sends a valid counter-notice, record it and forward it to the complainant the same day. Restore after 10 to 14 business days unless the complainant says they have gone to court.</>,
                  <>At {REPEAT_INFRINGER} upheld notices against one person, suspend them from their People page: TaskDrop’s policy is to close repeat infringers’ accounts.</>,
                ]}
              />
            </div>
          </div>

          <NoticeTable title="Waiting for a decision" rows={waiting} at={at} today={today} empty="No notices are waiting." />
          <NoticeTable title="Taken down" rows={down} at={at} today={today} empty="Nothing is down at the moment." />
          <NoticeTable title="Closed" rows={closed} at={at} today={today} empty="Nothing closed yet." />
        </>
      )}
    </>
  );
}

function NoticeTable({ title, rows, at, today, empty }: { title: string; rows: Notice[]; at: Date; today: string; empty: string }) {
  return (
    <Card title={title} flush={rows.length > 0}>
      {rows.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="th">Notice</th>
                <th className="th">On TaskDrop</th>
                <th className="th">Status</th>
                <th className="th">What to do</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((n) => (
                <tr key={n.id}>
                  <td className="td">
                    <strong>{n.complainant}</strong>
                    <span className="small block">{n.email}</span>
                    <span className="small block">Work: {clip(n.work)}</span>
                    <span className="muted small block">{timeAgo(n.receivedAt, at)}</span>
                  </td>
                  <td className="td small">
                    {n.taskId ? (
                      <Link href={`/tasks/${n.taskId}`} className="block">
                        {n.taskTitle ?? 'Job'}
                      </Link>
                    ) : null}
                    {n.uploaderId ? (
                      <Link href={`/users/${n.uploaderId}`} className="block">
                        {n.uploader}
                      </Link>
                    ) : null}
                    <span className="muted block">{clip(n.material)}</span>
                    {n.strikes >= REPEAT_INFRINGER ? (
                      <Pill tone="red" title="Suspend from their People page">
                        {n.strikes} upheld notices: repeat infringer
                      </Pill>
                    ) : n.strikes > 0 ? (
                      <span className="muted block">{n.strikes} upheld so far</span>
                    ) : null}
                  </td>
                  <td className="td small">
                    <Pill tone={STATUS[n.status].tone}>{STATUS[n.status].label}</Pill>
                    {n.removedWhat ? <span className="block">{REMOVED[n.removedWhat]}</span> : null}
                    {n.restoreFrom && n.status === 'countered' ? <span className="block">Restore from {istDate(`${n.restoreFrom}T00:00:00+05:30`)}</span> : null}
                    {n.note ? <span className="muted block">{clip(n.note)}</span> : null}
                  </td>
                  <td className="td">
                    <Actions n={n} today={today} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted small">{empty}</p>
      )}
    </Card>
  );
}

function Actions({ n, today }: { n: Notice; today: string }) {
  const who = n.uploader ?? 'the person who posted it';
  if (n.status === 'received') {
    return (
      <div className="stack">
        {n.can.media ? (
          <ConfirmAction
            action={takeDown}
            hidden={{ id: n.id, what: 'media' }}
            trigger="Take down the job’s photo or video"
            tone="danger"
            title="Take down this job’s photo or video?"
            consequence={<>The file is detached from the job, so only {who} can still see it, and {who} is told why. It can be put back after a valid counter-notice.</>}
            field={{ name: 'note', label: 'Note (optional)', placeholder: 'e.g. matches their original photo' }}
            confirmLabel="Take it down"
          />
        ) : null}
        {n.can.listing ? (
          <ConfirmAction
            action={takeDown}
            hidden={{ id: n.id, what: 'listing' }}
            trigger="Close the whole post"
            tone="danger"
            title="Close this post?"
            consequence={<>The post is closed and stops showing to anyone, and {who} is told why. No money is held on it. It can be reopened after a valid counter-notice.</>}
            field={{ name: 'note', label: 'Note (optional)' }}
            confirmLabel="Close the post"
          />
        ) : null}
        {n.can.avatar ? (
          <ConfirmAction
            action={takeDown}
            hidden={{ id: n.id, what: 'avatar' }}
            trigger="Take down their profile photo"
            tone="danger"
            title={`Take down ${who}’s profile photo?`}
            consequence={<>The photo is detached from their profile and they are told why. It can be put back after a valid counter-notice.</>}
            field={{ name: 'note', label: 'Note (optional)' }}
            confirmLabel="Take it down"
          />
        ) : null}
        {!n.can.media && !n.can.listing && !n.can.avatar ? (
          <span className="muted small">Nothing linked can be taken down. Log it again with the job or person, or reject it.</span>
        ) : null}
        <ConfirmAction
          action={rejectNotice}
          hidden={{ id: n.id }}
          trigger="Reject"
          tone="quiet"
          title="Reject this notice?"
          consequence={<>Nothing on TaskDrop changes. Reply to the sender saying what was missing.</>}
          field={{ name: 'note', label: 'Why', required: true, placeholder: 'e.g. no statement under penalty of perjury' }}
          confirmLabel="Reject"
        />
      </div>
    );
  }
  if (n.status === 'removed') {
    return (
      <ConfirmAction
        action={recordCounter}
        hidden={{ id: n.id }}
        trigger="Counter-notice received"
        tone="quiet"
        title="Record a counter-notice?"
        consequence={<>Only for a valid counter-notice: signature, what was removed, a statement under penalty of perjury that it was a mistake, and consent to the court’s jurisdiction. Forward it to {n.complainant} today.</>}
        field={{ name: 'note', label: 'Note (optional)' }}
        confirmLabel="Record it"
      />
    );
  }
  if (n.status === 'countered') {
    if (n.restoreFrom && today < n.restoreFrom) {
      return <span className="muted small">Wait until {istDate(`${n.restoreFrom}T00:00:00+05:30`)}. If {n.complainant} says they have gone to court, leave it down.</span>;
    }
    return (
      <ConfirmAction
        action={restoreNotice}
        hidden={{ id: n.id }}
        trigger="Restore"
        title="Put it back?"
        consequence={<>Only if {n.complainant} has not told you they have gone to court. The material comes back exactly as it was, and {who} is told.</>}
        confirmLabel="Restore it"
      />
    );
  }
  return <span className="muted small">{n.status === 'restored' ? 'Restored' : 'Closed'}</span>;
}

const clip = (s: string, max = 140) => (s.length > max ? `${s.slice(0, max)}…` : s);
