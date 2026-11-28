import Link from 'next/link';
import * as v2 from '@/components/v2/ui';
import { Confirm } from '@/components/v2/Confirm';
import type { FormAction } from '@/components/ConfirmAction';
import { istDateTime } from '@/lib/format';
import { readableSetting } from '@/lib/setting-input';
import type { SettingRow } from '@/lib/data/settings';
import type { StaffRole } from '@/lib/staff-roles';
import { SettingsHead } from './SettingsHead';
import { advancedName, inputForSetting, MONEY_SETTINGS, SHOWN_ELSEWHERE, showSetting, UNIT } from './setting-meta';

/** v2 Money & timing (design setMoney, F373–F389). Changes go through today's updateSetting. */
export function MoneyTimingV2({ rows, role, update, serverIdle }: { rows: SettingRow[]; role: StaffRole; update: FormAction; serverIdle: number }) {
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const known = Object.keys(MONEY_SETTINGS).filter((k) => byKey.has(k));
  const other = rows.filter((r) => !MONEY_SETTINGS[r.key] && !SHOWN_ELSEWHERE.has(r.key));
  const dev = byKey.get('dev_otp_for_all');
  const devOn = dev?.value === true || dev?.value === 'true';
  const idleSetting = Number(byKey.get('admin_session_idle_minutes')?.value);

  return (
    <>
      <SettingsHead active="/settings" role={role} />
      <v2.Note tone="gold" title="These change the app for everyone, straight away.">
        The database reads them every time money moves, so a change is live the moment you confirm it.
      </v2.Note>
      <v2.Grid cols="main" className="wp8a-mt">
        <v2.Card title="Money and timing" sub="The numbers the whole app runs on. Every change asks you to confirm and says what it affects.">
          {known.map((k) => {
            const info = MONEY_SETTINGS[k]!;
            const r = byKey.get(k)!;
            const now = showSetting(info.kind, r.value);
            return (
              <div key={k} className="wp8a-swrow">
                <div className="tx">
                  <b>{info.label}</b>
                  <div className="d">{info.help}</div>
                  <div className="v2-muted wp8a-small">Last changed {istDateTime(r.updated_at)}</div>
                </div>
                <div className="val">{now}</div>
                {info.editable ? (
                  <Confirm
                    action={update}
                    hidden={{ key: k }}
                    label="Change"
                    small
                    tone="plain"
                    tier={3}
                    area="admin"
                    word="CHANGE"
                    title={`Change: ${info.label}`}
                    body={
                      <>
                        <p>{info.help}</p>
                        <p>
                          <b>This changes the app for everyone, straight away.</b> {info.note ?? 'Applies from now on.'}
                        </p>
                      </>
                    }
                    fields={
                      <>
                        <label htmlFor={`nv-${k}`}>
                          New value{UNIT[info.kind]} (now {now})
                        </label>
                        <input id={`nv-${k}`} name="value" required defaultValue={inputForSetting(info.kind, r.value)} inputMode={info.kind === 'budgets' || info.kind === 'lengths' ? 'text' : 'decimal'} />
                      </>
                    }
                    confirmLabel="Save change"
                  />
                ) : (
                  <span className="v2-muted wp8a-small wp8a-ro">Read-only here: changed by the developer when nothing is clearing.</span>
                )}
              </div>
            );
          })}
          <div className="wp8a-swrow">
            <div className="tx">
              <b>Developer sign-in</b> <v2.Pill tone={devOn ? 'danger' : 'ok'}>{devOn ? 'On' : 'Off'}</v2.Pill>
              <div className="d">
                Shown here so you see it. Change it on <Link href="/settings/switches">App switches</Link>.
              </div>
            </div>
          </div>
        </v2.Card>
        <v2.Card title="Advanced (ads pricing and others)">
          <p className="v2-muted wp8a-small wp8a-m0">
            Read-only. Plain names instead of raw keys <v2.NewTag />; the key is shown small for the developer.
          </p>
          {other.map((r) => {
            const n = advancedName(r.key);
            return (
              <div key={r.key}>
                <div className="wp8a-adv">
                  <span>
                    {n.label} {n.tag === 'old' ? <v2.OldTag /> : n.tag === 'off' ? <v2.OffTag /> : null}
                    <br />
                    <span className="v2-mono v2-muted wp8a-key">{r.key}</span>
                  </span>
                  <b className="wp8a-small">{readableSetting(r.value, istDateTime)}</b>
                </div>
                {r.key === 'admin_session_idle_minutes' && Number.isFinite(idleSetting) && idleSetting !== serverIdle ? (
                  <v2.Note tone="orange" title="Two different idle times">
                    The server signs staff out after <b>{serverIdle} minutes</b> (its own setting), not {idleSetting}. Owner decision: 30 minutes.
                  </v2.Note>
                ) : null}
              </div>
            );
          })}
        </v2.Card>
      </v2.Grid>
    </>
  );
}
