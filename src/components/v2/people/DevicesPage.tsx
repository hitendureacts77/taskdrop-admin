import Link from 'next/link';
import * as v2 from '@/components/v2/ui';
import { summarizeDeviceVersions, type DeviceVersionRow } from '@/lib/devices-calc';
import { istDateTime, pct, timeAgo } from '@/lib/format';
import type { OpsRead } from '@/lib/ops';

const PLATFORM_NAME: Record<string, string> = { web: 'Web', android: 'Android', ios: 'iPhone / iPad', windows: 'Windows', macos: 'Mac' };
const name = (p: string) => PLATFORM_NAME[p] ?? p;

/**
 * Admin v2 Devices (/devices). Same data as today's DevicesView (admin_devices_summary + the minimum versions),
 * read-only for every staff role. Counts are per install and version, so there are no rows for Hide test data to leave out.
 */
export function DevicesPage({ devices, minByPlatform, now: nowIso }: { devices: OpsRead<DeviceVersionRow[]>; minByPlatform: Record<string, string | null>; now: string }) {
  const now = new Date(nowIso);
  const s = summarizeDeviceVersions(devices.data, minByPlatform);
  const seen = (iso: string | null) => (iso ? timeAgo(iso, now) : '—');

  let body;
  if (devices.setup) body = <v2.SetupNotice what="The devices list" />;
  else if (devices.refused) body = <v2.Note tone="blue">Your role cannot see device details. Ask an Admin if you need them.</v2.Note>;
  else if (devices.error) body = <v2.ErrorState detail={devices.error} retryHref="/devices" />;
  else if (s.devices === 0)
    body = (
      <v2.Card>
        <v2.Empty title="No installs reported yet" icon="device">
          Apps report their platform and version the first time someone opens them and signs in.
        </v2.Empty>
      </v2.Card>
    );
  else
    body = (
      <>
        <v2.Card title={`By platform · ${s.devices.toLocaleString('en-IN')} installs in total`}>
          <v2.Grid cols={5} className="wp3-keep2">
            {s.platforms.map((p) => (
              <div key={p.platform} className="v2-tile sm">
                <div className="lbl">{name(p.platform)}</div>
                <div className="big">{p.devices.toLocaleString('en-IN')}</div>
                <div className="foot">
                  {p.people.toLocaleString('en-IN')} {p.people === 1 ? 'person' : 'people'} · last seen{' '}
                  <span title={p.lastSeen ? istDateTime(p.lastSeen) : undefined}>{seen(p.lastSeen)}</span>
                </div>
                {p.shareOnLatest !== null ? (
                  <>
                    <div className="wp3-meter" title={`${pct(p.shareOnLatest)} on the newest version`}>
                      <div style={{ width: `${Math.round(p.shareOnLatest * 100)}%` }} />
                    </div>
                    <div className="foot">
                      {pct(p.shareOnLatest)} on the newest version ({p.latest})
                    </div>
                  </>
                ) : (
                  <div className="foot">No version reported</div>
                )}
                {p.outdated ? (
                  <div className="wp3-mt-s">
                    <v2.Pill tone="bad">{p.outdated.toLocaleString('en-IN')} below the minimum</v2.Pill>
                  </div>
                ) : null}
              </div>
            ))}
          </v2.Grid>
          <p className="small v2-muted wp3-mt">
            A person using two app versions is counted once for each. The minimum version is set on <Link href="/settings/controls">Settings › Web, Android &amp; iOS</Link>.
          </p>
        </v2.Card>

        <div className="wp3-mt">
          <v2.Card
            title="By app version"
            sub="Red rows are below the minimum version: those people see “Please update” and cannot use the app."
            right={
              <Link className="v2-btn sm ghost" href="/settings/controls">
                Set the minimum version →
              </Link>
            }
          >
            <v2.DataTable
              columns={[{ label: 'Platform' }, { label: 'Version' }, { label: 'Devices', right: true }, { label: 'People', right: true }, { label: 'Last seen' }, { label: 'Status' }]}
              rows={s.versions.map((v) => ({
                key: `${v.platform}-${v.appVersion ?? 'none'}`,
                late: v.outdated,
                cells: [
                  name(v.platform),
                  v.appVersion ? <b key="v" className="v2-mono">{v.appVersion}</b> : <span key="v" className="v2-muted">Not reported</span>,
                  v.devices.toLocaleString('en-IN'),
                  v.people.toLocaleString('en-IN'),
                  <span key="l" className="small nowrap" title={v.lastSeen ? istDateTime(v.lastSeen) : undefined}>
                    {seen(v.lastSeen)}
                  </span>,
                  v.outdated ? <v2.Pill key="s" tone="bad">Outdated: below the minimum</v2.Pill> : v.isLatest ? <v2.Pill key="s" tone="ok">Latest</v2.Pill> : <span key="s" className="v2-muted">—</span>,
                ],
              }))}
              empty="No versions reported"
            />
          </v2.Card>
        </div>
      </>
    );

  return (
    <>
      <v2.PageHeader
        crumbs={[{ label: 'People', href: '/users' }, { label: 'Devices' }]}
        title="Devices"
        sub="Installs the apps have reported: where people are, which app version they run and who is behind the minimum version."
        right={
          <Link className="v2-btn sm" href="/settings/controls">
            Set the minimum version
          </Link>
        }
      />
      {body}
    </>
  );
}
