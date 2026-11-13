import assert from 'node:assert/strict';
import { test } from 'node:test';
import { csvCell, csvDay, toCsv } from './csv.ts';

test('csvCell defuses formula starters', () => {
  assert.equal(csvCell('=SUM(A1)'), "'=SUM(A1)");
  assert.equal(csvCell('+91 98'), "'+91 98");
  assert.equal(csvCell('-5+2'), "'-5+2");
  assert.equal(csvCell('-cmd|calc'), "'-cmd|calc");
  assert.equal(csvCell('-'), "'-");
  assert.equal(csvCell('@x'), "'@x");
});

test('csvCell lets plain negative numbers through so spreadsheet sums include them (the bug)', () => {
  assert.equal(csvCell('-12.00'), '-12.00');
  assert.equal(csvCell('-5'), '-5');
  assert.equal(csvCell(-3.5), '-3.5');
  assert.equal(csvCell('-1.'), "'-1.");
  assert.equal(csvCell('--5'), "'--5");
  assert.equal(csvCell('+5'), "'+5");
});

test('csvCell quotes commas, quotes and newlines', () => {
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('a\nb'), '"a\nb"');
});

test('csvCell turns null and undefined into empty cells', () => {
  assert.equal(csvCell(null), '');
  assert.equal(csvCell(undefined), '');
  assert.equal(csvCell(0), '0');
});

test('toCsv joins with CRLF and ends with a newline', () => {
  assert.equal(toCsv(['A', 'B'], [[1, 'x,y'], [2, '']]), 'A,B\r\n1,"x,y"\r\n2,\r\n');
});

test('csvDay writes the Indian calendar date, like the screen (the bug: UTC was 4 Nov for a 5 Nov 03:47 IST sign-up)', () => {
  assert.equal(csvDay('2026-11-04T22:17:00+00:00'), '2026-11-05');
  assert.equal(csvDay('2026-11-05T10:00:00Z'), '2026-11-05');
  assert.equal(csvDay(null), '');
  assert.equal(csvDay(undefined), '');
  assert.equal(csvDay('not a date'), '');
});
