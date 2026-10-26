import assert from 'node:assert/strict';
import { test } from 'node:test';
import { describeActivity, isBackgroundRequest } from './idle-activity.ts';

const headers = (h: Record<string, string>) => (name: string) => h[name] ?? null;

test('a normal page load or click counts as a person', () => {
  assert.equal(isBackgroundRequest(headers({})), false);
  assert.equal(isBackgroundRequest(headers({ rsc: '1', 'next-router-state-tree': 'x' })), false);
  assert.equal(isBackgroundRequest(headers({ 'sec-fetch-mode': 'navigate' })), false);
});

test('every Next prefetch value is background, not only 1 (P2-43)', () => {
  for (const v of ['1', '2', '3']) {
    assert.equal(isBackgroundRequest(headers({ 'next-router-prefetch': v })), true, `value ${v}`);
  }
  assert.equal(isBackgroundRequest(headers({ 'next-router-segment-prefetch': '/payouts' })), true);
});

test('the live panel re-read and browser prefetch hints are background', () => {
  assert.equal(isBackgroundRequest(headers({ 'x-td-background': '1' })), true);
  assert.equal(isBackgroundRequest(headers({ purpose: 'prefetch' })), true);
  assert.equal(isBackgroundRequest(headers({ 'sec-purpose': 'prefetch;prerender' })), true);
});

test('the log line carries names and short values only', () => {
  const line = describeActivity('GET', '/money', headers({ rsc: '1', cookie: 'secret', 'sec-fetch-mode': 'cors' }), 125_400);
  assert.equal(line.path, '/money');
  assert.equal(line.sinceLastSeenSec, 125);
  assert.equal(line.rsc, true);
  assert.equal(line.fetchMode, 'cors');
  assert.ok(!JSON.stringify(line).includes('secret'));
  assert.equal(describeActivity('GET', '/', headers({}), null).sinceLastSeenSec, null);
});
