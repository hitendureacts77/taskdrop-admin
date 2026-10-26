import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseEnvironment, showStagingRibbon, STAGING_RIBBON_TEXT } from './environment.ts';

test('production is the only value that hides the ribbon', () => {
  assert.equal(parseEnvironment({ environment: 'production' }), 'production');
  assert.equal(showStagingRibbon(parseEnvironment({ environment: 'production' })), false);
  assert.equal(parseEnvironment({ environment: 'staging' }), 'staging');
  assert.equal(showStagingRibbon(parseEnvironment({ environment: 'staging' })), true);
});

test('missing, unknown or malformed values count as staging', () => {
  for (const bad of [null, undefined, {}, [], 'production', 42, { environment: null }, { environment: '' }, { environment: 'prod' }, { environment: 'live' }, { environment: true }, { environment: ['production'] }, { Environment: 'production' }]) {
    assert.equal(parseEnvironment(bad), 'staging', JSON.stringify(bad));
    assert.equal(showStagingRibbon(parseEnvironment(bad)), true);
  }
});

test('case and stray spaces around the word are forgiven', () => {
  assert.equal(parseEnvironment({ environment: ' Production ' }), 'production');
  assert.equal(parseEnvironment({ environment: 'STAGING' }), 'staging');
});

test('the other app controls beside it do not matter', () => {
  assert.equal(parseEnvironment({ maintenance: false, environment: 'production', posting: true }), 'production');
});

test('the ribbon wording is the agreed sentence', () => {
  assert.equal(STAGING_RIBBON_TEXT, 'Staging: fake money and fake data');
});
