import Link from 'next/link';
import type { Notice, NoticeStatus } from '@/lib/copyright';
import { restoreNotice } from '@/lib/copyright-actions';
import { istDate, istDateTime, timeAgo } from '@/lib/format';
import { isTestRow } from '@/lib/test-data';
import { recordCounterV2, rejectNoticeV2, takeDownV2 } from '@/lib/v2/safety-actions';
import { PhotoStrip } from '@/components/PhotoStrip';
import { Icon } from '@/components/Icon';
import { Confirm } from '../Confirm';
import * as v2 from '../ui';
import { LogNoticeFormV2 } from './LogNoticeFormV2';

/** Upheld notices against one person at which suspension is offered. */
const REPEAT_INFRINGER = 3;
/** Promise: decide on a waiting notice within 24 hours. */
const PROMISE_HOURS = 24;

const STATUS: Record<NoticeStatus, { label: string; tone: v2.Tone }> = {
  received: { label: 'Waiting', tone: 'wait' },
  removed: { label: 'Taken down', tone: 'bad' },
  countered: { label: 'Counter-notice', tone: 'earn' },
  rejected: { label: 'Rejected', tone: 'mut' },
  restored: { label: 'Restored', tone: 'ok' },
};

const REMOVED: Record<NonNullable<Notice['removedWhat']>, string> = {
  media: 'Job photo or video',
  listing: 'Whole post',
  avatar: 'Profile photo',
};

const restoreDay = (d: string) => istDate(`${d}T00:00:00+05:30`);
const clip = (s: string, max = 160) => (s.length > max ? `${s.slice(0, max)}…` : s);

export function isTestNotice(n: Notice): boolean {
  return isTestRow({ userId: n.uploaderId, title: n.taskTitle });
}

/** Copyright notices (v2): three tables, every action today's page has, the log form and "what the law expects". */
export function CopyrightV2({ ready, rows, now, canAct }: { ready: boolean; rows: Notice[]; now: string; canAct: boolean }) {
  const at = new Date(now);
  // Today in India, as YYYY-MM-DD: restore dates are Indian calendar days.
  const today = at.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const waiting = rows.filter((r) => r.status === 'received');
  const down = rows.filter((r) => r.status === 'removed' || r.status === 'countered');
  const closed = rows.filter((r) => r.status === 'rejected' || r.status === 'restored');

  const table = (title: string, list: Notice[], sub: string, empty: string) => (
    <v2.Card title={`${title}${list.length ? ` · ${list.length}` : ''}`} sub={sub}>
      {list.length ? (
        <v2.DataTable
          caption={title}
          columns={[{ label: 'Notice' }, { label: 'On TaskDrop' }, { label: 'Status' }, { label: 'What to do' }]}
          rows={list.map((n) => ({
            key: n.id,
            test: isTestNotice(n),
            late: n.status === 'received' && at.getTime() - new Date(n.receivedAt).getTime() > PROMISE_HOURS * 3600_000,
            cells: [
              <div key="n" className="wp5-cell">
                <b>{n.complainant}</b>
                {n.email ? <span className="v2-muted">{n.email}</span> : null}
                <span>Work: {clip(n.work)}</span>
                <span className="v2-muted" title={istDateTime(n.receivedAt)}>
                  Received {timeAgo(n.receivedAt, at)}
                </span>
              </div>,
              <div key="o" className="wp5-cell">
                {n.taskId ? <Link href={`/tasks/${n.taskId}`}>{n.taskTitle ?? 'The job'}</Link> : null}
                {n.uploaderId ? (
                  <span>
                    Uploaded by <Link href={`/users/${n.uploaderId}`}>{n.uploader}</Link>
                  </span>
                ) : null}
                <span className="v2-muted">“{clip(n.material)}”</span>
                {n.photo ? <PhotoStrip photos={[n.photo]} /> : null}
                {n.strikes >= REPEAT_INFRINGER ? (
                  <span>
                    <v2.Pill tone="danger">Repeat infringer · {n.strikes} upheld</v2.Pill>{' '}
                    {n.uploaderId ? <Link href={`/users/${n.uploaderId}`}>Suspend from their page</Link> : null}
                  </span>
                ) : n.uploaderId ? (
                  <span className="v2-muted">
                    {n.strikes} upheld notice{n.strikes === 1 ? '' : 's'}
                  </span>
                ) : null}
              </div>,
              <div key="s" className="wp5-cell">
                <v2.Pill tone={STATUS[n.status].tone}>{STATUS[n.status].label}</v2.Pill>
                {n.removedWhat ? <span>Removed: {REMOVED[n.removedWhat]}</span> : null}
                {n.restoreFrom && n.status === 'countered' ? (
                  today < n.restoreFrom ? (
                    <span>
                      <b>Wait until</b> {restoreDay(n.restoreFrom)}
                    </span>
                  ) : (
                    <span>Can be restored since {restoreDay(n.restoreFrom)}</span>
                  )
                ) : null}
                {n.note ? <span className="v2-muted">“{clip(n.note)}”</span> : null}
              </div>,
              canAct ? <Actions key="a" n={n} today={today} /> : <span key="a" className="v2-muted">View only</span>,
            ],
          }))}
        />
      ) : (
        <p className="v2-muted wp5-small">{empty}</p>
      )}
    </v2.Card>
  );

  return (
    <>
      <v2.PageHeader
        crumbs={[{ label: 'Help & safety', href: '/support' }, { label: 'Copyright notices' }]}
        title="Copyright notices"
        sub="Takedown requests sent to TaskDrop’s copyright agent. Log each one here, then take the material down, or reject the notice."
      />
      {!canAct ? (
        <v2.Note tone="blue" title="View only">
          Your role can read the notices, but only Admin, Support and Sales can log or act on them.
        </v2.Note>
      ) : null}
      {!ready ? (
        <v2.SetupNotice what="Copyright notices are not switched on in the database here." detail="copyright_notices" />
      ) : (
        <div className="wp5-stack">
          {table('Waiting for a decision', waiting, `Promise: decide within ${PROMISE_HOURS} hours. Red rows are late.`, 'No notices are waiting.')}
          {table('Taken down', down, 'Counter-notices wait 10–14 business days before you can restore.', 'Nothing is down at the moment.')}
          {table('Closed', closed, 'Rejected or restored.', 'Nothing closed yet.')}
          <v2.Grid cols={2}>
            {canAct ? (
              <v2.Card title="Log a notice" sub="Copy it in from the agent’s inbox as you received it.">
                <LogNoticeFormV2 />
              </v2.Card>
            ) : (
              <v2.Card title="Log a notice">
                <p className="v2-muted wp5-small">Your role can read these notices but not log them. Ask Admin, Support or Sales.</p>
              </v2.Card>
            )}
            <v2.Card title="What the law expects">
              <ol className="wp5-how">
                <li>
                  <b>A valid notice has six parts.</b> A signature; the work; where it is on TaskDrop; the sender’s contact details; a good-faith statement; and a statement, under penalty of perjury, that it is accurate and they are authorised. Reject one that is missing any.
                </li>
                <li>
                  <b>Take valid ones down quickly.</b> Nothing is deleted: the file is detached so only its uploader can see it, and the uploader is told automatically.
                </li>
                <li>
                  <b>Counter-notice.</b> If the uploader sends a valid counter-notice, record it and forward it to the sender the same day.
                </li>
                <li>
                  <b>Restore after the wait.</b> Restore after 10 to 14 business days unless the sender says they have gone to court.
                </li>
                <li>
                  <b>Repeat infringers.</b> At {REPEAT_INFRINGER} upheld notices against one person, suspend them from their People page.
                </li>
                <li>
                  <b>Keep records.</b> Every step is written to the audit log.
                </li>
              </ol>
            </v2.Card>
          </v2.Grid>
        </div>
      )}
    </>
  );
}

function Actions({ n, today }: { n: Notice; today: string }) {
  const who = n.uploader ?? 'the person who posted it';
  if (n.status === 'received') {
    const none = !n.can.media && !n.can.listing && !n.can.avatar;
    return (
      <div className="wp5-acts col">
        {n.can.media ? (
          <Confirm
            action={takeDownV2}
            hidden={{ id: n.id, what: 'media' }}
            label="Take down the photo"
            tier={2}
            area="people"
            small
            tone="warn"
            title="Take down this job’s photo or video?"
            body={<p>The file is detached from the job (not deleted), so only {who} can still see it, and {who} is told why. It can be put back after a valid counter-notice.</p>}
            reason={{ label: 'Note (optional)', optional: true, placeholder: 'e.g. matches their original photo' }}
            confirmLabel="Take down"
          />
        ) : null}
        {n.can.listing ? (
          <Confirm
            action={takeDownV2}
            hidden={{ id: n.id, what: 'listing' }}
            label="Close the whole post"
            tier={2}
            area="people"
            small
            tone="warn"
            title="Close the whole job post?"
            body={<p>The post is closed and stops showing to anyone, and {who} is told why. No money is held on it. It can be reopened after a valid counter-notice.</p>}
            reason={{ label: 'Note (optional)', optional: true }}
            confirmLabel="Close the post"
          />
        ) : null}
        {n.can.avatar ? (
          <Confirm
            action={takeDownV2}
            hidden={{ id: n.id, what: 'avatar' }}
            label="Take down profile photo"
            tier={2}
            area="people"
            small
            tone="warn"
            title={`Take down ${who}’s profile photo?`}
            body={<p>Their profile shows initials instead, and they are told why. It can be put back after a valid counter-notice.</p>}
            reason={{ label: 'Note (optional)', optional: true }}
            confirmLabel="Take down"
          />
        ) : null}
        {none ? <span className="v2-muted wp5-small">Nothing linked can be taken down. Log it again with the job or person, or reject it.</span> : null}
        <Confirm
          action={rejectNoticeV2}
          hidden={{ id: n.id }}
          label="Reject"
          tier={2}
          area="people"
          small
          tone="plain"
          title="Reject this notice?"
          body={<p>Nothing on TaskDrop changes. Reply to the sender saying what was missing.</p>}
          reason={{ label: 'Why is it rejected?', placeholder: 'e.g. no statement under penalty of perjury' }}
          confirmLabel="Reject"
        />
      </div>
    );
  }
  if (n.status === 'removed') {
    return (
      <Confirm
        action={recordCounterV2}
        hidden={{ id: n.id }}
        label="Counter-notice received"
        tier={2}
        area="people"
        small
        title="Record a counter-notice?"
        body={<p>Only for a valid counter-notice: signature, what was removed, a statement under penalty of perjury that it was a mistake, and consent to the court’s jurisdiction. Forward it to {n.complainant} today. You can restore after 10–14 business days if they do not go to court.</p>}
        reason={{ label: 'Note (optional)', optional: true }}
        confirmLabel="Record it"
      />
    );
  }
  if (n.status === 'countered') {
    if (n.restoreFrom && today < n.restoreFrom) {
      return (
        <button type="button" className="v2-btn sm" disabled title={`Wait until ${restoreDay(n.restoreFrom)}`}>
          <Icon name="clock" size={14} /> Restore
        </button>
      );
    }
    return (
      <Confirm
        action={restoreNotice}
        hidden={{ id: n.id }}
        label="Restore"
        tier={2}
        area="people"
        small
        title="Restore the material?"
        body={<p>Only if {n.complainant} has not told you they have gone to court. It comes back exactly as it was, and {who} is told.</p>}
        confirmLabel="Restore"
      />
    );
  }
  return <span className="v2-muted wp5-small">{n.status === 'restored' ? 'Restored' : 'Closed'}</span>;
}
