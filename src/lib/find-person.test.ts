import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classifyWho } from './find-person.ts';

test('usernames, with or without @', () => {
  assert.deepEqual(classifyWho('@asha'), { kind: 'username', value: 'asha' });
  assert.deepEqual(classifyWho(' asha_k '), { kind: 'username', value: 'asha_k' });
});

test('email addresses are lowercased', () => {
  assert.deepEqual(classifyWho('Asha.K@Gmail.com'), { kind: 'email', value: 'asha.k@gmail.com' });
});

test('person ids', () => {
  const id = '0b9f6a3e-1c2d-4e5f-8a9b-0c1d2e3f4a5b';
  assert.deepEqual(classifyWho(id), { kind: 'uuid', value: id });
});

test('blank or bare @ is nothing', () => {
  assert.equal(classifyWho('  '), null);
  assert.equal(classifyWho('@'), null);
});
