import { afterEach, beforeEach, describe, expect, jest, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { withTimeout } from './timeout';
import { createWallet } from './index';
import { MiniAppBackend, type MiniAppProvider } from './miniapp-backend';
import { HubBackend, type HubClient } from './hub-backend';
import { __resetDetection, walletDiagnostics } from './detect';
import { __setMiniAppSdkLoader, type MiniAppSdk } from './sdk-loader';

const ADDRESS = 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000';
// Far past any init or detection budget in this package (max ~8.8s).
const LATE_MS = 10 * 60_000;

async function advance(ms: number, step = 50): Promise<void> {
  // Flush first, so a timer created a few awaits into the call is registered
  // before the clock moves.
  for (let i = 0; i < 20; i++) await Promise.resolve();
  for (let t = 0; t < ms; t += step) {
    jest.advanceTimersByTime(Math.min(step, ms - t));
    for (let i = 0; i < 20; i++) await Promise.resolve();
  }
}

function track<T>(p: Promise<T>): { settled: () => boolean; value: () => T | undefined; error: () => unknown } {
  let done = false;
  let v: T | undefined;
  let e: unknown;
  p.then(
    (x) => { done = true; v = x; },
    (err) => { done = true; e = err; },
  );
  return { settled: () => done, value: () => v, error: () => e };
}

function late<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATE_MS));
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

// ---- withTimeout -------------------------------------------------------------

describe('withTimeout', () => {
  test('resolves to the value when the promise wins', async () => {
    const r = track(withTimeout(new Promise((res) => setTimeout(() => res('real'), 100)), 500, 'fallback'));
    await advance(150);
    expect(r.value()).toBe('real');
  });

  test('RESOLVES to the fallback when the timer wins', async () => {
    const r = track(withTimeout(new Promise(() => {}), 500, null));
    await advance(450);
    expect(r.settled()).toBe(false);
    await advance(100);
    expect(r.settled()).toBe(true);
    expect(r.value()).toBeNull();
    expect(r.error()).toBeUndefined();
  });

  test('passes a rejection through when it comes first', async () => {
    const r = track(withTimeout(Promise.reject(new Error('boom')), 500, null));
    await advance(50);
    expect((r.error() as Error).message).toBe('boom');
  });
});

// ---- the rule: never a timeout on a send or a sign ---------------------------
//
// A send that times out may already have been broadcast. Every send and sign
// below resolves ten minutes late; the REAL result must still come back. If
// anyone wraps one of them in withTimeout (or any fallback race), these fail.

function lateMiniAppProvider(): MiniAppProvider {
  return {
    listAccounts: async () => [ADDRESS],
    sendBasicTransaction: () => late('serialized-late'),
    sendBasicTransactionWithData: () => late('serialized-data-late'),
    sign: () => late({ publicKey: 'ab'.repeat(32), signature: 'cd'.repeat(64) }),
  };
}

function lateHubClient(): HubClient {
  return {
    chooseAddress: async () => ({ address: ADDRESS, label: 'W' }),
    signTransaction: () => late({ serializedTx: 'hub-late', hash: 'hub-late-hash' }),
    checkout: () => late({ serializedTx: 'hub-co-late', hash: 'hub-co-late-hash' }),
    signMessage: () =>
      late({
        signer: ADDRESS,
        signerPublicKey: new Uint8Array(32).fill(0xab),
        signature: new Uint8Array(64).fill(0xcd),
      }),
  } as HubClient;
}

describe('no timeout on a send or a sign', () => {
  const send = { recipient: ADDRESS, valueLuna: 1 };

  test('mini-app sendBasicTransaction: the late real result comes back', async () => {
    const b = new MiniAppBackend({ provider: lateMiniAppProvider(), initTimeout: 100 });
    const r = track(b.signAndSend(send));
    await advance(LATE_MS + 10_000, 5_000);
    expect(r.error()).toBeUndefined();
    expect(r.value()?.txHash).toBe('serialized-late');
  });

  test('mini-app sendBasicTransactionWithData and pay: the late result comes back', async () => {
    const b = new MiniAppBackend({ provider: lateMiniAppProvider() });
    const r = track(b.pay({ ...send, data: 'memo' }));
    await advance(LATE_MS + 10_000, 5_000);
    expect(r.value()?.txHash).toBe('serialized-data-late');
  });

  test('mini-app sign: the late result comes back', async () => {
    const b = new MiniAppBackend({ provider: lateMiniAppProvider() });
    await b.connect();
    const r = track(b.signMessage('hello'));
    await advance(LATE_MS + 10_000, 5_000);
    expect(r.value()?.signatureHex).toBe('cd'.repeat(64));
  });

  test('mini-app via the default provider path (SDK init under a budget): sends still wait', async () => {
    (globalThis as any).window = {};
    const provider = lateMiniAppProvider();
    __setMiniAppSdkLoader(async () => ({ init: async () => provider }));
    const wallet = createWallet({ mode: 'miniapp', miniAppInitTimeout: 50 });
    const r = track(wallet.signAndSend(send));
    await advance(LATE_MS + 10_000, 5_000);
    expect(r.error()).toBeUndefined();
    expect(r.value()?.txHash).toBe('serialized-late');
  });

  test('hub signAndSend, pay and signMessage: the late results come back', async () => {
    const b = new HubBackend({ appName: 't', client: lateHubClient() });
    await b.connect();
    const s = track(b.signAndSend(send));
    const p = track(b.pay(send));
    const m = track(b.signMessage('hello'));
    await advance(LATE_MS + 10_000, 5_000);
    expect(s.error()).toBeUndefined();
    expect(p.error()).toBeUndefined();
    expect(m.error()).toBeUndefined();
    expect(s.value()?.txHash).toBe('hub-late-hash');
    expect(p.value()?.txHash).toBe('hub-co-late-hash');
    expect(m.value()?.address).toBe(ADDRESS);
  });

  test('source guard: the backend classes never call withTimeout', () => {
    for (const file of ['miniapp-backend.ts', 'hub-backend.ts']) {
      const src = readFileSync(join(import.meta.dir, file), 'utf8');
      const classStart = src.indexOf('export class ');
      expect(classStart).toBeGreaterThan(-1);
      expect(src.slice(classStart)).not.toContain('withTimeout');
    }
  });
});

// ---- miniAppInitTimeout reaches sdk.init ------------------------------------

function recordingSdk(result: unknown | null): { sdk: MiniAppSdk; timeouts: (number | undefined)[] } {
  const timeouts: (number | undefined)[] = [];
  return {
    timeouts,
    sdk: {
      init(options) {
        timeouts.push(options?.timeout);
        if (result) return Promise.resolve(result);
        return new Promise((_, reject) =>
          setTimeout(() => reject(new Error('not injected')), options?.timeout ?? 10_000),
        );
      },
    },
  };
}

describe('init budget', () => {
  test('createWallet miniAppInitTimeout reaches sdk.init({ timeout })', async () => {
    (globalThis as any).window = {};
    const { sdk, timeouts } = recordingSdk(lateMiniAppProvider());
    __setMiniAppSdkLoader(async () => sdk);
    const wallet = createWallet({ mode: 'miniapp', miniAppInitTimeout: 2345 });
    const acct = await wallet.connect();
    expect(acct?.address).toBe(ADDRESS);
    expect(timeouts).toEqual([2345]);
  });

  test('default budget is 5000ms with a host hint', async () => {
    (globalThis as any).window = { nimiqPay: {} };
    const { sdk, timeouts } = recordingSdk(lateMiniAppProvider());
    __setMiniAppSdkLoader(async () => sdk);
    await createWallet().connect();
    expect(timeouts).toEqual([5000]);
  });

  test('default budget is 1200ms without a host hint', async () => {
    (globalThis as any).window = {};
    const { sdk, timeouts } = recordingSdk(lateMiniAppProvider());
    __setMiniAppSdkLoader(async () => sdk);
    await createWallet({ mode: 'miniapp' }).connect();
    expect(timeouts).toEqual([1200]);
  });

  test('an init that never settles is abandoned at budget + 800ms and recorded', async () => {
    (globalThis as any).window = {};
    __setMiniAppSdkLoader(async () => ({ init: () => new Promise(() => {}) }));
    const r = track(createWallet({ mode: 'miniapp', miniAppInitTimeout: 1000 }).connect());
    await advance(1750);
    expect(r.settled()).toBe(false);
    await advance(100);
    expect(r.settled()).toBe(true);
    expect((r.error() as Error).message).toContain('1800ms');
    const d = walletDiagnostics();
    expect(d.resolvedVia).toBe('fallback');
    expect(d.budgetMs).toBe(1000);
    expect(d.sdkImported).toBe(true);
  });

  test('a rejected init is recorded with its message', async () => {
    (globalThis as any).window = {};
    const { sdk } = recordingSdk(null);
    __setMiniAppSdkLoader(async () => sdk);
    const r = track(createWallet({ mode: 'miniapp', miniAppInitTimeout: 300 }).connect());
    await advance(350);
    expect((r.error() as Error).message).toContain('not injected');
    expect(walletDiagnostics().initError).toBe('not injected');
  });

  test('an already-injected provider skips the SDK and is recorded', async () => {
    (globalThis as any).window = { nimiq: lateMiniAppProvider() };
    const { sdk, timeouts } = recordingSdk(null);
    __setMiniAppSdkLoader(async () => sdk);
    await createWallet().connect();
    expect(timeouts).toEqual([]);
    const d = walletDiagnostics();
    expect(d.resolvedVia).toBe('window.nimiq');
    expect(JSON.stringify(d)).not.toContain('NQ07');
  });
});
