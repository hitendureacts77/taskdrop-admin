import assert from 'node:assert/strict';
import { test } from 'node:test';
import { csvCell, toCsv } from './csv.ts';

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
