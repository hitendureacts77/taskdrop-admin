import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clientAddress, keyToUuid } from './rate-key.ts';

test('keyToUuid is stable, uuid-shaped and different per address', () => {
  const a = keyToUuid('203.0.113.7');
  assert.equal(a, keyToUuid('203.0.113.7'));
  assert.notEqual(a, keyToUuid('203.0.113.8'));
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.ok(!a.includes('203'));
});

test('clientAddress prefers the platform header, then the first forwarded entry', () => {
  const h = (o: Record<string, string>) => ({ get: (k: string) => o[k] ?? null });
  assert.equal(clientAddress(h({ 'x-vercel-forwarded-for': '1.1.1.1, 2.2.2.2', 'x-forwarded-for': '9.9.9.9' })), '1.1.1.1');
  assert.equal(clientAddress(h({ 'x-forwarded-for': '3.3.3.3, 4.4.4.4' })), '3.3.3.3');
  assert.equal(clientAddress(h({ 'x-real-ip': '5.5.5.5' })), '5.5.5.5');
  assert.equal(clientAddress(h({})), 'unknown');
});
