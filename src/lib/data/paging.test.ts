import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stableOrder } from './paging.ts';

type Row = { id: string; ts: string };

/** A stand-in for a PostgREST query: rows that tie on a sort key come back in a different order on every call, like Postgres does. */
class FakeQuery {
  private keys: { col: keyof Row; asc: boolean }[] = [];
  private rows: Row[];
  constructor(rows: Row[]) {
    this.rows = rows;
  }
  order(col: string, opts: { ascending: boolean }) {
    this.keys.push({ col: col as keyof Row, asc: opts.ascending });
    return this;
  }
  range(from: number, to: number) {
    const shuffled = [...this.rows].sort(() => Math.random() - 0.5);
    shuffled.sort((a, b) => {
      for (const k of this.keys) {
        const c = a[k.col].localeCompare(b[k.col]);
        if (c !== 0) return k.asc ? c : -c;
      }
      return 0;
    });
    return shuffled.slice(from, to + 1);
  }
}

const rows: Row[] = Array.from({ length: 95 }, (_, i) => ({ id: `id-${String(i).padStart(3, '0')}`, ts: i < 80 ? '2026-11-05T00:00:00Z' : `2026-11-06T00:00:${String(i).padStart(2, '0')}Z` }));

function pageAll(make: (q: FakeQuery) => FakeQuery, size = 30): string[] {
  const seen: string[] = [];
  for (let p = 0; p * size < rows.length; p++) {
    const q = make(new FakeQuery(rows));
    seen.push(...q.range(p * size, p * size + size - 1).map((r) => r.id));
  }
  return seen;
}

test('without a tie-breaker, identical timestamps page with repeats and gaps (the bug)', () => {
  const seen = pageAll((q) => q.order('ts', { ascending: false }));
  assert.notEqual(new Set(seen).size, rows.length);
});

test('stableOrder adds id so every row appears exactly once across pages', () => {
  const seen = pageAll((q) => stableOrder(q, 'ts'));
  assert.equal(seen.length, rows.length);
  assert.equal(new Set(seen).size, rows.length);
});

test('stableOrder keeps the requested direction on the main column', () => {
  const q = new FakeQuery(rows);
  const first = stableOrder(q, 'ts', true).range(0, 0)[0];
  assert.equal(first?.ts, '2026-11-05T00:00:00Z');
});

// B122: PostgREST hands back at most max_rows (1,000 on Supabase) per request without saying so, so a list read in one
// request stops silently. readAll() pages until a page comes back empty and moves on by what it actually got.
import { readAll } from './paging.ts';

test('readAll reads past a silent 1,000-row cap', async () => {
  const all = Array.from({ length: 2345 }, (_, i) => i);
  const calls: [number, number][] = [];
  const got = await readAll(async (from, to) => {
    calls.push([from, to]);
    return { data: all.slice(from, Math.min(to + 1, from + 1000)), error: null };
  });
  assert.equal(got.length, 2345);
  assert.deepEqual(got, all);
  // Moves on by the rows it got, so a cap below the page size cannot skip anyone.
  const small = await readAll(async (from, to) => ({ data: all.slice(from, Math.min(to + 1, from + 300)), error: null }));
  assert.deepEqual(small, all);
});

test('readAll fails loudly on a read error instead of returning a shorter list', async () => {
  await assert.rejects(
    readAll(async (from) => (from === 0 ? { data: [1, 2, 3], error: null } : { data: null, error: { message: 'boom' } }), 'Could not read people'),
    /Could not read people: boom/,
  );
});

test('readAll refuses to run forever', async () => {
  await assert.rejects(readAll(async () => ({ data: [1], error: null }), 'x', 1000, 50), /more than 50/);
});

import { readFileSync } from 'node:fs';
test('CRM audiences, tag counts and the People filters page through every row', () => {
  const crm = readFileSync(new URL('../crm.ts', import.meta.url), 'utf8');
  assert.ok(/readAll\([^)]*\n?[^;]*crm_segment_users/.test(crm) || /crm_segment_users[\s\S]{0,200}\.range\(from, to\)/.test(crm));
  assert.ok(!/crm_segment_users', \{ p_criteria: c \}\);/.test(crm), 'matchingIds must not read the RPC in one request');
  assert.ok(!crm.includes('.limit(20000)'), 'tag and suspension lists must be paged, not capped');
});
