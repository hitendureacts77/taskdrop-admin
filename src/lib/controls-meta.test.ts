import assert from 'node:assert/strict';
import { test } from 'node:test';
import { areaFor, asPlatform, needsMfa, summarizeDevices, versionLt } from './controls-meta.ts';

test('versionLt compares numbers, not text', () => {
  assert.equal(versionLt('1.2.3', '1.10.0'), true);
  assert.equal(versionLt('1.10.0', '1.2.3'), false);
  assert.equal(versionLt('2', '2.0.0'), false);
  assert.equal(versionLt('2.0', '2.0.1'), true);
});

test('asPlatform accepts only the four platforms', () => {
  assert.equal(asPlatform('ios'), 'ios');
  assert.equal(asPlatform('windows'), null);
  assert.equal(asPlatform(undefined), null);
});

test('money switches alone are a money change; anything else is an admin change', () => {
  assert.equal(areaFor(['topups', 'withdrawals']), 'money');
  assert.equal(areaFor(['topups', 'posting']), 'admin');
  assert.equal(areaFor(['banner_text']), 'admin');
  assert.equal(areaFor([]), 'admin');
});

test('only money switches need the authenticator code', () => {
  assert.equal(needsMfa(['withdrawals']), true);
  assert.equal(needsMfa(['posting', 'maintenance']), false);
});

test('summarizeDevices counts by platform and version and flags outdated installs', () => {
  const now = new Date('2026-10-17T00:00:00Z');
  const s = summarizeDevices(
    [
      { platform: 'android', appVersion: '1.0.0', lastSeenAt: '2026-10-16T00:00:00Z' },
      { platform: 'android', appVersion: '1.2.0', lastSeenAt: '2026-10-01T00:00:00Z' },
      { platform: 'android', appVersion: null, lastSeenAt: '2026-10-16T00:00:00Z' },
      { platform: 'web', appVersion: '1.0.0', lastSeenAt: '2026-10-16T00:00:00Z' },
    ],
    now,
    { android: '1.1.0' },
  );
  assert.equal(s.total, 4);
  assert.equal(s.activeWeek, 3);
  const android = s.byPlatform.find((p) => p.platform === 'android')!;
  assert.equal(android.devices, 3);
  assert.equal(android.outdated, 1);
  assert.equal(s.versions.find((v) => v.platform === 'android' && v.version === '1.0.0')!.outdated, true);
  assert.equal(s.versions.find((v) => v.platform === 'web')!.outdated, false);
});
