import assert from 'node:assert/strict';
import { test } from 'node:test';
import { areaFor, asPlatform, effectiveRequirePhone, needsMfa, summarizeDevices, versionLt } from './controls-meta.ts';

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

test('the phone requirement merges as OR and defaults off', () => {
  assert.deepEqual(effectiveRequirePhone({}, 'web'), { on: false, viaAll: false });
  assert.deepEqual(effectiveRequirePhone({ all: { require_phone_verified: true } }, 'android'), { on: true, viaAll: true });
  assert.deepEqual(effectiveRequirePhone({ all: { require_phone_verified: false }, ios: { require_phone_verified: true } }, 'ios'), { on: true, viaAll: false });
  assert.deepEqual(effectiveRequirePhone({ ios: { require_phone_verified: true } }, 'web'), { on: false, viaAll: false });
  assert.deepEqual(effectiveRequirePhone({ all: { require_phone_verified: true } }, 'all'), { on: true, viaAll: false });
});

test('the phone requirement is an admin change that needs no authenticator', () => {
  assert.equal(areaFor(['require_phone_verified']), 'admin');
  assert.equal(needsMfa(['require_phone_verified']), false);
});

// ---- switch history (controls-history.ts, admin v2 WP8a) ----
import { parseDetail, toHistoryRow } from './controls-history.ts';

test('switch history: app control detail becomes reason + readable changes', () => {
  const p = parseDetail('reason: Pushing app update; maintenance: false -> true; banner_level: info -> critical');
  assert.equal(p.why, 'Pushing app update');
  assert.deepEqual(p.changes, [
    { what: 'Maintenance mode', from: 'Off', to: 'On' },
    { what: 'Banner look', from: 'Information', to: 'Serious' },
  ]);
  assert.equal(parseDetail('no reason given; posting: true -> false').why, null);
  const r = toHistoryRow({ at: 'x', actorName: 'Owner', action: 'app_control_changed', targetTable: 'event', targetId: 'app_controls:android', before: null, after: null, detail: 'reason: test; posting: true -> false' });
  assert.equal(r.place, 'Android');
  assert.deepEqual(r.changes, [{ what: 'Posting jobs', from: 'On', to: 'Off' }]);
});

test('switch history: settings rows, money pause, walkthrough link', () => {
  const s = toHistoryRow({ at: 'x', actorName: 'Owner', action: 'UPDATE settings', targetTable: 'settings', targetId: 'dev_otp_for_all', before: { value: false }, after: { value: true }, detail: null });
  assert.deepEqual(s.changes, [{ what: 'Developer sign-in', from: 'Off', to: 'On' }]);
  const f = toHistoryRow({ at: 'x', actorName: 'Owner', action: 'UPDATE settings', targetTable: 'settings', targetId: 'money_flow', before: { value: 'wallet' }, after: { value: 'plan_b' }, detail: null });
  assert.deepEqual(f.changes, [{ what: 'How money flows', from: 'Wallet', to: 'Pay per task' }]);
  const m = toHistoryRow({ at: 'x', actorName: 'Owner', action: 'money_paused', targetTable: 'event', targetId: 'settings:money_paused', before: null, after: null, detail: 'reason: Razorpay down' });
  assert.equal(m.why, 'Razorpay down');
  assert.deepEqual(m.changes, [{ what: 'Pause all money', from: 'Off', to: 'On' }]);
  const w = toHistoryRow({ at: 'x', actorName: 'Owner', action: 'walkthrough_link_changed', targetTable: 'event', targetId: 'settings:walkthrough_video_url', before: null, after: null, detail: 'none -> https://youtu.be/abcdefg' });
  assert.deepEqual(w.changes, [{ what: 'Walkthrough video', from: 'None', to: 'https://youtu.be/abcdefg' }]);
});
