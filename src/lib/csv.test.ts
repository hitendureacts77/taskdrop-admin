import assert from 'node:assert/strict';
import { test } from 'node:test';
import { csvCell, toCsv } from './csv.ts';

test('csvCell defuses formula starters', () => {
  assert.equal(csvCell('=SUM(A1)'), "'=SUM(A1)");
  assert.equal(csvCell('+91 98'), "'+91 98");
  assert.equal(csvCell('-5'), "'-5");
  assert.equal(csvCell('@x'), "'@x");
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
