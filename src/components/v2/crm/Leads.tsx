/** v2 Leads, /crm/leads (F335-F341). */
import Link from 'next/link';
import * as v2 from '@/components/v2/ui';
import { Confirm } from '@/components/v2/Confirm';
import { LEAD_STAGES, countByStage, filterLeads, leadFilterQuery, leadKindLabel, leadStageLabel, type LeadFilter, type LeadStage } from '@/lib/crm-calc';
import type { Read } from '@/lib/growth';
import type { Lead } from '@/lib/leads';
import { updateLead } from '@/lib/leads-actions';
import { istDate, timeAgo } from '@/lib/format';
import { isTestTitle, isTestUserId } from '@/lib/test-data';
import { AddLeadV2 } from './forms';
import { CUSTOMERS_CRUMB, How, nf } from './shared';

const STAGE_TONE: Record<LeadStage, v2.Tone> = { new: 'mut', contacted: 'wait', talking: 'earn', won: 'ok', lost: 'bad' };

/** A lead linked to a test account, or named like an end-to-end test (v2 "Hide test data"). */
export const isTestLead = (l: Pick<Lead, 'userId' | 'name'>) => isTestUserId(l.userId) || isTestTitle(l.name);

export type LeadsV2Data = {
  leads: Read<Lead[]>;
  filter: LeadFilter;
  staff: { id: string; name: string }[];
  me: string;
  now: string;
  hideTest: boolean;
};

export function LeadsV2({ d }: { d: LeadsV2Data }) {
  const now = new Date(d.now);
  const { filter, me, staff } = d;
  const all = d.hideTest ? d.leads.data.filter((l) => !isTestLead(l)) : d.leads.data;
  // Counts follow the owner filter, so "My leads" shows how many of mine sit in each stage.
  const ownerScoped = filterLeads(all, { stage: 'all', owner: filter.owner }, me);
  const counts = countByStage(ownerScoped);
  const shown = filterLeads(all, filter, me);
  const href = (f: LeadFilter) => {
    const q = leadFilterQuery(f);
    return `/crm/leads${q ? `?${q}` : ''}`;
  };
  const exportHref = `/api/crm/leads/export${leadFilterQuery(filter) ? `?${leadFilterQuery(filter)}` : ''}`;
  const someoneElse = filter.owner !== 'anyone' && filter.owner !== 'me' && filter.owner !== 'nobody';

  return (
    <>
      <v2.PageHeader
        title="Leads"
        sub="People and businesses who are not in TaskDrop yet: who you have reached, who is interested, who said yes."
        crumbs={[CUSTOMERS_CRUMB, { label: 'Leads' }]}
        right={
          shown.length ? (
            <a className="v2-btn sm" href={exportHref} download>
              Download leads
            </a>
          ) : undefined
        }
      />

      <How
        title="How leads work"
        steps={[
          ['Add them', <>Only the name is needed. Note where you found them.</>],
          ['Move them along', <>New → Contacted → Talking → Won or Lost. The “since” date shows how long they have waited.</>],
          ['Look after them', <>Give each lead to the member of staff who follows it up. Leads are not customers until they join the app.</>],
        ]}
      />

      {d.leads.setup ? (
        <v2.SetupNotice what="Leads" detail="crm_leads" />
      ) : d.leads.error ? (
        <v2.ErrorState detail={d.leads.error} retryHref="/crm/leads" />
      ) : (
        <>
          <v2.Chips
            label="Stage"
            items={[
              { href: href({ ...filter, stage: 'all' }), label: 'All', count: ownerScoped.length, active: filter.stage === 'all' },
              ...LEAD_STAGES.map((s) => ({ href: href({ ...filter, stage: s.key }), label: s.label, count: counts[s.key], active: filter.stage === s.key })),
            ]}
          />
          <div className="wp6-filterrow">
            <v2.Chips
              label="Looked after by"
              items={[
                { href: href({ ...filter, owner: 'anyone' }), label: 'Anyone’s', active: filter.owner === 'anyone' },
                { href: href({ ...filter, owner: 'me' }), label: 'My leads', active: filter.owner === 'me' },
                { href: href({ ...filter, owner: 'nobody' }), label: 'No owner', active: filter.owner === 'nobody' },
                ...(someoneElse ? [{ href: href(filter), label: staff.find((s) => s.id === filter.owner)?.name ?? 'Someone else', active: true }] : []),
              ]}
            />
            <form action="/crm/leads" method="get" className="wp6-inline">
              {filter.stage !== 'all' ? <input type="hidden" name="stage" value={filter.stage} /> : null}
              <label className="sr-only" htmlFor="wp6-lead-owner">
                Show the leads of
              </label>
              <select id="wp6-lead-owner" name="owner" defaultValue={filter.owner}>
                <option value="anyone">Anyone</option>
                <option value="nobody">No owner</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.id === me ? ' (me)' : ''}
                  </option>
                ))}
              </select>
              <button type="submit" className="v2-btn sm">
                Show
              </button>
            </form>
          </div>

          <v2.Grid cols="main">
            <v2.Card title={`${filter.stage === 'all' ? 'All leads' : `${leadStageLabel(filter.stage)} leads`} · ${nf(shown.length)} shown`}>
              <v2.DataTable
                caption="Leads"
                columns={[{ label: 'Name' }, { label: 'Stage' }, { label: 'Contact' }, { label: 'Source' }, { label: 'Added' }, { label: 'Looked after by' }, { label: '' }]}
                empty={all.length ? 'No leads match. Try another stage or owner.' : 'No leads yet. Add the first one from the form.'}
                rows={shown.map((l) => ({
                  key: l.id,
                  test: !d.hideTest && isTestLead(l),
                  cells: [
                    <span key="n" className="wp6-msg">
                      <b>
                        {l.name} <v2.Pill tone="mut">{leadKindLabel(l.kind)}</v2.Pill>
                      </b>
                      {l.userId ? (
                        <span>
                          <Link href={`/users/${l.userId}`}>Open their app account</Link>
                        </span>
                      ) : null}
                      {l.note ? <span className="v2-muted">{l.note}</span> : null}
                    </span>,
                    <span key="s" className="wp6-msg">
                      <v2.Pill tone={STAGE_TONE[l.stage as LeadStage] ?? 'mut'}>{leadStageLabel(l.stage)}</v2.Pill>
                      <span className="v2-muted" title={istDate(l.stageChangedAt)}>
                        since {timeAgo(l.stageChangedAt, now)}
                      </span>
                    </span>,
                    <span key="c" className="v2-mono wp6-small">
                      {l.contact ?? '—'}
                    </span>,
                    <span key="src" className="wp6-small">
                      {l.source ?? '—'}
                    </span>,
                    <span key="a" className="wp6-msg">
                      <span>{istDate(l.createdAt)}</span>
                      {l.createdBy ? <span className="v2-muted">by {l.createdBy}</span> : null}
                    </span>,
                    <span key="o" className="wp6-small">
                      {l.owner ?? <span className="v2-muted">No owner</span>}
                    </span>,
                    <Confirm
                      key="e"
                      action={updateLead}
                      hidden={{ leadId: l.id }}
                      label="Edit"
                      tier={2}
                      area="people"
                      tone="plain"
                      small
                      title={`Edit ${l.name}`}
                      body={<p>Change where they are and who looks after them.</p>}
                      fields={
                        <>
                          <label htmlFor={`ld-s-${l.id}`}>Stage</label>
                          <select id={`ld-s-${l.id}`} name="stage" defaultValue={l.stage}>
                            {LEAD_STAGES.map((s) => (
                              <option key={s.key} value={s.key}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                          <label htmlFor={`ld-o-${l.id}`}>Looked after by</label>
                          <select id={`ld-o-${l.id}`} name="owner" defaultValue={l.ownerId ?? ''}>
                            <option value="">No owner</option>
                            {staff.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                                {s.id === me ? ' (me)' : ''}
                              </option>
                            ))}
                          </select>
                          <label htmlFor={`ld-n-${l.id}`}>Note</label>
                          <textarea id={`ld-n-${l.id}`} name="note" rows={2} maxLength={2000} defaultValue={l.note ?? ''} placeholder="What was said, what happens next" />
                        </>
                      }
                      confirmLabel="Save"
                    />,
                  ],
                }))}
              />
            </v2.Card>
            <v2.Card title="Add a lead" sub="Only the name is needed.">
              <AddLeadV2 staff={staff} me={me} />
            </v2.Card>
          </v2.Grid>
        </>
      )}
    </>
  );
}
