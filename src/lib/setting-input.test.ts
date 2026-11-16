import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseNumberInput, readableSetting } from './setting-input.ts';

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

const when = (iso: string) => `at(${iso})`;

test('readableSetting turns raw JSON and timestamps into plain words that can wrap (A1-2)', () => {
  assert.equal(readableSetting({ app: false, memo: true, snapshots: true }, when), 'app: Off · memo: On · snapshots: On');
  assert.equal(readableSetting('2026-11-16T09:20:06.273Z', when), 'at(2026-11-16T09:20:06.273Z)');
  assert.equal(readableSetting('hello', when), 'hello');
  assert.equal(readableSetting(true, when), 'On');
  assert.equal(readableSetting(12, when), '12');
  assert.equal(readableSetting(null, when), '—');
  assert.equal(readableSetting([1, 2], when), '1, 2');
  assert.equal(readableSetting({ last_ok: '2026-11-16T09:20:06Z', n: { a: 1 } }, when), 'last ok: at(2026-11-16T09:20:06Z) · n: a: 1');
});
