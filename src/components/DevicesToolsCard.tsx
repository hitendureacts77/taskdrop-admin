import Link from 'next/link';
import { summarizeDeviceVersions } from '@/lib/devices-calc';
import { pct } from '@/lib/format';
import { getDevicesSummary } from '@/lib/ops';
import { toolLinks } from '@/lib/ops-calc';
import { Icon } from './Icon';
import { Card } from './ui';

const PLATFORM_NAME: Record<string, string> = { web: 'Web', android: 'Android', ios: 'iPhone / iPad', windows: 'Windows', macos: 'Mac' };

/** Installs by platform and version, and links out to the dashboards of the services the app runs on. */
export async function DevicesToolsCard() {
  const devices = await getDevicesSummary().catch(() => null);
  const s = devices && !devices.setup && !devices.refused && !devices.error ? summarizeDeviceVersions(devices.data, {}) : null;
  const links = toolLinks(process.env);
  return (
    <Card title="Devices and tools" right={<Link href="/devices">All devices →</Link>}>
      {s && s.devices > 0 ? (
        <ul className="plain-list">
          {s.platforms.map((p) => (
            <li key={p.platform}>
              <span>
                {PLATFORM_NAME[p.platform] ?? p.platform}
                <span className="muted small block">
                  {p.latest ? `${p.shareOnLatest === null ? '—' : pct(p.shareOnLatest)} on the latest version (${p.latest})` : 'No version reported'}
                </span>
              </span>
              <span>{p.devices.toLocaleString('en-IN')} installs</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small">{devices?.refused ? 'Not visible to your staff role.' : 'No device has reported in yet.'}</p>
      )}
      <ul className="plain-list">
        {links.map((l) => (
          <li key={l.envName}>
            <span>{l.label}</span>
            {l.url ? (
              <a href={l.url} target="_blank" rel="noopener noreferrer">
                Open <Icon name="external" size={14} />
              </a>
            ) : (
              <span className="muted small">Add {l.envName} to link it</span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
