import assert from 'node:assert/strict';
import { test } from 'node:test';
import { describeLive } from './live-describe.ts';
import type { LiveEvent } from './live-types.ts';

const ev = (kind: string, summary: Record<string, unknown>, record_id: string | null = 'abc'): LiveEvent => ({
  id: 1,
  kind,
  record_type: 'x',
  record_id,
  actor_id: null,
  summary,
  created_at: '2026-10-13T10:00:00Z',
});

test('a posted task names the poster, the job and the price in rupees', () => {
  const l = describeLive(ev('task_posted', { title: 'Fix my tap', who: 'Priya', amount_minor: 45000, area: 'Indiranagar' }));
  assert.equal(l.text, 'Priya posted “Fix my tap” in Indiranagar · ₹450.00');
  assert.equal(l.href, '/tasks/abc');
  assert.equal(l.group, 'tasks');
});

test('a remote task says remote instead of an area', () => {
  const l = describeLive(ev('task_posted', { title: 'Logo', who: 'Ravi', kind: 'remote', amount_minor: 100 }));
  assert.match(l.text, /\(remote\)/);
});

test('the first quote is called out; later quotes are not', () => {
  const first = describeLive(ev('quote', { title: 'Fix my tap', who: 'Asha', amount_minor: 40000, first: true }));
  const later = describeLive(ev('quote', { title: 'Fix my tap', who: 'Asha', amount_minor: 40000, first: false }));
  assert.match(first.text, /^First quote on/);
  assert.equal(first.tone, 'green');
  assert.match(later.text, /^Asha quoted ₹400\.00/);
});

test('a dispute is red and a failed payout is red', () => {
  assert.equal(describeLive(ev('task_status', { title: 'Paint', to: 'DISPUTED' })).tone, 'red');
  const p = describeLive(ev('payout_status', { who: 'Meena', amount_minor: 120000, to: 'failed' }, 'p1'));
  assert.equal(p.tone, 'red');
  assert.equal(p.text, 'Payout of ₹1,200.00 to Meena failed');
  assert.equal(p.href, '/payouts/p1');
});

test('missing names and titles read naturally, never "undefined"', () => {
  for (const kind of ['signup', 'task_posted', 'quote', 'task_status', 'withdrawal_requested', 'payout_status', 'help_request', 'proof', 'review', 'copyright_notice', 'wallet_adjustment']) {
    const l = describeLive(ev(kind, {}));
    assert.doesNotMatch(l.text, /undefined|null|NaN/, kind);
    assert.ok(l.text.length > 3, kind);
  }
});

test('a wallet adjustment shows the sign: added versus took', () => {
  assert.match(describeLive(ev('wallet_adjustment', { who: 'Dev', amount_minor: 5000, reason: 'Goodwill' })).text, /^Added ₹50\.00 to Dev’s wallet: Goodwill$/);
  assert.match(describeLive(ev('wallet_adjustment', { who: 'Dev', amount_minor: -5000 })).text, /^Took ₹50\.00 from Dev’s wallet$/);
});

test('an unknown kind still shows something', () => {
  const l = describeLive(ev('some_new_thing', {}, null));
  assert.equal(l.text, 'some new thing');
  assert.equal(l.href, null);
});
