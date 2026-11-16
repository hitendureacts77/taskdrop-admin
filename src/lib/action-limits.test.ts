import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ACTION_LIMITS, DUPLICATE_WINDOW_MS, broadcastKey, isDuplicateBroadcast } from './action-limits.ts';

test('broadcasts, warnings, suspensions and deletions each have a per-staff limit', () => {
  for (const a of ['broadcast', 'warn', 'suspend', 'delete-account'] as const) {
    const l = ACTION_LIMITS[a];
    assert.ok(l, a);
    assert.ok(l.perMinute >= 1 && l.perMinute <= 30, `${a} per minute`);
    assert.match(l.bucket, /^admin-/);
  }
  // A broadcast reaches up to 5,000 people: it is the tightest one, and has an hourly cap too.
  assert.ok(ACTION_LIMITS.broadcast.perMinute <= 3);
  assert.ok((ACTION_LIMITS.broadcast.perHour ?? 0) > 0 && (ACTION_LIMITS.broadcast.perHour ?? 0) <= 30);
});

test('the same broadcast to the same audience within the window is a duplicate', () => {
  const now = Date.parse('2026-11-16T10:00:00Z');
  const target = { toUser: null, criteria: { role: 'worker' } };
  const recent = (secondsAgo: number, over: Partial<{ to_user: string | null; criteria: unknown }> = {}) => ({
    sent_at: new Date(now - secondsAgo * 1000).toISOString(),
    to_user: null,
    criteria: { role: 'worker' },
    ...over,
  });
  assert.equal(isDuplicateBroadcast([recent(30)], target, now), true);
  // Same keys in another order are the same audience.
  assert.equal(isDuplicateBroadcast([recent(30, { criteria: { role: 'worker' } })], { toUser: null, criteria: { role: 'worker' } }, now), true);
  // Older than the window: allowed again.
  assert.equal(isDuplicateBroadcast([recent(DUPLICATE_WINDOW_MS / 1000 + 5)], target, now), false);
  // Another audience: allowed.
  assert.equal(isDuplicateBroadcast([recent(30, { criteria: { role: 'poster' } })], target, now), false);
  assert.equal(isDuplicateBroadcast([recent(30, { to_user: 'a', criteria: null })], { toUser: 'b', criteria: null }, now), false);
  assert.equal(isDuplicateBroadcast([recent(30, { to_user: 'a', criteria: null })], { toUser: 'a', criteria: null }, now), true);
  assert.equal(isDuplicateBroadcast([], target, now), false);
});

test('broadcastKey is stable, ignores key order and hides the text', () => {
  const a = broadcastKey({ toUser: null, criteria: { a: 1, b: 2 } }, 'Hello', 'Body text');
  assert.equal(a, broadcastKey({ toUser: null, criteria: { b: 2, a: 1 } }, 'Hello', 'Body text'));
  assert.notEqual(a, broadcastKey({ toUser: null, criteria: { a: 1, b: 2 } }, 'Hello', 'Other'));
  assert.ok(!a.includes('Hello'));
  assert.ok(a.length <= 60);
});
