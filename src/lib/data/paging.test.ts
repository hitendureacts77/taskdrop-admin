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
