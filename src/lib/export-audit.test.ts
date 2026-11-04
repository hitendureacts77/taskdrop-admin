// node --experimental-strip-types --test src/lib/export-audit.test.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { filterNames } from './export-audit.ts';

test('only the filter names are kept, never what was searched for', () => {
  const sp = new URLSearchParams('filter=workers&q=%2B919876543210&tag=3f2a');
  const out = filterNames(sp);
  assert.equal(out, 'filter, q, tag');
  assert.ok(!out.includes('9876543210'));
});

test('a name that is not plain letters is dropped, and a repeated one counts once', () => {
  assert.equal(filterNames(new URLSearchParams('9876543210=1&q=a&q=b')), 'q');
  assert.equal(filterNames(new URLSearchParams('')), 'none');
});

test('the export route writes the names, not the raw query string', () => {
  const src = readFileSync(new URL('../app/api/crm/export/route.ts', import.meta.url), 'utf8');
  assert.ok(src.includes('filterNames(sp)'));
  assert.ok(!src.includes("req.url.split('?')"));
});
