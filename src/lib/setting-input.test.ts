import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseNumberInput } from './setting-input.ts';

test('blank or whitespace is refused, not saved as 0 (the bug)', () => {
  for (const s of ['', ' ', '   ', '\t', '\n']) assert.deepEqual(parseNumberInput(s), { ok: false, message: 'Type a number.' });
});

test('words and non-finite values are refused', () => {
  for (const s of ['abc', 'NaN', 'Infinity', '-Infinity', '1,5']) assert.equal(parseNumberInput(s).ok, false);
});

test('numbers pass, including a real zero', () => {
  assert.deepEqual(parseNumberInput('0'), { ok: true, n: 0 });
  assert.deepEqual(parseNumberInput(' 7 '), { ok: true, n: 7 });
  assert.deepEqual(parseNumberInput('2.5'), { ok: true, n: 2.5 });
});
