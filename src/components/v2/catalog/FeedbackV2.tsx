import Link from 'next/link';
import * as v2 from '@/components/v2/ui';
import { Confirm } from '@/components/v2/Confirm';
import { PhotoStrip } from '@/components/PhotoStrip';
import { hideIdea, hideIdeaComment, replyToIdea, setIdeaStatus, showIdeaComment, unhideIdea } from '@/lib/feedback-actions';
import { BOARD_KIND, BOARD_STATUS, NOTE_KIND, type BoardPost, type BoardStatus, type BoardTab, type FeedbackTab, type PrivateNote } from '@/lib/feedback';
import type { Read } from '@/lib/growth';
import { timeAgo } from '@/lib/format';
import { isTestRow, isTestTitle, isTestUserId } from '@/lib/test-data';

/**
 * Admin v2 Feedback board (WP9, F300–F309). Same reads and server actions as
 * today's FeedbackView; v2 tabs with counts, idea cards, private notes as a table.
 */

const TONE: Record<BoardStatus, v2.Tone> = { open: 'mut', under_review: 'wait', planned: 'earn', in_progress: 'earn', done: 'ok', declined: 'mut' };
const LABEL: Record<BoardStatus, string> = { open: 'New', under_review: 'Under review', planned: 'Planned', in_progress: 'In progress', done: 'Done', declined: 'Not planned' };
const TABS: BoardTab[] = ['open', 'under_review', 'planned', 'in_progress', 'done', 'declined', 'hidden'];
const tabHref = (t: FeedbackTab) => (t === 'open' ? '/feedback' : `/feedback?tab=${t}`);

export function FeedbackV2({
  tab,
  posts,
  notes,
  counts,
  now,
  canAct,
  hideTest,
}: {
  tab: FeedbackTab;
  posts: Read<BoardPost[]>;
  notes: Read<PrivateNote[]>;
  counts: Read<Record<BoardTab, number>>;
  now: string;
  canAct: boolean;
  hideTest: boolean;
}) {
  const at = new Date(now);
  const noCounts = counts.setup || counts.error;
  return (
    <>
      <v2.PageHeader
        title="Feedback board"
        sub="Ideas people suggest in the app, most voted first. Set where each one stands: everyone who backed it is told when it is planned, started or live."
        crumbs={[{ label: 'Help & safety', href: '/support' }, { label: 'Feedback board' }]}
      />
      <v2.Tabs
        label="Show"
        items={[
          ...TABS.map((t) => ({ href: tabHref(t), label: t === 'hidden' ? 'Hidden' : LABEL[t], active: tab === t, count: noCounts ? undefined : counts.data[t], hot: t === 'open' && !noCounts && counts.data.open > 0 })),
          { href: tabHref('notes'), label: 'Private notes', active: tab === 'notes', count: tab === 'notes' && !notes.setup && !notes.error ? notes.data.length : undefined },
        ]}
      />
      {canAct ? null : (
        <v2.Note tone="blue" title="View only">
          You can read the board, but only Admin, Support and Sales can change it.
        </v2.Note>
      )}
      {tab === 'notes' ? <Notes notes={notes} at={at} hideTest={hideTest} /> : <Ideas tab={tab} posts={posts} at={at} hideTest={hideTest} />}
    </>
  );
}

function Notes({ notes, at, hideTest }: { notes: Read<PrivateNote[]>; at: Date; hideTest: boolean }) {
  if (notes.setup) return <v2.SetupNotice what="Private feedback notes" />;
  if (notes.error) return <v2.ErrorState detail={notes.error} retryHref="/feedback?tab=notes" />;
  return (
    <v2.Card title="Private notes" sub="What people send with “Send feedback” in the app. Only staff see these.">
      <v2.DataTable
        caption="Private feedback notes"
        columns={[{ label: 'Kind' }, { label: 'From' }, { label: 'When' }, { label: 'Page' }, { label: 'What they wrote' }, { label: 'Files' }]}
        empty="No private notes yet"
        rows={notes.data.map((n) => ({
          key: n.id,
          test: !hideTest && isTestRow({ userId: n.authorId, title: n.body }),
          cells: [
            <v2.Pill key="k" tone={n.kind === 'broken' ? 'bad' : 'mut'}>
              {NOTE_KIND[n.kind] ?? 'Other'}
            </v2.Pill>,
            <Link key="a" href={`/users/${n.authorId}`}>
              {n.author}
            </Link>,
            <span key="w" className="wp9-small">
              {timeAgo(n.createdAt, at)}
            </span>,
            <span key="p" className="wp9-small">
              {n.page ?? '–'}
            </span>,
            <span key="b" className="wp9-small wp9-prose">
              {n.body}
            </span>,
            n.files.length ? <PhotoStrip key="f" photos={n.files} /> : <span key="f" className="wp9-muted">–</span>,
          ],
        }))}
      />
    </v2.Card>
  );
}

function Ideas({ tab, posts, at, hideTest }: { tab: BoardTab; posts: Read<BoardPost[]>; at: Date; hideTest: boolean }) {
  if (posts.setup) return <v2.SetupNotice what="The feedback board" />;
  if (posts.error) return <v2.ErrorState detail={posts.error} retryHref={tabHref(tab)} />;
  if (!posts.data.length) {
    return (
      <v2.Card>
        <v2.Empty title="Nothing here" icon="check">
          Ideas in this state show up here.
        </v2.Empty>
      </v2.Card>
    );
  }
  return (
    <div className="wp9-stack">
      {posts.data.map((p) => (
        <Idea key={p.id} p={p} at={at} hideTest={hideTest} />
      ))}
    </div>
  );
}

function Idea({ p, at, hideTest }: { p: BoardPost; at: Date; hideTest: boolean }) {
  const test = !hideTest && (isTestUserId(p.authorId) || isTestTitle(p.title));
  return (
    <v2.Card
      title={
        <>
          {p.title}
          {p.hidden ? <v2.Pill tone="danger">Hidden</v2.Pill> : <v2.Pill tone={TONE[p.status]}>{LABEL[p.status]}</v2.Pill>}
          <v2.TestTag show={test} />
        </>
      }
    >
      <div className="wp9-small wp9-muted">
        {BOARD_KIND[p.kind] ?? 'Other'} · {p.authorId ? <Link href={`/users/${p.authorId}`}>{p.author}</Link> : p.author} · {timeAgo(p.createdAt, at)} ·{' '}
        <b>
          {p.votes} {p.votes === 1 ? 'vote' : 'votes'}
        </b>
      </div>
      {p.body ? <p className="wp9-prose">{p.body}</p> : <p className="wp9-small wp9-muted">No details written.</p>}
      {p.hidden && p.hideReason ? <v2.Note tone="orange">Hidden because: “{p.hideReason}”</v2.Note> : null}
      {p.files.length ? <PhotoStrip photos={p.files} /> : null}

      <details className="wp9-comments">
        <summary>
          {p.comments.length} {p.comments.length === 1 ? 'comment' : 'comments'}
        </summary>
        {p.comments.length ? (
          p.comments.map((c) => (
            <div key={c.id} className="wp9-comment">
              <span className="wp9-small">
                <b>{c.author}</b> · <span className="wp9-muted">{timeAgo(c.at, at)}</span> {c.hidden ? <v2.Pill tone="danger">Hidden</v2.Pill> : null}
                <v2.TestTag show={!hideTest && isTestUserId(c.authorId)} />
                <br />
                {c.body}
              </span>
              {c.hidden ? (
                <Confirm
                  action={showIdeaComment}
                  hidden={{ commentId: c.id }}
                  label="Show it again"
                  tier={2}
                  area="people"
                  tone="plain"
                  small
                  title="Show this comment again?"
                  body={<p>Everyone on the board can read it again.</p>}
                  confirmLabel="Show again"
                />
              ) : (
                <Confirm
                  action={hideIdeaComment}
                  hidden={{ commentId: c.id }}
                  label="Hide comment"
                  tier={2}
                  area="people"
                  tone="plain"
                  small
                  title="Hide this comment?"
                  body={<p>It disappears from the board for everyone. It is kept, so you can show it again.</p>}
                  confirmLabel="Hide"
                />
              )}
            </div>
          ))
        ) : (
          <p className="wp9-small wp9-muted">No comments.</p>
        )}
      </details>

      <div className="v2-row wp9-mt">
        {p.hidden ? (
          <Confirm
            action={unhideIdea}
            hidden={{ postId: p.id }}
            label="Put it back on the board"
            tier={2}
            area="people"
            small
            title="Put this idea back on the board?"
            body={<p>Everyone can see, vote and comment on it again.</p>}
            confirmLabel="Put back"
          />
        ) : (
          <>
            <Confirm
              action={setIdeaStatus}
              hidden={{ postId: p.id }}
              label="Set status"
              tier={2}
              area="people"
              small
              title="Set where this idea stands"
              body={
                <p>
                  Planned, In progress and Done tell the person who suggested it and the {p.votes} {p.votes === 1 ? 'person' : 'people'} who voted. A note is added to the board as a reply from the
                  TaskDrop team.
                </p>
              }
              fields={
                <>
                  <label htmlFor={`wp9-st-${p.id}`}>Status</label>
                  <select id={`wp9-st-${p.id}`} name="status" defaultValue={p.status}>
                    {BOARD_STATUS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {LABEL[s.value]}
                      </option>
                    ))}
                  </select>
                  <label htmlFor={`wp9-nt-${p.id}`}>Public note (optional, everyone sees it)</label>
                  <textarea id={`wp9-nt-${p.id}`} name="note" rows={2} maxLength={1000} />
                </>
              }
              confirmLabel="Save status"
            />
            <Confirm
              action={replyToIdea}
              hidden={{ postId: p.id }}
              label="Reply as the TaskDrop team"
              tier={2}
              area="people"
              tone="plain"
              small
              title="Reply as the TaskDrop team?"
              body={<p>Your reply shows on the idea under the team’s name, and the person who suggested it is told. Do not put private details in it.</p>}
              fields={
                <>
                  <label htmlFor={`wp9-rp-${p.id}`}>Reply</label>
                  <textarea id={`wp9-rp-${p.id}`} name="body" rows={3} required maxLength={1000} />
                </>
              }
              confirmLabel="Post reply"
            />
            <Confirm
              action={hideIdea}
              hidden={{ postId: p.id }}
              label="Hide"
              tier={2}
              area="people"
              tone="warn"
              small
              title="Hide this idea?"
              body={<p>It leaves the board and can no longer be voted on or commented on. The person is not told. It is kept, so you can put it back. The reason is shown to staff.</p>}
              reason={{ label: 'Why (staff see this)' }}
              confirmLabel="Hide idea"
            />
          </>
        )}
      </div>
    </v2.Card>
  );
}
