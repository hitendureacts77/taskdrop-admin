import Link from 'next/link';
import { RuleForm } from '../RulesForms';
import { ConfirmAction } from '../ConfirmAction';
import { describeRule, ruleKindLabel } from '@/lib/crm-calc';
import { istDateTime, timeAgo } from '@/lib/format';
import type { Read } from '@/lib/growth';
import type { RulesData } from '@/lib/rules';
import { deleteRule, setRuleEnabled } from '@/lib/rules-actions';
import { roleLabel, type StaffRole } from '@/lib/staff-roles';
import { ConfigHeader } from './AdminConfigViews';
import { ReadError, SetupNotice } from './SetupNotice';
import { Card, Empty, Notice, Pill } from '../ui';

export function RulesView({ rules, canEdit, role, now: nowIso }: { rules: Read<RulesData>; canEdit: boolean; role: StaffRole; now: string }) {
  const now = new Date(nowIso);
  return (
    <>
      <ConfigHeader active="rules" />

      {canEdit ? null : (
        <Notice tone="gold" icon="shield" title="You can look, but not change">
          Your staff role ({roleLabel(role)}) can’t do this. Ask a full admin.
        </Notice>
      )}

      {rules.setup ? (
        <SetupNotice what="Automation rules" migration="097_closeout" />
      ) : rules.error ? (
        <ReadError message={rules.error} />
      ) : (
        <>
          <Card
            title="Automation rules"
            sub="A rule that is on creates follow-up tasks for customers automatically, checked every 3 hours. Each rule makes at most one follow-up per person."
            flush={rules.data.rules.length > 0}
          >
            {rules.data.rules.length ? (
              <ul className="settings">
                {rules.data.rules.map((r) => (
                  <li key={r.id} className="setting">
                    <div className="setting-text">
                      <strong>{r.name}</strong>
                      <span className="muted small">
                        {ruleKindLabel(r.kind)}: {describeRule(r.kind, r.days)}
                      </span>
                      <span className="muted small">
                        {r.created ? `${r.created.toLocaleString('en-IN')} follow-up${r.created === 1 ? '' : 's'} created so far` : 'No follow-ups created yet'}
                        {r.lastCreatedAt ? ` · last ${timeAgo(r.lastCreatedAt, now)} (${istDateTime(r.lastCreatedAt)})` : ''}
                      </span>
                    </div>
                    <div className="setting-value">
                      <Pill tone={r.enabled ? 'green' : 'grey'}>{r.enabled ? 'On' : 'Off'}</Pill>
                    </div>
                    {canEdit ? (
                      <ConfirmAction
                        action={setRuleEnabled}
                        hidden={{ id: r.id, name: r.name, kind: r.kind, days: String(r.days), enabled: String(!r.enabled) }}
                        asSwitch={{ on: r.enabled }}
                        trigger={`${r.name}: turn ${r.enabled ? 'off' : 'on'}`}
                        title={`Turn ${r.enabled ? 'off' : 'on'} “${r.name}”?`}
                        consequence={
                          r.enabled ? (
                            <>No new follow-ups will be created by this rule. Follow-ups it already made stay in the list.</>
                          ) : (
                            <>
                              This will create follow-up tasks for customers automatically, checked every 3 hours. {describeRule(r.kind, r.days)} Each person gets at most one from this rule, and staff see them under Follow-ups.
                            </>
                          )
                        }
                        confirmLabel={r.enabled ? 'Turn off' : 'Turn on'}
                      />
                    ) : (
                      <span />
                    )}
                    {canEdit ? (
                      <div className="rule-actions">
                        <details className="rule-edit">
                          <summary className="btn btn-small">Edit</summary>
                          <RuleForm rule={{ id: r.id, name: r.name, kind: r.kind, days: r.days, enabled: r.enabled }} />
                        </details>
                        <ConfirmAction
                          action={deleteRule}
                          hidden={{ id: r.id }}
                          trigger="Delete"
                          tone="quiet"
                          title={`Delete “${r.name}”?`}
                          consequence={<>The rule stops for good. Follow-ups it already created stay where they are. You can add a rule like it again later.</>}
                          confirmLabel="Yes, delete the rule"
                        />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty title="No rules yet">{canEdit ? 'Add one below. New rules start switched off.' : 'A full admin can add one.'}</Empty>
            )}
          </Card>

          {canEdit ? (
            <Card title="Add a rule" sub="It starts switched off. Turn it on from the list when you are ready.">
              <RuleForm />
            </Card>
          ) : null}

          <Card title="Latest automation follow-ups" sub="The 10 newest follow-ups the rules have made." flush={rules.data.latest.length > 0}>
            {rules.data.latest.length ? (
              <ul className="lead-list">
                {rules.data.latest.map((f) => (
                  <li key={f.id} className="lead">
                    <div className="lead-head">
                      <strong>{f.title}</strong>
                      <Pill tone={f.status === 'done' ? 'green' : 'blue'}>{f.status === 'done' ? 'Done' : 'Open'}</Pill>
                    </div>
                    <span className="muted small">
                      {f.userId ? <Link href={`/users/${f.userId}`}>{f.person}</Link> : 'No person'} · {f.ruleName ?? 'a rule that was deleted'} · {timeAgo(f.createdAt, now)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small">None yet. They appear here after a rule that is switched on finds someone.</p>
            )}
          </Card>
        </>
      )}
    </>
  );
}
