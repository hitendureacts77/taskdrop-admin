import Link from 'next/link';
import * as v2 from '@/components/v2/ui';
import { Confirm } from '@/components/v2/Confirm';
import type { ControlsRead, DevicesRead } from '@/lib/controls';
import { setControlSwitch } from '@/lib/controls-actions';
import { FEATURE_SWITCHES, PLATFORMS, REQUIRE_PHONE, summarizeDevices, type AppControlRow, type PlatformKey } from '@/lib/controls-meta';
import type { HistoryRow } from '@/lib/controls-history';
import type { LaunchAreasRead } from '@/lib/data/settings';
import { istDateTime, timeAgo } from '@/lib/format';
import type { StaffRole } from '@/lib/staff-roles';
import { v2DeleteLaunchArea, v2SaveLaunchArea, v2SetLaunchAreas, v2SetWalkthroughUrl } from '@/lib/v2/settings-actions';
import { ControlTextV2 } from './ControlTextV2';
import { LAUNCH_PRESETS } from './launch-presets';
import { SettingsHead } from './SettingsHead';
import { SwitchHistory } from './SwitchHistory';

type CtlRow = { key: string; label: string; kind: 'restrict' | 'feature'; money?: boolean; old?: boolean };

/** The switch rows in the design's order (CTL_ROWS). Maintenance and the phone rule are restrictions: on is the strict state. */
const ROWS: CtlRow[] = [
  { key: 'maintenance', label: 'Maintenance mode', kind: 'restrict' },
  { key: REQUIRE_PHONE.key, label: REQUIRE_PHONE.label, kind: 'restrict' },
  ...FEATURE_SWITCHES.map((s) => ({ key: s.key, label: s.label, kind: 'feature' as const, money: s.money, old: s.key === 'topups' })),
];

const text = (r: AppControlRow | null, k: string) => (typeof r?.[k] === 'string' ? (r[k] as string) : '');
/** Restrictions default off; features default on (as get_app_controls merges them). */
const valueOf = (r: AppControlRow | null, row: CtlRow) => (row.kind === 'restrict' ? r?.[row.key] === true : r ? r[row.key] !== false : true);
const PLATFORM_NAME: Record<string, string> = { web: 'Web', android: 'Android', ios: 'iPhone / iPad' };

function Cell({ controls, row, place }: { controls: ControlsRead; row: CtlRow; place: (typeof PLATFORMS)[number] }) {
  const everywhere = valueOf(controls.rows.all, row);
  const v = valueOf(controls.rows[place.key], row);
  if (place.key !== 'all' && row.kind === 'restrict' && everywhere) {
    return (
      <span className="wp8a-cellsw">
        <button type="button" className="v2-tg red" role="switch" aria-checked="true" disabled aria-label={`${row.label} ${place.label}`} />
        On via Everywhere
      </span>
    );
  }
  if (place.key !== 'all' && row.kind === 'feature' && !everywhere) {
    return (
      <span className="wp8a-cellsw">
        <button type="button" className="v2-tg" role="switch" aria-checked="false" disabled aria-label={`${row.label} ${place.label}`} />
        Off via Everywhere
      </span>
    );
  }
  const big = place.key === 'all' && (row.kind === 'restrict' || row.money);
  const strictens = (row.kind === 'restrict') !== v; // turning a restriction on, or a feature off
  return (
    <span className="wp8a-cellsw">
      <Confirm
        action={setControlSwitch}
        hidden={{ platform: place.key, key: row.key, value: String(!v) }}
        label={`${v ? 'Turn off' : 'Turn on'}: ${row.label} · ${place.label}`}
        asSwitch={{ on: v, red: row.kind === 'restrict' }}
        tier={big ? 3 : 2}
        area={row.money ? 'money' : 'admin'}
        word={v ? 'OFF' : 'ON'}
        tone={strictens ? 'danger' : 'pri'}
        title={`${v ? 'Turn off' : 'Turn on'}: ${row.label} · ${place.label}`}
        body={
          <p>
            <b>What happens:</b> {row.kind === 'restrict' ? (v ? 'This restriction is lifted' : 'This restriction starts') : v ? 'People can no longer use this' : 'People can use this again'} on <b>{place.label}</b>. Apps re-check about once a minute.
          </p>
        }
        reason={{ label: 'Why? (kept in the switch history)' }}
        confirmLabel={v ? 'Turn off' : 'Turn on'}
      />
      {v ? 'On' : 'Off'}
    </span>
  );
}

/** v2 Web, Android & iOS (design setControls, F397–F417 + launch areas + walkthrough link). */
export function ControlsV2({
  role,
  controls,
  devices,
  place,
  areas,
  walkthroughUrl,
  history,
  now: nowIso,
}: {
  role: StaffRole;
  controls: ControlsRead;
  devices: DevicesRead;
  place: PlatformKey;
  areas: LaunchAreasRead;
  walkthroughUrl: string;
  history: { rows: HistoryRow[]; error: string | null };
  now: string;
}) {
  const now = new Date(nowIso);
  const min: Record<string, string | null> = {};
  for (const p of ['web', 'android', 'ios'] as const) min[p] = text(controls.rows[p], 'min_version') || text(controls.rows.all, 'min_version') || null;
  const dev = summarizeDevices(devices.rows, now, min);
  const cur = PLATFORMS.find((p) => p.key === place)!;
  const r = controls.rows[place];
  const activeAreas = areas.areas.filter((a) => a.active);

  return (
    <>
      <SettingsHead active="/settings/controls" role={role} />
      {controls.setup ? (
        <v2.SetupNotice what="Per-platform switches" detail="app_controls" />
      ) : controls.error ? (
        <v2.ErrorState detail={controls.error} retryHref="/settings/controls" />
      ) : (
        <>
          <v2.Note tone="blue" title="How these work">
            <b>Everywhere</b> applies to web, Android and iPhone at once. <b>One place</b> can only add a restriction, never undo one set Everywhere. The apps re-check about once a minute, and the server refuses a switched-off action too.
          </v2.Note>
          <v2.Card title="Switches" sub="Click a switch, say why, and confirm. The biggest ones (Everywhere restrictions and money) ask you to type a word.">
            <div className="v2-tblwrap wp8a-matrix">
              <table className="v2-tbl">
                <thead>
                  <tr>
                    <th scope="col">What</th>
                    {PLATFORMS.map((p) => (
                      <th key={p.key} scope="col">
                        {p.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row) => (
                    <tr key={row.key}>
                      <td data-l="What">
                        <b>{row.label}</b> {row.money ? <v2.Pill tone="wait">Money</v2.Pill> : null} {row.old ? <v2.OldTag /> : null}
                      </td>
                      {PLATFORMS.map((p) => (
                        <td key={p.key} data-l={p.label}>
                          <Cell controls={controls} row={row} place={p} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </v2.Card>
        </>
      )}

      <v2.Grid cols="main" className="wp8a-mt">
        <v2.Card title="Wording, versions and banner" sub="Set per place. Leave a box empty and save to clear it.">
          <v2.Chips label="Place" items={PLATFORMS.map((p) => ({ href: `/settings/controls?place=${p.key}`, label: p.label, active: p.key === place }))} />
          {controls.setup || controls.error ? null : (
            <ControlTextV2
              key={place}
              platform={place}
              label={cur.label}
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
          )}
        </v2.Card>

        <div className="wp8a-stack">
          <v2.Card
            title={
              <>
                Launch areas <v2.NewTag />
              </>
            }
            sub="Where people can post jobs. Others can look around but see a “coming soon” message when they try to post."
          >
            {areas.setup ? (
              <v2.SetupNotice what="Launch areas" detail="launch_areas" />
            ) : areas.error ? (
              <v2.ErrorState detail={areas.error} retryHref="/settings/controls" />
            ) : (
              <>
                <div className="wp8a-swrow">
                  <div className="tx">
                    <b>Limit posting to these areas</b>
                    <div className="d">{areas.on && activeAreas.length ? `On: posting only inside ${activeAreas.length} area${activeAreas.length === 1 ? '' : 's'}.` : 'Off: people can post anywhere.'}</div>
                  </div>
                  <Confirm
                    action={v2SetLaunchAreas}
                    hidden={{ on: String(!areas.on) }}
                    label={areas.on ? 'Turn off launch areas' : 'Turn on launch areas'}
                    asSwitch={{ on: areas.on }}
                    tier={2}
                    area="admin"
                    tone={areas.on ? 'pri' : 'warn'}
                    title={areas.on ? 'Let people post anywhere?' : 'Limit posting to the launch areas?'}
                    body={<p>{areas.on ? 'Posting opens everywhere again.' : 'People outside these areas can browse but not post. Remote jobs (no place) are not affected.'}</p>}
                    fields={
                      <>
                        <label htmlFor="la-msg">Message for other places</label>
                        <input id="la-msg" name="message" maxLength={300} defaultValue={areas.message} />
                      </>
                    }
                    reason={{ label: 'Why? (kept in the switch history)' }}
                    confirmLabel={areas.on ? 'Turn off' : 'Turn on'}
                  />
                </div>
                {areas.areas.length ? (
                  <ul className="wp8a-areas">
                    {areas.areas.map((a) => (
                      <li key={a.id}>
                        <span>
                          <b>{a.name}</b> <span className="v2-muted wp8a-small">{a.radiusKm} km around the centre</span> {a.active ? null : <v2.Pill tone="mut">Off</v2.Pill>}
                        </span>
                        <Confirm
                          action={v2DeleteLaunchArea}
                          hidden={{ id: a.id }}
                          label="Remove"
                          small
                          tone="plain"
                          tier={2}
                          area="admin"
                          title={`Remove ${a.name}?`}
                          body={<p>{areas.on && activeAreas.length === 1 && a.active ? 'This is the last area: posting opens everywhere until you add one.' : 'People there can no longer post while launch areas are on.'}</p>}
                          reason={{ label: 'Why?', optional: true }}
                          confirmLabel="Remove area"
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="v2-muted wp8a-small">No areas yet. Add one below.</p>
                )}
                <p className="v2-muted wp8a-small">Message for other places: “{areas.message || 'not set'}”</p>
                <Confirm
                  action={v2SaveLaunchArea}
                  label="Add an area"
                  tier={2}
                  area="admin"
                  title="Add a launch area"
                  body={<p>Pick a city, or type a name with the latitude and longitude of its centre.</p>}
                  fields={
                    <>
                      <label htmlFor="la-preset">City</label>
                      <select id="la-preset" name="preset" defaultValue="">
                        <option value="">Type my own below</option>
                        {LAUNCH_PRESETS.map((p) => (
                          <option key={p.key} value={p.key}>
                            {p.name} ({p.radiusKm} km)
                          </option>
                        ))}
                      </select>
                      <label htmlFor="la-name">Name (optional with a city)</label>
                      <input id="la-name" name="name" maxLength={60} placeholder="e.g. Warangal" />
                      <label htmlFor="la-lat">Latitude and longitude (optional with a city)</label>
                      <div className="wp8a-g2">
                        <input id="la-lat" name="lat" inputMode="decimal" placeholder="17.97" aria-label="Latitude" />
                        <input name="lng" inputMode="decimal" placeholder="79.59" aria-label="Longitude" />
                      </div>
                      <label htmlFor="la-r">Radius in km (optional with a city)</label>
                      <input id="la-r" name="radius" inputMode="decimal" placeholder="25" />
                    </>
                  }
                  reason={{ label: 'Why?', optional: true }}
                  confirmLabel="Add area"
                />
              </>
            )}
          </v2.Card>

          <v2.Card
            title={
              <>
                Walkthrough video <v2.NewTag />
              </>
            }
            sub="The YouTube link the “How TaskDrop works” page plays, everywhere."
          >
            <p className="wp8a-small">{walkthroughUrl ? <span className="v2-mono">{walkthroughUrl}</span> : <span className="v2-muted">No link yet: the page shows no video button.</span>}</p>
            <Confirm
              action={v2SetWalkthroughUrl}
              label={walkthroughUrl ? 'Change link' : 'Add link'}
              small
              tier={2}
              area="admin"
              title="Walkthrough video link"
              body={<p>Only YouTube links work (youtube.com/watch, youtube.com/shorts or youtu.be). Leave it empty to remove the video.</p>}
              fields={
                <>
                  <label htmlFor="wt-url">YouTube link</label>
                  <input id="wt-url" name="url" maxLength={300} defaultValue={walkthroughUrl} placeholder="https://youtube.com/watch?v=…" />
                </>
              }
              reason={{ label: 'Why?', optional: true }}
              confirmLabel="Save link"
            />
          </v2.Card>

          <v2.Card title="Devices">
            {devices.setup ? (
              <v2.SetupNotice what="The devices list" detail="app_devices" />
            ) : devices.error ? (
              <v2.ErrorState detail={devices.error} />
            ) : dev.total === 0 ? (
              <v2.Empty title="No device has reported in yet" />
            ) : (
              <>
                {dev.byPlatform.map((p) => (
                  <div key={p.platform} className="wp8a-adv">
                    <b>{PLATFORM_NAME[p.platform] ?? p.platform}</b>
                    <span className="wp8a-small">
                      {p.devices.toLocaleString('en-IN')} installs · {p.activeWeek} active this week · {p.outdated ? <b className="wp8a-warn">{p.outdated} need an update</b> : 'none need an update'}
                    </span>
                  </div>
                ))}
                <div className="wp8a-small wp8a-mt">
                  <b>By version:</b>{' '}
                  {dev.versions.map((ver) => (
                    <span key={`${ver.platform}-${ver.version}`} className="wp8a-ver">
                      {PLATFORM_NAME[ver.platform] ?? ver.platform} {ver.version === 'unknown' ? 'not reported' : ver.version} ({ver.devices}) {ver.outdated ? <v2.Pill tone="bad">Below the minimum</v2.Pill> : null}
                    </span>
                  ))}
                </div>
                <p className="v2-muted wp8a-small">
                  Latest report {devices.rows[0] ? `${timeAgo(devices.rows[0].lastSeenAt, now)} (${istDateTime(devices.rows[0].lastSeenAt)})` : '—'}. <Link href="/devices">All devices →</Link>
                </p>
              </>
            )}
          </v2.Card>
        </div>
      </v2.Grid>
      <div className="wp8a-mt">
        <SwitchHistory rows={history.rows} error={history.error} />
      </div>
    </>
  );
}
