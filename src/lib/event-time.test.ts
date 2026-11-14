import assert from 'node:assert/strict';
import { test } from 'node:test';
import { disputeSince, paidAt } from './event-time.ts';

test('a payout touched today after it was paid still counts on the day it was sent (the bug)', () => {
  assert.equal(paidAt({ sent_at: '2026-11-01T05:00:00Z', updated_at: '2026-11-13T05:00:00Z' }), '2026-11-01T05:00:00Z');
});

test('a payout paid by hand has no sent_at, so its updated_at is its paid time', () => {
  assert.equal(paidAt({ sent_at: null, updated_at: '2026-11-12T05:00:00Z' }), '2026-11-12T05:00:00Z');
  assert.equal(paidAt({ updated_at: '2026-11-12T05:00:00Z' }), '2026-11-12T05:00:00Z');
});

test('waiting since uses when the dispute was opened, not the last task update', () => {
  assert.equal(disputeSince('2026-10-20T05:00:00Z', '2026-11-13T05:00:00Z'), '2026-10-20T05:00:00Z');
  assert.equal(disputeSince(null, '2026-11-13T05:00:00Z'), '2026-11-13T05:00:00Z');
  assert.equal(disputeSince(undefined, '2026-11-13T05:00:00Z'), '2026-11-13T05:00:00Z');
});
