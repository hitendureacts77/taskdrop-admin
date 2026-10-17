import Link from 'next/link';
import { AddLeadForm, LeadEditForm } from '../LeadForms';
import { LEAD_STAGES, countByStage, filterLeads, leadFilterQuery, leadKindLabel, leadStageLabel, type LeadFilter, type LeadStage } from '@/lib/crm-calc';
import type { Read } from '@/lib/growth';
import type { Lead } from '@/lib/leads';
import { istDate, timeAgo } from '@/lib/format';
import type { Tone } from '@/lib/labels';
import { Card, Empty, HowItWorks, PageHeader, Pill, Tabs } from '../ui';
import { ReadError, SetupNotice } from './SetupNotice';

const STAGE_TONE: Record<LeadStage, Tone> = { new: 'blue', contacted: 'gold', talking: 'gold', won: 'green', lost: 'grey' };

export type LeadsData = {
  leads: Read<Lead[]>;
  filter: LeadFilter;
  staff: { id: string; name: string }[];
  me: string;
  canEdit: boolean;
  now: string;
};

export function LeadsView({ d }: { d: LeadsData }) {
  const now = new Date(d.now);
  const { filter, me, staff } = d;
  // Counts follow the owner filter, so "Mine" shows how many of my leads sit in each stage.
  const ownerScoped = filterLeads(d.leads.data, { stage: 'all', owner: filter.owner }, me);
  const counts = countByStage(ownerScoped);
  const shown = filterLeads(d.leads.data, filter, me);
  const href = (f: LeadFilter) => {
    const q = leadFilterQuery(f);
    return `/crm/leads${q ? `?${q}` : ''}`;
  };
  const exportHref = `/api/crm/leads/export${leadFilterQuery(filter) ? `?${leadFilterQuery(filter)}` : ''}`;
  const ownerTabs = [
    { href: href({ ...filter, owner: 'anyone' }), label: 'Anyone’s', active: filter.owner === 'anyone' },
    { href: href({ ...filter, owner: 'me' }), label: 'My leads', active: filter.owner === 'me' },
    { href: href({ ...filter, owner: 'nobody' }), label: 'No owner', active: filter.owner === 'nobody' },
  ];

  return (
    <>
      <PageHeader
        crumbs={[{ href: '/crm', label: 'Customers' }, { label: 'Leads' }]}
        title="Leads"
        sub="People and businesses who are not in TaskDrop yet: who you have reached, who is interested, who said yes."
        right={
          shown.length ? (
            <a className="btn btn-small" href={exportHref} download>
              Download spreadsheet
            </a>
          ) : undefined
        }
      />

      <HowItWorks
        open={false}
        title="How leads work"
        steps={[
          <>Add someone with just a name. Add a phone, email or link, where you found them, and a note if you have them.</>,
          <>Move them through New, Contacted and Talking. Mark them Won when they sign up, or Lost if they say no.</>,
          <>Give each lead to the member of staff who is following it up. They stay on this page; leads are not customers until they join the app.</>,
        ]}
      />

      {d.leads.setup ? (
        <SetupNotice what="Leads" migration="097_closeout" />
      ) : d.leads.error ? (
        <ReadError message={d.leads.error} />
      ) : (
        <>
          <Tabs
            label="Stage"
            items={[
              { href: href({ ...filter, stage: 'all' }), label: 'All', active: filter.stage === 'all', count: ownerScoped.length },
              ...LEAD_STAGES.map((s) => ({ href: href({ ...filter, stage: s.key }), label: s.label, active: filter.stage === s.key, count: counts[s.key] })),
            ]}
          />
          <Tabs
            label="Looked after by"
            small
            items={[
              ...ownerTabs,
              ...(filter.owner !== 'anyone' && filter.owner !== 'me' && filter.owner !== 'nobody'
                ? [{ href: href(filter), label: staff.find((s) => s.id === filter.owner)?.name ?? 'Someone else', active: true }]
                : []),
            ]}
          />
          <form action="/crm/leads" method="get" className="crm-inline">
            {filter.stage !== 'all' ? <input type="hidden" name="stage" value={filter.stage} /> : null}
            <label htmlFor="lead-owner-pick">Show leads of</label>
            <select id="lead-owner-pick" name="owner" className="field lead-pick" defaultValue={filter.owner}>
              <option value="anyone">Anyone</option>
              <option value="nobody">Nobody (no owner)</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.id === me ? ' (me)' : ''}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn-small">
              Show
            </button>
          </form>

          <div className="grid-main-side">
            <Card title={filter.stage === 'all' ? 'All leads' : `${leadStageLabel(filter.stage)} leads`} sub={`${shown.length.toLocaleString('en-IN')} shown`} flush={shown.length > 0}>
              {shown.length ? (
                <ul className="lead-list">
                  {shown.map((l) => (
                    <li key={l.id} className="lead">
                      <div className="lead-head">
                        <strong>{l.name}</strong>
                        <Pill tone="grey">{leadKindLabel(l.kind)}</Pill>
                        <Pill tone={STAGE_TONE[l.stage as LeadStage] ?? 'grey'}>{leadStageLabel(l.stage)}</Pill>
                        {l.userId ? (
                          <Link className="small" href={`/users/${l.userId}`}>
                            Open their account
                          </Link>
                        ) : null}
                      </div>
                      <span className="muted small">
                        {[l.contact, l.source ? `From ${l.source}` : null, `Added ${istDate(l.createdAt)}${l.createdBy ? ` by ${l.createdBy}` : ''}`, `${leadStageLabel(l.stage)} since ${timeAgo(l.stageChangedAt, now)}`]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                      {d.canEdit ? (
                        <LeadEditForm leadId={l.id} stage={l.stage} ownerId={l.ownerId} note={l.note} staff={staff} me={me} />
                      ) : (
                        <span className="small">
                          Looked after by {l.owner ?? 'nobody'}
                          {l.note ? <span className="muted block">{l.note}</span> : null}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty title={d.leads.data.length ? 'No leads match' : 'No leads yet'}>
                  {d.leads.data.length ? 'Try another stage or owner.' : 'Add the first one from the form.'}
                </Empty>
              )}
            </Card>

            <div className="stack">
              {d.canEdit ? (
                <Card title="Add a lead" sub="Only the name is needed.">
                  <AddLeadForm staff={staff} me={me} />
                </Card>
              ) : (
                <Card title="Add a lead">
                  <p className="muted small">Your staff role can look at leads but not change them. Ask a full admin or a support member.</p>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
