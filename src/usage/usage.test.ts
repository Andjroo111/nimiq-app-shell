import { describe, expect, test } from 'bun:test';
import type { StorageLike } from '../session/token';
import { acquisitionSource, fetchUsage, normalizeSource, parseUsageSummary, type UsageSummary } from './index';

const mem = (): StorageLike & { m: Map<string, string> } => {
  const m = new Map<string, string>();
  return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};

const ZERO: UsageSummary = {
  updatedAt: 0, uniqueWallets: 0, signedInWallets: 0, paidWallets: 0, activatedWallets: 0,
  repeatWallets: 0, activeToday: 0, active7Days: 0, events: [], sources: [], minCohort: 3, hiddenRows: 0,
};

const respond = (status: number, body: unknown) =>
  (async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })) as unknown as typeof fetch;

describe('acquisitionSource', () => {
  test('first touch wins for the tab; ref beats utm_source', () => {
    const s = mem();
    expect(acquisitionSource({ search: '?ref=Telegram%20Group&utm_source=x', storage: s })).toBe('telegram-group');
    expect(acquisitionSource({ search: '?ref=later', storage: s })).toBe('telegram-group');
    expect(acquisitionSource({ search: '', storage: s })).toBe('telegram-group');
  });

  test('no source is undefined and writes nothing', () => {
    const s = mem();
    expect(acquisitionSource({ search: '?foo=1', storage: s })).toBeUndefined();
    expect(s.m.size).toBe(0);
  });

  test('blocked storage still returns this page source, never throws', () => {
    const blocked: StorageLike = {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('denied'); },
      removeItem: () => {},
    };
    expect(acquisitionSource({ search: '?utm_source=reddit', storage: blocked })).toBe('reddit');
    expect(acquisitionSource({ search: '?utm_source=reddit', storage: null })).toBe('reddit');
  });

  test('normalizeSource matches the server rule', () => {
    expect(normalizeSource('  Twitter/X Ad  ')).toBe('twitter-x-ad');
    expect(normalizeSource('---')).toBeUndefined();
    expect(normalizeSource('a'.repeat(40))).toHaveLength(32);
  });
});

describe('parseUsageSummary', () => {
  test('accepts the honest zero', () => {
    expect(parseUsageSummary(ZERO)).toEqual(ZERO);
  });

  test('refuses anything that is not counts: strings, negatives, floats, the 503 body', () => {
    expect(parseUsageSummary({ ...ZERO, uniqueWallets: '18' })).toBeNull();
    expect(parseUsageSummary({ ...ZERO, paidWallets: -1 })).toBeNull();
    expect(parseUsageSummary({ ...ZERO, activeToday: 1.5 })).toBeNull();
    expect(parseUsageSummary({ ...ZERO, unavailable: true })).toBeNull();
    expect(parseUsageSummary({ ...ZERO, events: [{ event: 'x', wallets: 3 }] })).toBeNull();
    expect(parseUsageSummary(null)).toBeNull();
  });

  test('drops unknown fields', () => {
    const got = parseUsageSummary({ ...ZERO, injected: '<script>' });
    expect(got && 'injected' in got).toBe(false);
  });
});

describe('fetchUsage', () => {
  test('ok with a valid body', async () => {
    const body = { ...ZERO, uniqueWallets: 4, sources: [{ source: 'telegram', wallets: 3 }] };
    expect(await fetchUsage({ fetchImpl: respond(200, body) })).toEqual({ ok: true, summary: body });
  });

  test('a failed read is never a number', async () => {
    expect(await fetchUsage({ fetchImpl: respond(503, { ...ZERO, unavailable: true }) })).toEqual({ ok: false, reason: 'status' });
    expect(await fetchUsage({ fetchImpl: respond(200, 'not json') })).toEqual({ ok: false, reason: 'shape' });
    const down = (async () => { throw new TypeError('offline'); }) as unknown as typeof fetch;
    expect(await fetchUsage({ fetchImpl: down })).toEqual({ ok: false, reason: 'network' });
  });

  test('GETs /api/usage by default', async () => {
    const seen: Array<{ url: string; method?: string }> = [];
    const spy = (async (u: string, init?: RequestInit) => {
      seen.push({ url: u, method: init?.method });
      return new Response(JSON.stringify(ZERO));
    }) as unknown as typeof fetch;
    await fetchUsage({ fetchImpl: spy });
    expect(seen).toEqual([{ url: '/api/usage', method: 'GET' }]);
  });
});
