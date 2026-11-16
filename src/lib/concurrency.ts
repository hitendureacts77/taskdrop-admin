/**
 * Run `fn` over every item with at most `limit` calls in flight, keeping the input order (B125: the People export used
 * to look each person up in turn). The first failure rejects the whole run, so a caller never gets a partial result.
 * Pure and import-free so it can be unit-tested on its own.
 */
export async function mapLimit<T, R>(items: readonly T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i] as T, i);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
  return out;
}
