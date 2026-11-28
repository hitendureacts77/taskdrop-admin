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

test('likeTerm escapes a backslash so it matches itself', () => {
  const bs = String.fromCharCode(92);
  assert.equal(likeTerm(`abc${bs}`), `abc${bs}${bs}`);
  assert.equal(likeTerm(`a${bs}b`), `a${bs}${bs}b`);
});

test('searchPlan reads words, a pasted id and a rupee amount', async () => {
  const { searchPlan, typeaheadReady } = await import('./search.ts');
  assert.deepEqual(searchPlan('Ravi'), { term: 'Ravi', id: null, amountMinor: null });
  assert.deepEqual(searchPlan('@asha_k'), { term: `asha${String.fromCharCode(92)}_k`, id: null, amountMinor: null });
  const id = 'FA4E0001-0000-4000-8000-000000000001';
  assert.deepEqual(searchPlan(` ${id} `), { term: '', id: id.toLowerCase(), amountMinor: null });
  assert.equal(searchPlan('₹1,470').amountMinor, 147000);
  assert.equal(searchPlan('1470.5').amountMinor, 147050);
  assert.equal(searchPlan('Rs 250').amountMinor, 25000);
  assert.equal(searchPlan('0').amountMinor, null);
  assert.equal(searchPlan('12abc').amountMinor, null);
  assert.equal(searchPlan('1470').term, '1470');
  assert.equal(searchPlan(undefined).term, '');
  assert.equal(typeaheadReady(' a '), false);
  assert.equal(typeaheadReady('ab'), true);
});
