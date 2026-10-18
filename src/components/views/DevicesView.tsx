import Link from 'next/link';
import { summarizeDeviceVersions, type DeviceVersionRow } from '@/lib/devices-calc';
import { istDateTime, pct, timeAgo } from '@/lib/format';
import type { OpsRead } from '@/lib/ops';
import { Card, Empty, PageHeader, Pill } from '../ui';
import { ReadError, SetupNotice } from './SetupNotice';

const PLATFORM_NAME: Record<string, string> = { web: 'Web', android: 'Android', ios: 'iPhone / iPad', windows: 'Windows', macos: 'Mac' };
const name = (p: string) => PLATFORM_NAME[p] ?? p;

export function DevicesView({ devices, minByPlatform, now: nowIso }: { devices: OpsRead<DeviceVersionRow[]>; minByPlatform: Record<string, string | null>; now: string }) {
  const now = new Date(nowIso);
  const s = summarizeDeviceVersions(devices.data, minByPlatform);
  const seen = (iso: string | null) => (iso ? `${timeAgo(iso, now)} · ${istDateTime(iso)}` : '—');

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Devices' }]}
        title="Devices"
        sub="Installs the apps have reported: where people are, which app version they run and who is behind the minimum version."
      />
      {devices.setup ? (
        <SetupNotice what="The devices list" migration="092_app_controls" />
      ) : devices.refused ? (
        <Empty title="This list isn’t available to your staff role" icon="shield">
          Ask a full admin if you need it.
        </Empty>
      ) : devices.error ? (
        <ReadError message={devices.error} />
      ) : s.devices === 0 ? (
        <Card>
          <Empty title="No device has reported in yet" icon="device">
            Apps send their platform and version when someone signs in. They appear here once the new app build is in use.
          </Empty>
        </Card>
      ) : (
        <div className="stack">
          <Card title="By platform" sub={`${s.devices.toLocaleString('en-IN')} installs in total.`}>
            <div className="figures">
              {s.platforms.map((p) => (
                <div key={p.platform} className="figure">
                  <span className="figure-label">{name(p.platform)}</span>
                  <span className="figure-num">{p.devices.toLocaleString('en-IN')}</span>
                  <span className="muted small">
                    {p.people.toLocaleString('en-IN')} {p.people === 1 ? 'person' : 'people'} · last seen {seen(p.lastSeen)}
                  </span>
                  <span className="muted small">
                    {p.latest ? (
                      <>
                        {p.shareOnLatest === null ? '—' : pct(p.shareOnLatest)} on the latest version ({p.latest})
                      </>
                    ) : (
                      'No version reported'
                    )}
                  </span>
                  {p.outdated ? (
                    <span>
                      <Pill tone="red">{p.outdated.toLocaleString('en-IN')} below the minimum</Pill>
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
            <p className="muted small">A person using two app versions is counted once for each. The minimum version is set under Web, Android &amp; iOS in settings.</p>
          </Card>

          <Card title="By app version" sub="Each platform and version, newest first." flush right={<Link href="/settings/controls">Set the minimum version →</Link>}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th className="th">Platform</th>
                    <th className="th">Version</th>
                    <th className="th num">Devices</th>
                    <th className="th num">People</th>
                    <th className="th">Last seen</th>
                    <th className="th">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {s.versions.map((v) => (
                    <tr key={`${v.platform}-${v.appVersion ?? 'none'}`}>
                      <td className="td">{name(v.platform)}</td>
                      <td className="td nowrap">{v.appVersion ?? 'Not reported'}</td>
                      <td className="td num">{v.devices.toLocaleString('en-IN')}</td>
                      <td className="td num">{v.people.toLocaleString('en-IN')}</td>
                      <td className="td nowrap">{seen(v.lastSeen)}</td>
                      <td className="td">
                        {v.outdated ? <Pill tone="red">Outdated</Pill> : v.isLatest ? <Pill tone="green">Latest</Pill> : <span className="muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
