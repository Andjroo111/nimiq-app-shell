import { describe, expect, test } from 'bun:test';
import { autoOpenInNimiqPayOnce } from './once';

const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36';
const DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/605.1.15';
const mem = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};
const win = (ua: string, extra: Record<string, unknown> = {}) => ({ navigator: { userAgent: ua, maxTouchPoints: ua === DESKTOP ? 0 : 5 }, location: { href: '' }, setTimeout, clearTimeout, ...extra }) as never;

describe('autoOpenInNimiqPayOnce', () => {
  test('a phone is redirected once per tab, then gets instructions', () => {
    const storage = mem();
    const went: string[] = [];
    const a = autoOpenInNimiqPayOnce('https://nimiq.gift/', { win: win(ANDROID), storage, navigate: (u) => void went.push(u) });
    expect(a.opened).toBe(true);
    const b = autoOpenInNimiqPayOnce('https://nimiq.gift/', { win: win(ANDROID), storage, navigate: (u) => void went.push(u) });
    expect(b).toEqual({ opened: false, reason: 'already-tried' });
    expect(went).toHaveLength(1);
  });

  test('never on desktop, never inside Pay', () => {
    expect(autoOpenInNimiqPayOnce('https://nimiq.gift/', { win: win(DESKTOP), storage: mem() })).toEqual({ opened: false, reason: 'desktop' });
    expect(autoOpenInNimiqPayOnce('https://nimiq.gift/', { win: win(ANDROID, { nimiqPay: {} }), storage: mem() })).toEqual({ opened: false, reason: 'inside-pay' });
  });

  test('no usable storage never auto-redirects (no way to stop a loop)', () => {
    const throwing = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
    expect(autoOpenInNimiqPayOnce('https://nimiq.gift/', { win: win(ANDROID), storage: null })).toEqual({ opened: false, reason: 'already-tried' });
    expect(autoOpenInNimiqPayOnce('https://nimiq.gift/', { win: win(ANDROID), storage: throwing })).toEqual({ opened: false, reason: 'already-tried' });
  });

  test('a storage whose reads throw but writes work never loops', () => {
    const m = new Map<string, string>();
    const half = { getItem: () => { throw new Error('x'); }, setItem: (k: string, v: string) => void m.set(k, v) };
    for (let i = 0; i < 3; i++) {
      expect(autoOpenInNimiqPayOnce('https://nimiq.gift/', { win: win(ANDROID), storage: half, navigate: () => {} }).opened).toBe(false);
    }
  });

  test('an unparsable target throws without burning the attempt', () => {
    const storage = mem();
    expect(() => autoOpenInNimiqPayOnce('not a url ::', { win: win(ANDROID), storage, navigate: () => {} })).toThrow();
    expect(autoOpenInNimiqPayOnce('https://nimiq.gift/', { win: win(ANDROID), storage, navigate: () => {} }).opened).toBe(true);
  });
});
