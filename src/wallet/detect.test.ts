import { afterEach, beforeEach, describe, expect, jest, test } from 'bun:test';
import {
  __resetDetection,
  detectMode,
  detectModeSync,
  isNimiqPayUserAgent,
  walletDiagnostics,
} from './detect';
import { __setMiniAppSdkLoader, type MiniAppSdk } from './sdk-loader';

// ---- fakes -----------------------------------------------------------------

const ADDRESS = 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000';

class FakeProviderBase {
  listAccounts(): Promise<string[]> {
    return Promise.resolve([ADDRESS]);
  }
}
class FakeProvider extends FakeProviderBase {
  // An own data property holding an address: diagnostics must not copy it.
  address = ADDRESS;
  sendBasicTransaction(): Promise<string> {
    return Promise.resolve('tx');
  }
}

/** A fake SDK whose init() resolves on the attempt given by `resolveOn`
 *  (1-based), else rejects on its own timer like the real SDK. */
function fakeSdk(resolveOn: number | null = null): { sdk: MiniAppSdk; calls: number[] } {
  const calls: number[] = [];
  const sdk: MiniAppSdk = {
    init(options) {
      const timeout = options?.timeout ?? 10_000;
      calls.push(timeout);
      const attempt = calls.length;
      return new Promise((resolve, reject) => {
        if (resolveOn !== null && attempt === resolveOn) {
          setTimeout(() => resolve(new FakeProvider()), 100);
        } else {
          setTimeout(() => reject(new Error('Nimiq provider was not injected.')), timeout);
        }
      });
    },
  };
  return { sdk, calls };
}

function useSdk(sdk: MiniAppSdk): void {
  __setMiniAppSdkLoader(async () => sdk);
}

/** Advance fake time in small steps, flushing microtasks between steps so
 *  awaited promise chains keep up with the timers. */
async function advance(ms: number, step = 50): Promise<void> {
  // Flush first, so a timer created a few awaits into the call is registered
  // before the clock moves.
  for (let i = 0; i < 20; i++) await Promise.resolve();
  for (let t = 0; t < ms; t += step) {
    jest.advanceTimersByTime(Math.min(step, ms - t));
    for (let i = 0; i < 20; i++) await Promise.resolve();
  }
}

function track<T>(p: Promise<T>): { settled: () => boolean; value: () => T | undefined } {
  let done = false;
  let v: T | undefined;
  p.then((x) => {
    done = true;
    v = x;
  });
  return { settled: () => done, value: () => v };
}

function setWindow(win: Record<string, unknown>): void {
  (globalThis as any).window = win;
}
function setUserAgent(ua: string): void {
  (globalThis as any).navigator = { userAgent: ua };
}

beforeEach(() => {
  jest.useFakeTimers();
  __resetDetection();
});

afterEach(() => {
  jest.useRealTimers();
  __setMiniAppSdkLoader();
  __resetDetection();
  delete (globalThis as any).window;
  delete (globalThis as any).navigator;
});

// ---- the ladder ------------------------------------------------------------

describe('detectMode ladder', () => {
  test('no hint: one attempt, fails fast at ~900ms', async () => {
    setWindow({});
    const { sdk, calls } = fakeSdk();
    useSdk(sdk);
    const r = track(detectMode());
    await advance(850);
    expect(r.settled()).toBe(false);
    await advance(100);
    expect(r.settled()).toBe(true);
    expect(r.value()).toBe('hub');
    expect(calls).toEqual([900]);
    const d = walletDiagnostics();
    expect(d.resolvedVia).toBe('fallback');
    expect(d.budgetMs).toBe(900);
    expect(d.sdkImported).toBe(true);
    expect(d.initError).toContain('not injected');
  });

  test('window.nimiqPay hint: three escalating attempts totalling ~8s', async () => {
    setWindow({ nimiqPay: { language: 'en' } });
    const { sdk, calls } = fakeSdk();
    useSdk(sdk);
    const r = track(detectMode());
    await advance(7900);
    expect(r.settled()).toBe(false);
    await advance(200);
    expect(r.value()).toBe('hub');
    expect(calls).toEqual([1500, 2500, 4000]);
    expect(walletDiagnostics().budgetMs).toBe(8000);
  });

  test('NimiqPay user agent counts as a hint', async () => {
    setWindow({});
    setUserAgent('Mozilla/5.0 (Linux; Android 14) NimiqPay/2.3');
    expect(isNimiqPayUserAgent()).toBe(true);
    const { sdk, calls } = fakeSdk();
    useSdk(sdk);
    const r = track(detectMode());
    await advance(8100);
    expect(r.value()).toBe('hub');
    expect(calls).toEqual([1500, 2500, 4000]);
  });

  test('a hinted host that answers on the second attempt resolves miniapp', async () => {
    setWindow({ nimiqPay: {} });
    const { sdk, calls } = fakeSdk(2);
    useSdk(sdk);
    const r = track(detectMode());
    await advance(1700);
    expect(r.value()).toBe('miniapp');
    expect(calls).toEqual([1500, 2500]);
    const d = walletDiagnostics();
    expect(d.resolvedVia).toBe('sdk-init');
    expect(d.providerMethods).toEqual(['listAccounts', 'sendBasicTransaction']);
  });

  test('?to= deep link gets the middle budget', async () => {
    setWindow({ location: { search: '?to=NQ07' } });
    const { sdk, calls } = fakeSdk();
    useSdk(sdk);
    const r = track(detectMode());
    await advance(3100);
    expect(r.value()).toBe('hub');
    expect(calls).toEqual([3000]);
  });

  test('?ref= deep link gets the middle budget too', async () => {
    setWindow({ location: { search: '?ref=abc' } });
    const { sdk, calls } = fakeSdk();
    useSdk(sdk);
    const r = track(detectMode());
    await advance(3100);
    expect(r.value()).toBe('hub');
    expect(calls).toEqual([3000]);
  });

  test('budgets are overridable', async () => {
    setWindow({ nimiqPay: {} });
    const { sdk, calls } = fakeSdk();
    useSdk(sdk);
    const r = track(detectMode({ hintedAttemptsMs: [100, 200] }));
    await advance(400);
    expect(r.value()).toBe('hub');
    expect(calls).toEqual([100, 200]);
  });

  test('an injected provider answers at once, with no SDK import', async () => {
    setWindow({ nimiq: new FakeProvider() });
    const { sdk, calls } = fakeSdk();
    useSdk(sdk);
    expect(await detectMode()).toBe('miniapp');
    expect(calls).toEqual([]);
    expect(walletDiagnostics().resolvedVia).toBe('window.nimiq');
  });

  test('a suspended init that never settles still falls back on time', async () => {
    setWindow({});
    let inits = 0;
    useSdk({ init: () => { inits++; return new Promise(() => {}); } });
    const r = track(detectMode());
    await advance(950);
    expect(r.value()).toBe('hub');
    expect(inits).toBe(1);
    expect(walletDiagnostics().initError).toContain('900ms');
  });
});

// ---- caching + sharing -------------------------------------------------------

describe('detectMode caching', () => {
  test('a positive result is cached for the page life', async () => {
    setWindow({ nimiq: new FakeProvider() });
    expect(await detectMode()).toBe('miniapp');
    setWindow({});
    const { sdk, calls } = fakeSdk();
    useSdk(sdk);
    await advance(60_000);
    expect(await detectMode()).toBe('miniapp');
    expect(calls).toEqual([]);
  });

  test('a negative result is cached for 5s only', async () => {
    setWindow({});
    const { sdk, calls } = fakeSdk();
    useSdk(sdk);
    const first = track(detectMode());
    await advance(950);
    expect(first.value()).toBe('hub');
    expect(calls.length).toBe(1);

    await advance(4000);
    expect(await detectMode()).toBe('hub');
    expect(calls.length).toBe(1); // still cached

    await advance(1100);
    const again = track(detectMode());
    await advance(950);
    expect(again.value()).toBe('hub');
    expect(calls.length).toBe(2); // cache expired, probed again
  });

  test('after the negative cache expires a now-present host is found', async () => {
    setWindow({});
    const { sdk } = fakeSdk();
    useSdk(sdk);
    const first = track(detectMode());
    await advance(950);
    expect(first.value()).toBe('hub');
    setWindow({ nimiq: new FakeProvider() });
    expect(await detectMode()).toBe('hub');
    await advance(5100);
    expect(await detectMode()).toBe('miniapp');
  });

  test('concurrent callers share one probe', async () => {
    setWindow({ nimiqPay: {} });
    const { sdk, calls } = fakeSdk(1);
    useSdk(sdk);
    const a = detectMode();
    const b = detectMode();
    const c = detectMode();
    expect(b).toBe(a);
    expect(c).toBe(a);
    await advance(200);
    expect(await Promise.all([a, b, c])).toEqual(['miniapp', 'miniapp', 'miniapp']);
    expect(calls.length).toBe(1);
  });
});

// ---- diagnostics -------------------------------------------------------------

describe('walletDiagnostics', () => {
  test('before any detection: current flags, resolvedVia none', () => {
    setWindow({ nimiqPay: {}, ethereum: {} });
    setUserAgent('TestAgent/1.0');
    const d = walletDiagnostics();
    expect(d.resolvedVia).toBe('none');
    expect(d.hasWindowNimiqPay).toBe(true);
    expect(d.hasWindowEthereum).toBe(true);
    expect(d.hasWindowNimiq).toBe(false);
    expect(d.userAgent).toBe('TestAgent/1.0');
  });

  test('never contains an address, even when the provider carries one', async () => {
    setWindow({ nimiq: new FakeProvider(), nimiqPay: {} });
    expect(await detectMode()).toBe('miniapp');
    const d = walletDiagnostics();
    expect(d.providerMethods).toContain('listAccounts');
    const json = JSON.stringify(d);
    expect(json).not.toContain('NQ07');
    expect(json).not.toMatch(/NQ\d{2}/);
    expect(Object.keys(d).sort()).toEqual([
      'budgetMs',
      'elapsedMs',
      'hasWindowEthereum',
      'hasWindowNimiq',
      'hasWindowNimiqPay',
      'initError',
      'providerMethods',
      'resolvedVia',
      'sdkImported',
      'userAgent',
    ]);
  });

  test('returns a copy the caller cannot mutate into the record', async () => {
    setWindow({ nimiq: new FakeProvider() });
    await detectMode();
    walletDiagnostics().providerMethods.push('evil');
    expect(walletDiagnostics().providerMethods).not.toContain('evil');
  });
});

// ---- the sync path is unchanged ----------------------------------------------

describe('detectModeSync is unchanged', () => {
  test('a NimiqPay user agent alone does not flip the sync answer', () => {
    setWindow({});
    setUserAgent('NimiqPay/2.3');
    expect(detectModeSync()).toBe('hub');
  });
});
