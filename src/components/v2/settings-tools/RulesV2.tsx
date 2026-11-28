import Link from 'next/link';
import { Confirm } from '@/components/v2/Confirm';
import * as v2 from '@/components/v2/ui';
import { describeRule, RULE_KINDS, ruleKindLabel } from '@/lib/crm-calc';
import { istDateTime, timeAgo } from '@/lib/format';
import type { Read } from '@/lib/growth';
import type { Rule, RulesData } from '@/lib/rules';
import { deleteRule, saveRule, setRuleEnabled } from '@/lib/rules-actions';
import type { StaffRole } from '@/lib/staff-roles';
import { isTestUserId } from '@/lib/test-data';
import { RuleAddV2 } from './RuleAddV2';
import { SettingsToolsHead } from './SettingsToolsHead';

/** Pre-Plan B rules: pay per task has no wallet top-ups, so a "topped up" rule never fires (owner decision 1: keep, tagged). */
const isOldRule = (r: Rule) => /top(ped)?[\s-]?up|wallet/i.test(r.name);

function EditFields({ r }: { r: Rule }) {
  const f = `rule-${r.id}`;
  return (
    <div className="wp8b-form">
      <input type="hidden" name="id" value={r.id} />
      <input type="hidden" name="enabled" value={r.enabled ? 'true' : 'false'} />
      <label htmlFor={`${f}-name`}>Name</label>
      <input id={`${f}-name`} name="name" maxLength={120} required defaultValue={r.name} autoComplete="off" />
      <label htmlFor={`${f}-kind`}>When</label>
      <select id={`${f}-kind`} name="kind" defaultValue={r.kind}>
        {RULE_KINDS.map((k) => (
          <option key={k.key} value={k.key}>
            {k.label}
          </option>
        ))}
      </select>
      <label htmlFor={`${f}-days`}>Days (1 to 90)</label>
      <input id={`${f}-days`} name="days" type="number" inputMode="numeric" min={1} max={90} step={1} required defaultValue={r.days} />
    </div>
  );
}

function RuleRow({ r, now }: { r: Rule; now: Date }) {
  const old = isOldRule(r);
  return (
    <li className="wp8b-rule">
      <div className="tx">
        <div className="v2-row">
          <b>{r.name}</b>
          <v2.Pill tone={r.enabled ? 'ok' : 'mut'}>{r.enabled ? 'On' : 'Off'}</v2.Pill>
          {old ? <v2.OldTag /> : null}
        </div>
        <div className="d">{describeRule(r.kind, r.days)}</div>
        <div className="v2-muted wp8b-sm">
          When: {ruleKindLabel(r.kind)} · after {r.days} day{r.days === 1 ? '' : 's'} ·{' '}
          {r.created ? `${r.created.toLocaleString('en-IN')} follow-up${r.created === 1 ? '' : 's'} made so far` : 'No follow-ups made yet'}
          {r.lastCreatedAt ? <span title={istDateTime(r.lastCreatedAt)}> · last {timeAgo(r.lastCreatedAt, now)}</span> : null}
        </div>
        {old ? <div className="v2-muted wp8b-sm">Pay per task has no wallet top-ups, so this rule may never fire. Kept on purpose; delete it if you no longer want it.</div> : null}
      </div>
      <Confirm
        action={setRuleEnabled}
        hidden={{ id: r.id, name: r.name, kind: r.kind, days: String(r.days), enabled: String(!r.enabled) }}
        asSwitch={{ on: r.enabled }}
        label={`${r.name}: turn ${r.enabled ? 'off' : 'on'}`}
        tier={2}
        area="admin"
        title={`Turn ${r.enabled ? 'off' : 'on'} “${r.name}”?`}
        body={
          r.enabled ? (
            <p>No new follow-ups are made by this rule. Follow-ups it already made stay in the list.</p>
          ) : (
            <p>
              Follow-ups start being made for customers who match, checked every 3 hours. {describeRule(r.kind, r.days)} Each person gets at most one from this rule.
            </p>
          )
        }
        confirmLabel={r.enabled ? 'Turn off' : 'Turn on'}
        tone={r.enabled ? 'danger' : 'pri'}
      />
      <div className="v2-row acts">
        <Confirm
          action={saveRule}
          label="Edit"
          small
          tone="plain"
          tier={2}
          area="admin"
          title={`Edit “${r.name}”`}
          body={<p>Changes apply from the next run. Saving keeps the rule {r.enabled ? 'on' : 'off'}.</p>}
          fields={<EditFields r={r} />}
          confirmLabel="Save changes"
        />
        <Confirm
          action={deleteRule}
          hidden={{ id: r.id }}
          label="Delete"
          small
          tone="plain"
          tier={2}
          area="admin"
          title={`Delete the rule “${r.name}”?`}
          body={<p>The rule stops for good. Follow-ups it already made stay where they are. You can add a rule like it again later.</p>}
          confirmLabel="Delete rule"
        />
      </div>
    </li>
  );
}

export function RulesV2({ rules, role, now: nowIso, hideTest }: { rules: Read<RulesData>; role: StaffRole; now: string; hideTest: boolean }) {
  const now = new Date(nowIso);
  const latest = rules.data.latest.filter((f) => !hideTest || !isTestUserId(f.userId));
  return (
    <>
      <SettingsToolsHead active="/settings/rules" role={role} sub="Rules that create follow-ups for customers by themselves." />
      {rules.setup ? (
        <v2.SetupNotice what="Automation rules are not on this server yet." detail="crm_rules" />
      ) : rules.error ? (
        <v2.ErrorState title="Could not load the rules" detail={rules.error} retryHref="/settings/rules" />
      ) : (
        <v2.Grid cols="main">
          <div className="wp8b-stack">
            <v2.Card
              title="Automation rules"
              sub={
                <>
                  A rule that is on makes follow-up tasks for customers by itself, checked every 3 hours. They show on{' '}
                  <Link href="/crm/tasks">Follow-ups &amp; pipeline</Link>.
                </>
              }
            >
              {rules.data.rules.length ? (
                <ul className="wp8b-rules">
                  {rules.data.rules.map((r) => (
                    <RuleRow key={r.id} r={r} now={now} />
                  ))}
                </ul>
              ) : (
                <v2.Empty title="No rules yet" icon="list">
                  {role === 'admin' ? 'Add one on the right. New rules start switched off.' : 'A full Admin can add one.'}
                </v2.Empty>
              )}
            </v2.Card>
            <v2.Card title="Latest automation follow-ups" sub={`The 10 newest${latest.length && latest.length < 10 ? `. ${latest.length} so far.` : '.'}`}>
              <v2.DataTable
                columns={[{ label: 'Follow-up' }, { label: 'About' }, { label: 'Rule' }, { label: 'Made' }, { label: 'State' }]}
                empty="None yet. They appear here after a rule that is on finds someone."
                rows={latest.map((f) => ({
                  key: f.id,
                  test: isTestUserId(f.userId),
                  cells: [
                    f.title,
                    f.userId ? <Link href={`/users/${f.userId}`}>{f.person}</Link> : <span className="v2-muted">No person</span>,
                    f.ruleName ?? <span className="v2-muted">A deleted rule</span>,
                    <span title={istDateTime(f.createdAt)}>{timeAgo(f.createdAt, now)}</span>,
                    <v2.Pill tone={f.status === 'done' ? 'ok' : 'wait'}>{f.status === 'done' ? 'Done' : 'Open'}</v2.Pill>,
                  ],
                }))}
              />
            </v2.Card>
          </div>
          <div className="wp8b-stack">
            <v2.Card title="Add a rule" sub="It starts switched off. Turn it on from the list when you are ready.">
              <RuleAddV2 />
            </v2.Card>
          </div>
        </v2.Grid>
      )}
    </>
  );
}
