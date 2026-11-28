import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isV2Enabled, rawEnvironment } from './v2-gate.ts';

test('v2 is on only for flag "on" and environment "staging"', () => {
  assert.equal(isV2Enabled('on', 'staging'), true);
});

test('any other flag keeps v2 off', () => {
  for (const flag of [undefined, null, '', 'ON', 'On', 'true', '1', 'yes', ' on', 'on ', 'off']) {
    assert.equal(isV2Enabled(flag, 'staging'), false, String(flag));
  }
});

test('any other environment keeps v2 off, production and preview included', () => {
  for (const env of [null, undefined, '', 'production', 'preview', 'Staging', 'STAGING', ' staging', 'staging ', 'stage', 'development']) {
    assert.equal(isV2Enabled('on', env), false, String(env));
  }
});

test('rawEnvironment reads only a string environment key', () => {
  assert.equal(rawEnvironment({ environment: 'staging' }), 'staging');
  assert.equal(rawEnvironment({ environment: 'production' }), 'production');
  for (const bad of [null, undefined, 42, 'staging', [], ['staging'], {}, { environment: null }, { environment: true }, { Environment: 'staging' }]) {
    assert.equal(rawEnvironment(bad), null, JSON.stringify(bad));
  }
});

test('a failed read (null) never turns v2 on', () => {
  assert.equal(isV2Enabled('on', rawEnvironment(null)), false);
});
