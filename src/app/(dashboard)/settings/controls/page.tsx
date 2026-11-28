import { ControlsView } from '@/components/views/ControlsView';
import { ControlsV2 } from '@/components/v2/settings/ControlsV2';
import { getAppControls, getDeviceRows } from '@/lib/controls';
import { asPlatform } from '@/lib/controls-meta';
import { requireSeeing } from '@/lib/data';
import { getLaunchAreas, getSettingValues, getSwitchHistory } from '@/lib/data/settings';
import { getV2 } from '@/lib/v2-gate-server';

export const metadata = { title: 'App controls' };

export default async function ControlsPage({ searchParams }: { searchParams: Promise<{ place?: string }> }) {
  const me = await requireSeeing('settings');
  const [controls, devices, v2] = await Promise.all([getAppControls(), getDeviceRows(), getV2()]);
  const now = new Date().toISOString();
  if (v2) {
    const [{ place }, areas, s, history] = await Promise.all([searchParams, getLaunchAreas(), getSettingValues(['walkthrough_video_url']), getSwitchHistory()]);
    const url = s.walkthrough_video_url?.value;
    return (
      <ControlsV2
        role={me.staffRole}
        controls={controls}
        devices={devices}
        place={asPlatform(place) ?? 'all'}
        areas={areas}
        walkthroughUrl={typeof url === 'string' ? url : ''}
        history={history}
        now={now}
      />
    );
  }
  return <ControlsView controls={controls} devices={devices} now={now} />;
}
