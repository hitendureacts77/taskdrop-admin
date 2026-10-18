import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  countByStage,
  describeRule,
  filterLeads,
  leadFilterQuery,
  matchesOwner,
  parseLeadFilter,
  parseLeadInput,
  parseOwnerFilter,
  parseRuleInput,
  summarizeRuleTasks,
} from './crm-calc.ts';

const ME = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

test('owner filter accepts me, nobody and ids; anything else means anyone', () => {
  assert.equal(parseOwnerFilter('me'), 'me');
  assert.equal(parseOwnerFilter('NOBODY'), 'nobody');
  assert.equal(parseOwnerFilter(OTHER), OTHER);
  assert.equal(parseOwnerFilter('drop table'), 'anyone');
  assert.equal(parseOwnerFilter(undefined), 'anyone');
  assert.equal(parseOwnerFilter([OTHER, ME]), OTHER);
});

test('matchesOwner follows me, nobody and a named owner', () => {
  assert.equal(matchesOwner(null, 'anyone', ME), true);
  assert.equal(matchesOwner(null, 'nobody', ME), true);
  assert.equal(matchesOwner(ME, 'nobody', ME), false);
  assert.equal(matchesOwner(ME, 'me', ME), true);
  assert.equal(matchesOwner(OTHER, 'me', ME), false);
  assert.equal(matchesOwner(null, 'me', ME), false);
  assert.equal(matchesOwner(OTHER, OTHER, ME), true);
});

test('lead filters round-trip through the address', () => {
  const f = parseLeadFilter({ stage: 'talking', owner: 'me' });
  assert.deepEqual(f, { stage: 'talking', owner: 'me' });
  assert.equal(leadFilterQuery(f), 'stage=talking&owner=me');
  assert.deepEqual(parseLeadFilter({ stage: 'bogus' }), { stage: 'all', owner: 'anyone' });
  assert.equal(leadFilterQuery({ stage: 'all', owner: 'anyone' }), '');
});

test('counts and filtering by stage and owner', () => {
  const leads = [
    { stage: 'new', ownerId: ME },
    { stage: 'new', ownerId: null },
    { stage: 'won', ownerId: OTHER },
    { stage: 'weird', ownerId: ME },
  ];
  assert.deepEqual(countByStage(leads), { new: 2, contacted: 0, talking: 0, won: 1, lost: 0 });
  assert.equal(filterLeads(leads, { stage: 'new', owner: 'anyone' }, ME).length, 2);
  assert.equal(filterLeads(leads, { stage: 'all', owner: 'me' }, ME).length, 2);
  assert.equal(filterLeads(leads, { stage: 'new', owner: 'nobody' }, ME).length, 1);
});

test('add-lead form: name required, optional fields become null, kind falls back', () => {
  assert.equal(parseLeadInput({ name: '  ' }).ok, false);
  const r = parseLeadInput({ name: ' Sharma Cafe ', contact: '', kind: 'nonsense', source: 'Walk-in', note: '', owner: '' });
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual(r.value, { name: 'Sharma Cafe', contact: null, kind: 'business', source: 'Walk-in', note: null, owner: null });
  assert.equal(parseLeadInput({ name: 'x', owner: 'not-a-uuid' }).ok, false);
  assert.equal(parseLeadInput({ name: 'x'.repeat(121) }).ok, false);
});

test('rule form: days must be a whole number from 1 to 90', () => {
  const ok = parseRuleInput({ name: 'Nudge', kind: 'funded_no_task', days: '7', enabled: 'true' });
  assert.ok(ok.ok);
  if (ok.ok) assert.deepEqual(ok.value, { id: null, name: 'Nudge', kind: 'funded_no_task', days: 7, enabled: true });
  for (const d of ['0', '91', '2.5', 'x', '']) assert.equal(parseRuleInput({ name: 'n', kind: 'dispute_opened', days: d }).ok, false);
  assert.equal(parseRuleInput({ name: 'n', kind: 'other', days: '3' }).ok, false);
  assert.equal(parseRuleInput({ name: '', kind: 'dispute_opened', days: '3' }).ok, false);
});

test('rule descriptions use the number of days and singular wording', () => {
  assert.match(describeRule('funded_no_task', 1), /1 day ago/);
  assert.match(describeRule('dispute_opened', 5), /last 5 days/);
});

test('summarizeRuleTasks counts per rule and keeps the latest time', () => {
  const m = summarizeRuleTasks([
    { rule_id: 'a', created_at: '2026-10-01T00:00:00Z' },
    { rule_id: 'a', created_at: '2026-10-03T00:00:00Z' },
    { rule_id: 'b', created_at: '2026-10-02T00:00:00Z' },
    { rule_id: null, created_at: '2026-10-04T00:00:00Z' },
  ]);
  assert.deepEqual(m.get('a'), { count: 2, last: '2026-10-03T00:00:00Z' });
  assert.equal(m.get('b')?.count, 1);
  assert.equal(m.size, 2);
});
