import assert from 'node:assert/strict';
import { test } from 'node:test';
import { minVersionFor, summarizeDeviceVersions } from './devices-calc.ts';
import { highestVersion, isVersionBelow } from './version.ts';

test('isVersionBelow compares numbers, not text', () => {
  assert.equal(isVersionBelow('1.2.9', '1.10.0'), true);
  assert.equal(isVersionBelow('1.10.0', '1.2.9'), false);
  assert.equal(isVersionBelow('2', '2.0.0'), false);
  assert.equal(isVersionBelow('2.0', '2.0.1'), true);
  assert.equal(isVersionBelow('1.0.0', '1.0.0'), false);
});

test('isVersionBelow ignores build and pre-release suffixes and a leading v', () => {
  assert.equal(isVersionBelow('v1.0.0+12', '1.0.1'), true);
  assert.equal(isVersionBelow('1.2.0-beta', '1.2.0'), false);
});

test('isVersionBelow is false when either side is missing or unreadable', () => {
  assert.equal(isVersionBelow(null, '1.0.0'), false);
  assert.equal(isVersionBelow('1.0.0', null), false);
  assert.equal(isVersionBelow('', '1.0.0'), false);
  assert.equal(isVersionBelow('abc', '1.0.0'), false);
  assert.equal(isVersionBelow('1.0.0', 'latest'), false);
});

test('highestVersion picks the highest readable version', () => {
  assert.equal(highestVersion(['1.2.0', '1.10.0', null, 'junk', '1.9.9']), '1.10.0');
  assert.equal(highestVersion([null, '']), null);
  assert.equal(minVersionFor('1.2.0', '1.10.0'), '1.10.0');
  assert.equal(minVersionFor(null, undefined), null);
});

test('summarizeDeviceVersions totals by platform, flags outdated and finds the share on the latest version', () => {
  const s = summarizeDeviceVersions(
    [
      { platform: 'android', appVersion: '1.0.0', devices: 3, people: 3, lastSeen: '2026-10-10T00:00:00Z' },
      { platform: 'android', appVersion: '1.2.0', devices: 7, people: 6, lastSeen: '2026-10-16T00:00:00Z' },
      { platform: 'android', appVersion: null, devices: 2, people: 2, lastSeen: '2026-10-12T00:00:00Z' },
      { platform: 'web', appVersion: '1.0.0', devices: 1, people: 1, lastSeen: '2026-10-15T00:00:00Z' },
    ],
    { android: '1.1.0' },
  );
  assert.equal(s.devices, 13);
  const a = s.platforms.find((p) => p.platform === 'android')!;
  assert.equal(a.devices, 12);
  assert.equal(a.people, 11);
  assert.equal(a.lastSeen, '2026-10-16T00:00:00Z');
  assert.equal(a.latest, '1.2.0');
  assert.equal(a.outdated, 3);
  assert.equal(a.shareOnLatest, 0.7);
  assert.equal(s.versions.find((v) => v.platform === 'android' && v.appVersion === '1.0.0')!.outdated, true);
  assert.equal(s.versions.find((v) => v.platform === 'android' && v.appVersion === '1.2.0')!.isLatest, true);
  assert.equal(s.versions.find((v) => v.platform === 'android' && v.appVersion === null)!.outdated, false);
  assert.equal(s.platforms.find((p) => p.platform === 'web')!.outdated, 0);
  assert.equal(s.platforms[0]!.platform, 'android');
});

test('summarizeDeviceVersions copes with no rows and with no reported versions', () => {
  assert.deepEqual(summarizeDeviceVersions([], {}), { platforms: [], versions: [], devices: 0 });
  const s = summarizeDeviceVersions([{ platform: 'ios', appVersion: null, devices: 2, people: 2, lastSeen: null }], {});
  assert.equal(s.platforms[0]!.shareOnLatest, null);
  assert.equal(s.platforms[0]!.lastSeen, null);
});
