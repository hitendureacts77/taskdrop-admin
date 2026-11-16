// node --experimental-strip-types --test src/lib/concurrency.test.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { mapLimit } from './concurrency.ts';

const tick = () => new Promise((r) => setTimeout(r, 1));

test('mapLimit keeps the order and never runs more than the limit at once (B125)', async () => {
  let running = 0;
  let peak = 0;
  const out = await mapLimit(Array.from({ length: 50 }, (_, i) => i), 8, async (n) => {
    running++;
    peak = Math.max(peak, running);
    await tick();
    running--;
    return n * 2;
  });
  assert.deepEqual(out, Array.from({ length: 50 }, (_, i) => i * 2));
  assert.ok(peak > 1, 'runs in parallel');
  assert.ok(peak <= 8, `peak ${peak}`);
});

test('mapLimit fails loudly when one call fails', async () => {
  await assert.rejects(mapLimit([1, 2, 3], 2, async (n) => {
    if (n === 2) throw new Error('read failed');
    return n;
  }), /read failed/);
  assert.deepEqual(await mapLimit([], 4, async (n: number) => n), []);
});

test('the People export looks contacts up in parallel and stops on a read error', () => {
  const crm = readFileSync(new URL('./crm.ts', import.meta.url), 'utf8');
  const exp = crm.slice(crm.indexOf('export async function exportCsv'));
  assert.ok(exp.includes('mapLimit('), 'contacts are read with a bounded parallel map');
  assert.ok(!/for \(const r of rows\) \{[\s\S]{0,200}await service\.auth\.admin\.getUserById/.test(exp), 'not one await per person in turn');
  assert.ok(/if \(error\b[^)]*\) throw/.test(exp), 'an Auth read error stops the export');
  const rows = crm.slice(crm.indexOf('async function memberRows'), crm.indexOf('export async function getMembers'));
  assert.ok(rows.includes('profiles.error') && rows.includes('wallets.error'), 'memberRows checks its reads');
});
