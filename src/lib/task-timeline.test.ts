import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildTimeline, type TimelineJob } from './task-timeline.ts';

const base: TimelineJob = {
  status: 'OPEN',
  poster: 'Asha',
  createdAt: '2026-11-13T05:00:00Z',
  fundedAt: null,
  startedAt: null,
  workDoneAt: null,
  completedAt: null,
  autoCompleteAt: null,
  clearAt: null,
  clearedAt: null,
};
const fmt = (s: string) => `at ${s}`;
const step = (steps: ReturnType<typeof buildTimeline>, label: string) => steps.find((s) => s.label === label);

test('a cancelled job shows a Cancelled step and leaves Approved at Not yet (the bug)', () => {
  const steps = buildTimeline({ ...base, status: 'CANCELLED', completedAt: '2026-11-13T06:09:00Z' }, null, fmt);
  assert.equal(step(steps, 'Cancelled')?.at, '2026-11-13T06:09:00Z');
  assert.equal(step(steps, 'Approved, money released')?.at, null);
});

test('a finished job still shows Approved with its time and no Cancelled step', () => {
  const steps = buildTimeline({ ...base, status: 'COMPLETED', completedAt: '2026-11-13T06:09:00Z' }, { worker: 'Ravi', createdAt: '2026-11-13T05:30:00Z' }, fmt);
  assert.equal(step(steps, 'Approved, money released')?.at, '2026-11-13T06:09:00Z');
  assert.equal(step(steps, 'Cancelled'), undefined);
  assert.equal(step(steps, 'Ravi hired')?.at, '2026-11-13T05:30:00Z');
});

test('auto-completed jobs say Approved automatically', () => {
  const steps = buildTimeline({ ...base, status: 'AUTO_COMPLETED', completedAt: '2026-11-13T06:09:00Z' }, null, fmt);
  assert.equal(step(steps, 'Approved automatically')?.at, '2026-11-13T06:09:00Z');
});

test('a cancelled job with no recorded time says so', () => {
  const steps = buildTimeline({ ...base, status: 'CANCELLED' }, null, fmt);
  assert.equal(step(steps, 'Cancelled')?.note, 'Time not recorded');
});
