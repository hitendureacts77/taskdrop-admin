/** v2 Follow-ups & pipeline, /crm/tasks (F330-F334). */
import * as v2 from '@/components/v2/ui';
import { Confirm } from '@/components/v2/Confirm';
import { finishFollowUp } from '@/lib/growth-actions';
import type { FollowUp, Read } from '@/lib/growth';
import { PIPELINE_STAGES } from '@/lib/growth-calc';
import { istDate } from '@/lib/format';
import { isTestTitle, isTestUserId } from '@/lib/test-data';
import { AddFollowUpV2 } from './forms';
import { CUSTOMERS_CRUMB, Who, nf } from './shared';

export type FollowUpView = 'mine' | 'all' | 'done';

export const isTestFollowUp = (f: Pick<FollowUp, 'userId' | 'title'>) => isTestUserId(f.userId) || isTestTitle(f.title);

export function FollowUpsV2({
  view,
  items,
  pipeline,
  staff,
  me,
  now: nowIso,
  hideTest,
}: {
  view: FollowUpView;
  items: Read<FollowUp[]>;
  pipeline: Read<Record<string, { people: number; atRisk: number }>>;
  staff: { id: string; name: string }[];
  me: string;
  now: string;
  hideTest: boolean;
}) {
  const now = new Date(nowIso);
  const total = Object.values(pipeline.data).reduce((s, x) => s + x.people, 0);
  const rows = hideTest ? items.data.filter((f) => !isTestFollowUp(f)) : items.data;
  const done = view === 'done';
  return (
    <>
      <v2.PageHeader
        title="Follow-ups & pipeline"
        sub="Things staff must do for customers, and where every customer is on the road from signing up to coming back."
        crumbs={[CUSTOMERS_CRUMB, { label: 'Follow-ups & pipeline' }]}
      />

      <v2.Card title="Customer pipeline" sub="Where each person has got to. Click a stage to find people on the Segments page.">
        {pipeline.setup ? (
          <v2.SetupNotice what="The customer pipeline" detail="admin_pipeline_counts" />
        ) : pipeline.error ? (
          <v2.ErrorState detail={pipeline.error} retryHref="/crm/tasks" />
        ) : (
          <>
            <v2.Grid cols={5}>
              {PIPELINE_STAGES.map((s, i) => {
                const x = pipeline.data[s.key] ?? { people: 0, atRisk: 0 };
                return (
                  <v2.Tile
                    key={s.key}
                    small
                    href="/crm/segments"
                    label={`${i + 1}. ${s.label}`}
                    value={nf(x.people)}
                    foot={
                      <>
                        {total ? `${Math.round((x.people / total) * 100)}% of everyone` : '—'} · {s.hint}
                        {x.atRisk ? <b className="wp6-risk"> · {nf(x.atRisk)} at risk</b> : null}
                      </>
                    }
                  />
                );
              })}
            </v2.Grid>
            <p className="v2-muted wp6-small">
              At risk = not seen for 30 days after getting started.
              {hideTest ? ' These counts come straight from the database and still include test accounts.' : ''}
            </p>
          </>
        )}
      </v2.Card>

      <v2.Grid cols="main" className="wp6-gap">
        <div>
          <v2.Tabs
            label="Show"
            items={[
              { href: '/crm/tasks', label: 'Mine', active: view === 'mine' },
              { href: '/crm/tasks?view=all', label: 'Everyone’s open', active: view === 'all' },
              { href: '/crm/tasks?view=done', label: 'Done', active: done },
            ]}
          />
          <v2.Card title={done ? 'Done' : 'Open follow-ups'} sub={items.setup || items.error ? undefined : `${nf(rows.length)} shown`}>
            {items.setup ? (
              <v2.SetupNotice what="Follow-ups" detail="crm_tasks" />
            ) : items.error ? (
              <v2.ErrorState detail={items.error} retryHref="/crm/tasks" />
            ) : (
              <v2.DataTable
                caption={done ? 'Finished follow-ups' : 'Open follow-ups'}
                columns={[{ label: 'What' }, { label: 'About' }, { label: done ? 'Done' : 'Due' }, { label: done ? 'Done by' : 'Owner' }, { label: '' }]}
                empty={done ? 'Nothing finished yet' : 'Nothing to do. New follow-ups show up here.'}
                rows={rows.map((f) => {
                  const overdue = f.status === 'open' && f.dueAt !== null && new Date(f.dueAt) < now;
                  return {
                    key: f.id,
                    late: overdue,
                    test: !hideTest && isTestFollowUp(f),
                    cells: [
                      <span key="w" className="wp6-msg">
                        <b>
                          {f.title} {f.source === 'automation' ? <v2.Pill tone="earn">Automatic</v2.Pill> : null}
                        </b>
                        {f.detail ? <span className="v2-muted">{f.detail}</span> : null}
                      </span>,
                      <Who key="a" id={f.userId} name={f.person} />,
                      done ? (
                        <span key="d" className="wp6-small">
                          {f.completedAt ? istDate(f.completedAt) : '—'}
                        </span>
                      ) : f.dueAt ? (
                        overdue ? (
                          <v2.Pill key="d" tone="danger">
                            Overdue · {istDate(f.dueAt)}
                          </v2.Pill>
                        ) : (
                          <span key="d" className="wp6-small">
                            {istDate(f.dueAt)}
                          </span>
                        )
                      ) : (
                        <span key="d" className="v2-muted wp6-small">
                          No date
                        </span>
                      ),
                      <span key="o" className="wp6-small">
                        {done ? (f.completedBy ?? '—') : f.owner}
                      </span>,
                      done ? (
                        <Confirm
                          key="b"
                          action={finishFollowUp}
                          hidden={{ taskId: f.id, reopen: '1' }}
                          undo={{ action: finishFollowUp, hidden: { taskId: f.id } }}
                          label="Reopen"
                          tier={1}
                          area="people"
                          small
                        />
                      ) : (
                        <Confirm
                          key="b"
                          action={finishFollowUp}
                          hidden={{ taskId: f.id }}
                          undo={{ action: finishFollowUp, hidden: { taskId: f.id, reopen: '1' } }}
                          label="Finish"
                          tier={1}
                          area="people"
                          small
                        />
                      ),
                    ],
                  };
                })}
              />
            )}
          </v2.Card>
        </div>
        <div>
          {items.setup ? null : (
            <v2.Card title="Add a follow-up" sub="You can also add one from a person’s page.">
              <AddFollowUpV2 staff={staff} me={me} />
            </v2.Card>
          )}
        </div>
      </v2.Grid>
    </>
  );
}
