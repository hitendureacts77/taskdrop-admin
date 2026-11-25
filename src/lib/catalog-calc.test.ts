import assert from 'node:assert/strict';
import { test } from 'node:test';
import { alsoMatches, asFilter, filterCounts, mapCatalogRow, mergeExplainer, sortRows, type CatalogRow } from './catalog-calc.ts';

const now = new Date('2026-11-25T12:00:00Z');
const row = (o: Partial<CatalogRow>): CatalogRow => ({ id: 'x', label: 'X', status: 'live', source: 'builtin', uses: 0, rank: 1, createdByName: null, createdAt: '2026-01-01T00:00:00Z', phrases: [], mergedLabels: [], ...o });

test('filter counts: all, added by workers, new this week, hidden; merged never counted', () => {
  const rows = [
    row({ id: 'a' }),
    row({ id: 'b', source: 'user', createdAt: '2026-11-24T00:00:00Z' }),
    row({ id: 'c', status: 'hidden', rank: null }),
    row({ id: 'd', source: 'user', status: 'merged', rank: null, createdAt: '2026-11-24T00:00:00Z' }),
  ];
  assert.deepEqual(filterCounts(rows, now), { all: 3, added: 1, new: 1, hidden: 1 });
});

test('asFilter falls back to all', () => {
  assert.equal(asFilter('nope'), 'all');
  assert.equal(asFilter('hidden'), 'hidden');
});

test('sort puts ranked first, then hidden by uses', () => {
  const s = sortRows([row({ id: 'h', rank: null, uses: 2 }), row({ id: 'r2', rank: 2 }), row({ id: 'r1', rank: 1 })]);
  assert.deepEqual(s.map((r) => r.id), ['r1', 'r2', 'h']);
});

test('also matches lists phrases then merged labels, dash when none', () => {
  assert.equal(alsoMatches({ phrases: [], mergedLabels: [] }), '–');
  assert.equal(alsoMatches({ phrases: [{ id: '1', phrase: 'teaching maths' }], mergedLabels: ['Maths'] }), 'teaching maths, Maths');
});

test('mapCatalogRow reads the rpc shape', () => {
  const r = mapCatalogRow({ id: 'i', label: 'Tutoring', status: 'live', source: 'user', uses: 3, rank: 2, created_by_name: 'Asha', created_at: '2026-11-20T00:00:00Z', phrases: [{ id: 'p', phrase: 'x' }], merged_labels: ['Y'] });
  assert.equal(r.createdByName, 'Asha');
  assert.equal(r.phrases[0].phrase, 'x');
  assert.deepEqual(r.mergedLabels, ['Y']);
});

test('merge explainer', () => {
  assert.equal(mergeExplainer(1, 'Maths', 'Tutoring', 'skill'), '1 worker’s profile changes from Maths to Tutoring. “Maths” now points to Tutoring, so the next worker who types it is asked to pick Tutoring.');
});
