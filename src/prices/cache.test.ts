import { describe, expect, test } from 'bun:test';
import { createPriceCache, PriceRateLimitError } from './cache';

function setup(quotes: () => Record<string, number> | Error, over: Record<string, unknown> = {}) {
  let t = 1_000_000;
  let calls = 0;
  const m = new Map<string, string>();
  const storage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
  const make = () =>
    createPriceCache({
      fetchQuotes: async () => {
        calls++;
        const q = quotes();
        if (q instanceof Error) throw q;
        return q;
      },
      storage,
      now: () => t,
      ...over,
    });
  return { make, advance: (ms: number) => (t += ms), calls: () => calls };
}

describe('createPriceCache', () => {
  test('fresh quotes are served from cache inside the TTL', async () => {
    const h = setup(() => ({ nimiq: 0.001 }));
    const c = h.make();
    expect(await c.get(['nimiq'])).toEqual({ nimiq: 0.001 });
    h.advance(59_000);
    await c.get(['nimiq']);
    expect(h.calls()).toBe(1);
  });

  test('a failed refresh serves a stale quote up to staleMax, then null', async () => {
    let fail = false;
    const h = setup(() => (fail ? new Error('500') : { nimiq: 0.002 }));
    const c = h.make();
    await c.get(['nimiq']);
    fail = true;
    h.advance(300_000);
    expect(await c.get(['nimiq'])).toEqual({ nimiq: 0.002 });
    h.advance(300_001);
    expect(await c.get(['nimiq'])).toEqual({ nimiq: null });
  });

  test('a 429 pauses refreshes for Retry-After', async () => {
    let n = 0;
    const h = setup(() => (n++ === 0 ? new PriceRateLimitError(30_000) : { nimiq: 0.003 }));
    const c = h.make();
    expect(await c.get(['nimiq'])).toEqual({ nimiq: null });
    h.advance(10_000);
    await c.get(['nimiq']);
    expect(h.calls()).toBe(1);
    h.advance(20_000);
    expect(await c.get(['nimiq'])).toEqual({ nimiq: 0.003 });
  });

  test('quotes persist across a reload, but only young enough ones', async () => {
    const h = setup(() => ({ nimiq: 0.004 }));
    await h.make().get(['nimiq']);
    h.advance(1000);
    const reloaded = h.make();
    expect(await reloaded.get(['nimiq'])).toEqual({ nimiq: 0.004 });
    expect(h.calls()).toBe(1);
  });

  test('concurrent callers share one refresh; junk prices are ignored', async () => {
    const h = setup(() => ({ nimiq: 0.005, bad: -1 }));
    const c = h.make();
    const [a, b] = await Promise.all([c.get(['nimiq', 'bad']), c.get(['nimiq', 'bad'])]);
    expect(h.calls()).toBe(1);
    expect(a).toEqual({ nimiq: 0.005, bad: null });
    expect(b).toEqual(a);
  });
});

test('a concurrent caller for different ids is not left with null', async () => {
  let t = 0;
  const asked: string[][] = [];
  const c = createPriceCache({
    fetchQuotes: async (ids) => {
      asked.push(ids);
      await new Promise((r) => setTimeout(r, 5));
      return Object.fromEntries(ids.map((id) => [id, 1]));
    },
    storage: null,
    now: () => t,
  });
  const [a, b] = await Promise.all([c.get(['nimiq']), c.get(['bitcoin'])]);
  expect(a).toEqual({ nimiq: 1 });
  expect(b).toEqual({ bitcoin: 1 });
  expect(asked).toEqual([['nimiq'], ['bitcoin']]);
});
