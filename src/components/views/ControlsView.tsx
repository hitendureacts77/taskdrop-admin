import { ConfirmAction } from '../ConfirmAction';
import { ControlTextForm } from '../ControlsForms';
import type { ControlsRead, DevicesRead } from '@/lib/controls';
import { setControlSwitch } from '@/lib/controls-actions';
import { effectiveRequirePhone, FEATURE_SWITCHES, PLATFORMS, REQUIRE_PHONE, summarizeDevices, type AppControlRow } from '@/lib/controls-meta';
import { istDate, timeAgo } from '@/lib/format';
import { Card, Empty, Notice, Pill } from '../ui';
import { ConfigHeader } from './AdminConfigViews';
import { ReadError, SetupNotice } from './SetupNotice';

const text = (r: AppControlRow | null, k: string) => (typeof r?.[k] === 'string' ? (r[k] as string) : '');
const flag = (r: AppControlRow | null, k: string) => (r ? r[k] !== false : true);

const PLATFORM_NAME: Record<string, string> = { web: 'Web', android: 'Android', ios: 'iPhone / iPad', windows: 'Windows', macos: 'Mac' };

export function ControlsView({ controls, devices, now: nowIso }: { controls: ControlsRead; devices: DevicesRead; now: string }) {
  const now = new Date(nowIso);
  const min: Record<string, string | null> = {};
  for (const p of ['web', 'android', 'ios'] as const) {
    const a = text(controls.rows.all, 'min_version');
    const b = text(controls.rows[p], 'min_version');
    min[p] = b || a || null;
  }
  const dev = summarizeDevices(devices.rows, now, min);

  return (
    <>
      <ConfigHeader active="controls" />
      {controls.setup ? (
        <SetupNotice what="Per-platform controls" migration="092_app_controls" />
      ) : controls.error ? (
        <ReadError message={controls.error} />
      ) : (
        <div className="stack">
          <Notice tone="blue" title="How these work">
            Each column is one place the app runs. <strong>Everywhere</strong> applies to all of them; a column for one platform can only add restrictions on top. Apps check this about once a minute and when they open. Turning something off hides it in the app and the server refuses it too.
          </Notice>

          <Card title="Switches" sub="Click a switch, say why, and confirm. Withdrawals and top-ups also need your authenticator code." flush>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th className="th">What</th>
                    {PLATFORMS.map((p) => (
                      <th key={p.key} className="th">
                        {p.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="td">
                      <strong>Maintenance mode</strong>
                      <span className="muted small block">On: people see the maintenance message instead of the app.</span>
                    </td>
                    {PLATFORMS.map((p) => {
                      const row = controls.rows[p.key];
                      const on = row?.maintenance === true;
                      return (
                        <td key={p.key} className="td">
                          <ConfirmAction
                            action={setControlSwitch}
                            hidden={{ platform: p.key, key: 'maintenance', value: String(!on) }}
                            trigger={`${on ? 'Turn off' : 'Turn on'} maintenance for ${p.label}`}
                            asSwitch={{ on }}
                            tone={on ? 'primary' : 'danger'}
                            title={on ? `End maintenance on ${p.label}?` : `Put ${p.label} into maintenance?`}
                            consequence={on ? 'The app opens normally again.' : `People on ${p.label} see the maintenance message and cannot use the app until you end it. Money already in progress is not touched.`}
                            field={{ name: 'reason', label: 'Why' }}
                            confirmLabel={on ? 'End maintenance' : 'Start maintenance'}
                          />
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="td">
                      <strong>{REQUIRE_PHONE.label}</strong>
                      <span className="muted small block">{REQUIRE_PHONE.help}</span>
                    </td>
                    {PLATFORMS.map((p) => {
                      const on = controls.rows[p.key]?.[REQUIRE_PHONE.key] === true;
                      const eff = effectiveRequirePhone(controls.rows, p.key);
                      return (
                        <td key={p.key} className="td">
                          <ConfirmAction
                            action={setControlSwitch}
                            hidden={{ platform: p.key, key: REQUIRE_PHONE.key, value: String(!on) }}
                            trigger={`${on ? 'Stop requiring' : 'Require'} a verified phone for ${p.label}`}
                            asSwitch={{ on }}
                            tone={on ? 'primary' : 'danger'}
                            title={on ? `Stop requiring a verified phone on ${p.label}?` : `Require a verified phone on ${p.label}?`}
                            consequence={
                              on
                                ? 'Anyone can post, offer and withdraw again, with or without a confirmed phone number.'
                                : `People on ${p.label} with no confirmed phone number can no longer post, send offers or withdraw until they confirm one. Google-only accounts are locked out of these until they add a phone. Money already in progress is not touched.`
                            }
                            field={{ name: 'reason', label: 'Why' }}
                            confirmLabel={on ? 'Stop requiring' : 'Require phone'}
                          />
                          {eff.viaAll && !on ? <span className="muted small block">On via Everywhere</span> : null}
                        </td>
                      );
                    })}
                  </tr>
                  {FEATURE_SWITCHES.map((s) => (
                    <tr key={s.key}>
                      <td className="td">
                        <strong>{s.label}</strong> {s.money ? <Pill tone="gold">Money</Pill> : null}
                        <span className="muted small block">{s.help}</span>
                      </td>
                      {PLATFORMS.map((p) => {
                        const on = flag(controls.rows[p.key], s.key);
                        return (
                          <td key={p.key} className="td">
                            <ConfirmAction
                              action={setControlSwitch}
                              hidden={{ platform: p.key, key: s.key, value: String(!on) }}
                              trigger={`${on ? 'Turn off' : 'Turn on'} ${s.label} for ${p.label}`}
                              asSwitch={{ on }}
                              tone={on ? 'danger' : 'primary'}
                              title={`${on ? 'Turn off' : 'Turn on'} “${s.label}” for ${p.label}?`}
                              consequence={on ? s.help : `${s.label} works again for ${p.label}.`}
                              field={{ name: 'reason', label: 'Why' }}
                              confirmLabel={on ? 'Turn off' : 'Turn on'}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Wording, versions and banner" sub="Set per place. Leave a box empty and save to clear it.">
            <div className="stack">
              {PLATFORMS.map((p) => {
                const r = controls.rows[p.key];
                return (
                  <ControlTextForm
                    key={p.key}
                    platform={p.key}
                    label={p.label}
                    values={{
                      maintenance_message: text(r, 'maintenance_message'),
                      min_version: text(r, 'min_version'),
                      update_url: text(r, 'update_url'),
                      banner_text: text(r, 'banner_text'),
                      banner_level: text(r, 'banner_level') || 'info',
                      banner_link: text(r, 'banner_link'),
                      banner_ends_at: text(r, 'banner_ends_at').slice(0, 10),
                    }}
                  />
                );
              })}
            </div>
          </Card>
        </div>
      )}

      <Card title="Devices" sub="Installs the apps have reported: where people are and which version they run.">
        {devices.setup ? (
          <SetupNotice what="The devices list" migration="092_app_controls" />
        ) : devices.error ? (
          <ReadError message={devices.error} />
        ) : dev.total === 0 ? (
          <Empty title="No device has reported in yet">Apps send their platform and version when someone signs in. They appear here once the new app build is in use.</Empty>
        ) : (
          <>
            <div className="figures">
              {dev.byPlatform.map((p) => (
                <div key={p.platform} className="figure">
                  <span className="figure-label">{PLATFORM_NAME[p.platform] ?? p.platform}</span>
                  <span className="figure-num">{p.devices.toLocaleString('en-IN')}</span>
                  <span className="muted small">
                    {p.activeWeek} active this week{p.outdated ? ` · ${p.outdated} need an update` : ''}
                  </span>
                </div>
              ))}
            </div>
            <h3 className="sub-head">By app version</h3>
            <ul className="plain-list">
              {dev.versions.map((v) => (
                <li key={`${v.platform}-${v.version}`}>
                  <span>
                    {PLATFORM_NAME[v.platform] ?? v.platform} · {v.version === 'unknown' ? 'version not reported' : v.version}
                    {v.outdated ? <Pill tone="red">Below the minimum</Pill> : null}
                  </span>
                  <span>{v.devices.toLocaleString('en-IN')}</span>
                </li>
              ))}
            </ul>
            <p className="muted small">
              {dev.activeWeek} of {dev.total} installs were seen in the last 7 days. Latest report {devices.rows[0] ? timeAgo(devices.rows[0].lastSeenAt, now) : '—'} ({devices.rows[0] ? istDate(devices.rows[0].lastSeenAt) : '—'}).
            </p>
          </>
        )}
      </Card>
    </>
  );
}
