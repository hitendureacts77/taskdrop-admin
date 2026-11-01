// node --test scripts/required-env.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { missingOrShort } from './lib/required-env.mjs';

const rules = [{ name: 'A_TOKEN', min: 10 }, { name: 'B_URL', min: 5 }];

test('passes when every secret is set and long enough', () => {
  assert.deepEqual(missingOrShort({ A_TOKEN: 'x'.repeat(10), B_URL: 'abcde' }, rules), []);
});

test('names what is missing, blank or too short, never the value', () => {
  const out = missingOrShort({ A_TOKEN: 'short-secret', B_URL: '   ' }, [{ name: 'A_TOKEN', min: 40 }, ...rules.slice(1)]);
  assert.deepEqual(out, ['A_TOKEN is too short (needs at least 40 characters)', 'B_URL is not set']);
  assert.ok(!out.join().includes('short-secret'));
});
