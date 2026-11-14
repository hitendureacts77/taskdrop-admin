// node --experimental-strip-types --test src/lib/rate-decide.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FAIL_OPEN_BUCKETS, decideRate, failsOpen } from './rate-decide.ts';

type Report = { event: string; extra: Record<string, string | number | boolean> };

function reporter() {
  const seen: Report[] = [];
  return { seen, report: (event: string, extra: Record<string, string | number | boolean>) => void seen.push({ event, extra }) };
}

const ok = (data: unknown) => async () => ({ data, error: null });
const rpcError = async () => ({ data: null, error: { message: 'connection refused' } });
const throws = async (): Promise<{ data: unknown; error: null }> => {
  throw new Error('fetch failed');
};

test('the counter decides when it answers', async () => {
  const r = reporter();
  assert.equal(await decideRate(ok(true), 'admin-signin', r.report), true);
  assert.equal(await decideRate(ok(null), 'admin-signin', r.report), true);
  assert.equal(await decideRate(ok(false), 'admin-signin', r.report), false);
  assert.equal(r.seen.length, 0);
});

test('sign-in, authenticator and export limits fail closed and report (B121)', async () => {
  for (const bucket of ['admin-signin', 'admin-mfa', 'admin-export', 'admin-live-token']) {
    for (const hit of [rpcError, throws]) {
      const r = reporter();
      assert.equal(await decideRate(hit, bucket, r.report), false, `${bucket} must refuse when the counter is down`);
      assert.equal(r.seen.length, 1);
      assert.equal(r.seen[0]!.event, 'rate_limiter_unavailable');
      assert.equal(r.seen[0]!.extra.bucket, bucket);
      assert.equal(r.seen[0]!.extra.failOpen, false);
    }
  }
});

test('only the live strip refresh goes ahead when the counter is down, still reported', async () => {
  for (const hit of [rpcError, throws]) {
    const r = reporter();
    assert.equal(await decideRate(hit, 'admin-live', r.report), true);
    assert.equal(r.seen.length, 1);
    assert.equal(r.seen[0]!.extra.failOpen, true);
  }
  assert.deepEqual([...FAIL_OPEN_BUCKETS], ['admin-live']);
  assert.equal(failsOpen('admin-live'), true);
  assert.equal(failsOpen('admin-signin'), false);
  assert.equal(failsOpen('something-new'), false);
});
