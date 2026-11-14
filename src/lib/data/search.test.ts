import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanSearch, likeTerm, titleMatches } from './search.ts';

test('cleanSearch drops characters that break a filter string but keeps % and _ for escaping', () => {
  assert.equal(cleanSearch(`a,b(c)"d'e`), 'a b c  d e');
  assert.equal(cleanSearch(undefined), '');
  assert.equal(cleanSearch('x'.repeat(200)).length, 80);
});

test('likeTerm escapes LIKE wildcards so % and _ match themselves', () => {
  const bs = String.fromCharCode(92);
  assert.equal(likeTerm('50%'), `50${bs}%`);
  assert.equal(likeTerm('a_b'), `a${bs}_b`);
  assert.equal(likeTerm('___'), `${bs}_${bs}_${bs}_`);
  assert.equal(likeTerm('plain'), 'plain');
  assert.equal(likeTerm('  '), '');
});

test('titleMatches follows the same literal rules as the list search', () => {
  assert.equal(titleMatches('Fix my sink', 'SINK'), true);
  assert.equal(titleMatches('Fix my sink', '%'), false);
  assert.equal(titleMatches('Fix my sink', '___'), false);
  assert.equal(titleMatches('Paint 50% done', '%'), true);
  assert.equal(titleMatches('a_b job', '_'), true);
  assert.equal(titleMatches('anything', ''), true);
  assert.equal(titleMatches('anything', undefined), true);
});
