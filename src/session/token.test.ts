import { describe, expect, test } from 'bun:test';
import { createSessionTokenStore, type StorageLike } from './token';

const A = 'NQ45 78MF K2AA NREJ B39U YLRH C8B3 7S1X MH44';
const B = 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000';
const mem = (): StorageLike => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};

function setup(over: Record<string, unknown> = {}) {
  let t = 1000;
  const calls: { url: string; auth: string | null }[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : String(input);
    calls.push({ url, auth: new Headers(init?.headers).get('authorization') });
    return new Response('ok');
  }) as typeof fetch;
  const s = createSessionTokenStore({ storage: mem(), pageOrigin: 'https://app.nimiq.sale', fetchImpl, now: () => t, ...over });
  return { s, calls, advance: (ms: number) => (t += ms) };
}

describe('createSessionTokenStore', () => {
  test('stores, returns for the same wallet in any spelling, expires', () => {
    const { s, advance } = setup();
    s.set('tok', A, 2000);
    expect(s.get(A.replace(/ /g, '').toLowerCase())).toBe('tok');
    advance(1000);
    expect(s.get(A)).toBe(null);
  });

  test('a different connected wallet clears it', () => {
    const { s } = setup();
    s.set('tok', A, 9e15);
    expect(s.get(B)).toBe(null);
    expect(s.get(A)).toBe(null);
  });

  test('bearer goes to same-origin and listed origins only', async () => {
    const { s, calls } = setup({ allowedOrigins: ['https://api.nimiq.sale'] });
    s.set('tok', A, 9e15);
    await s.fetch('/api/me');
    await s.fetch('https://api.nimiq.sale/v1');
    await s.fetch('https://evil.example/steal');
    expect(calls.map((c) => c.auth)).toEqual(['Bearer tok', 'Bearer tok', null]);
  });

  test('an explicit Authorization header is not overwritten; no token sends nothing', async () => {
    const { s, calls } = setup();
    await s.fetch('/api/x');
    s.set('tok', A, 9e15);
    await s.fetch('/api/x', { headers: { authorization: 'Basic abc' } });
    expect(calls.map((c) => c.auth)).toEqual([null, 'Basic abc']);
  });

  test('a throwing storage still works for the session', () => {
    const bad: StorageLike = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); }, removeItem: () => { throw new Error('x'); } };
    const { s } = setup({ storage: bad });
    s.set('tok', A, 9e15);
    expect(s.get(A)).toBe('tok');
  });
});
