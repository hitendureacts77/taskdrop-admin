import { ConfirmAction } from '../ConfirmAction';
import { hideIdea, hideIdeaComment, replyToIdea, setIdeaStatus, showIdeaComment, unhideIdea } from '@/lib/feedback-actions';
import { BOARD_KIND, BOARD_STATUS, type BoardPost, type BoardStatus, type BoardTab } from '@/lib/feedback';
import type { Read } from '@/lib/growth';
import { timeAgo } from '@/lib/format';
import type { Tone } from '@/lib/labels';
import { Card, Empty, PageHeader, Pill, Tabs } from '../ui';
import { ReadError, SetupNotice } from './SetupNotice';

const TONE: Record<BoardStatus, Tone> = { open: 'grey', under_review: 'gold', planned: 'blue', in_progress: 'blue', done: 'green', declined: 'grey' };
const LABEL = Object.fromEntries(BOARD_STATUS.map((s) => [s.value, s.label])) as Record<BoardStatus, string>;

const TABS: { tab: BoardTab; label: string }[] = [
  { tab: 'open', label: 'New' },
  { tab: 'under_review', label: 'Under review' },
  { tab: 'planned', label: 'Planned' },
  { tab: 'in_progress', label: 'In progress' },
  { tab: 'done', label: 'Done' },
  { tab: 'declined', label: 'Not planned' },
  { tab: 'hidden', label: 'Hidden' },
];

export function FeedbackView({ tab, posts, counts, now }: { tab: BoardTab; posts: Read<BoardPost[]>; counts: Read<Record<BoardTab, number>>; now: string }) {
  const at = new Date(now);
  return (
    <>
      <PageHeader
        title="Feedback board"
        sub="Ideas people suggest in the app, most voted first. Set where each one stands: everyone who backed it is told when it is planned, started or live."
      />
      <Tabs
        label="Show"
        items={TABS.map((t) => ({
          href: t.tab === 'open' ? '/feedback' : `/feedback?tab=${t.tab}`,
          label: t.label,
          active: tab === t.tab,
          count: counts.setup || counts.error ? undefined : counts.data[t.tab],
        }))}
      />
      {posts.setup ? <SetupNotice what="The feedback board" migration="136_feedback_board" /> : null}
      {posts.error ? <ReadError message={posts.error} /> : null}
      {!posts.setup && !posts.error ? (
        posts.data.length ? (
          <div className="stack">
            {posts.data.map((p) => (
              <Card
                key={p.id}
                title={p.title}
                sub={`${BOARD_KIND[p.kind] ?? p.kind} · ${p.author} · ${timeAgo(p.createdAt, at)} · ${p.votes} ${p.votes === 1 ? 'vote' : 'votes'}`}
                right={p.hidden ? <Pill tone="red">Hidden</Pill> : <Pill tone={TONE[p.status]}>{LABEL[p.status]}</Pill>}
              >
                {p.body ? <p className="prose">{p.body}</p> : <p className="muted small">No details written.</p>}
                {p.hidden && p.hideReason ? <p className="muted small">Hidden because: {p.hideReason}</p> : null}

                {p.comments.length ? (
                  <details className="run-details">
                    <summary>
                      <strong>
                        {p.comments.length} {p.comments.length === 1 ? 'comment' : 'comments'}
                      </strong>
                    </summary>
                    <div className="stack">
                      {p.comments.map((c) => (
                        <div key={c.id}>
                          <p className="small">
                            <strong>{c.author}</strong> <span className="muted">{timeAgo(c.at, at)}</span>
                            {c.hidden ? <Pill tone="red">Hidden</Pill> : null}
                          </p>
                          <p className="prose">{c.body}</p>
                          {c.hidden ? (
                            <ConfirmAction
                              action={showIdeaComment}
                              hidden={{ commentId: c.id }}
                              trigger="Show it again"
                              tone="quiet"
                              title="Show this comment again?"
                              consequence="Everyone on the board can read it again."
                              confirmLabel="Show it again"
                            />
                          ) : (
                            <ConfirmAction
                              action={hideIdeaComment}
                              hidden={{ commentId: c.id }}
                              trigger="Hide comment"
                              tone="danger"
                              title="Hide this comment?"
                              consequence="It disappears from the board for everyone. It is kept, so you can show it again."
                              confirmLabel="Yes, hide it"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}

                <div className="pill-row">
                  <ConfirmAction
                    action={setIdeaStatus}
                    hidden={{ postId: p.id }}
                    trigger="Set status"
                    title="Where does this idea stand?"
                    consequence="Planned, In progress and Done send a notification to the person who suggested it and to everyone who voted for it. A note is added to the board as a reply from the TaskDrop team."
                    choice={{ name: 'status', label: 'Status', options: BOARD_STATUS.map((s) => ({ value: s.value, label: s.label })), defaultValue: p.status }}
                    field={{ name: 'note', label: 'Note for the board (optional, everyone can read it)' }}
                    confirmLabel="Save status"
                  />
                  <ConfirmAction
                    action={replyToIdea}
                    hidden={{ postId: p.id }}
                    trigger="Reply"
                    tone="quiet"
                    title="Reply as the TaskDrop team?"
                    consequence="Your reply shows on the idea under the team's name, and the person who suggested it gets a notification. Do not put private details in it."
                    field={{ name: 'body', label: 'Your reply', required: true }}
                    confirmLabel="Post reply"
                  />
                  {p.hidden ? (
                    <ConfirmAction
                      action={unhideIdea}
                      hidden={{ postId: p.id }}
                      trigger="Put it back on the board"
                      tone="quiet"
                      title="Put this idea back on the board?"
                      consequence="Everyone can see, vote and comment on it again."
                      confirmLabel="Put it back"
                    />
                  ) : (
                    <ConfirmAction
                      action={hideIdea}
                      hidden={{ postId: p.id }}
                      trigger="Hide"
                      tone="danger"
                      title="Hide this idea?"
                      consequence="It disappears from the board and can no longer be voted on or commented on. The person is not told. It is kept, so you can put it back."
                      field={{ name: 'reason', label: 'Why', required: true }}
                      confirmLabel="Yes, hide it"
                    />
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Empty title={tab === 'open' ? 'No new ideas' : 'Nothing here'} icon="inbox">
            Ideas people suggest in the app show up here.
          </Empty>
        )
      ) : null}
    </>
  );
}
