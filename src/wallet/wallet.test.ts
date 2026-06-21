import { afterEach, describe, expect, test } from 'bun:test';
import { createWallet } from './index';
import { detectModeSync } from './detect';
import type { MiniAppProvider } from './miniapp-backend';
import type { HubClient } from './hub-backend';

// ---- fakes -----------------------------------------------------------------

function fakeMiniAppProvider(
  overrides: Partial<MiniAppProvider> = {},
): MiniAppProvider {
  return {
    listAccounts: async () => ['NQ07 0000 0000 0000 0000 0000 0000 0000 0000'],
    sendBasicTransaction: async () => 'serialized-basic',
    sendBasicTransactionWithData: async () => 'serialized-with-data',
    ...overrides,
  };
}

function fakeHubClient(overrides: Partial<HubClient> = {}): HubClient {
  return {
    chooseAddress: async () => ({
      address: 'NQ11 1111 1111 1111 1111 1111 1111 1111 1111',
      label: 'My Wallet',
    }),
    signTransaction: async () => ({ serializedTx: 'hub-serialized', hash: 'hub-hash' }),
    ...overrides,
  };
}

// ---- global cleanup --------------------------------------------------------

afterEach(() => {
  delete (globalThis as any).window;
  delete (globalThis as any).navigator;
});

function setWindow(win: Record<string, unknown>): void {
  (globalThis as any).window = win;
}

// ---- mode detection --------------------------------------------------------

describe('mode detection', () => {
  test('window.nimiqPay present → miniapp', () => {
    setWindow({ nimiqPay: { language: 'de' } });
    expect(detectModeSync()).toBe('miniapp');
  });

  test('window.nimiq provider present → miniapp', () => {
    setWindow({ nimiq: fakeMiniAppProvider() });
    expect(detectModeSync()).toBe('miniapp');
  });

  test('neither present → hub', () => {
    setWindow({});
    expect(detectModeSync()).toBe('hub');
  });

  test('no window at all → hub', () => {
    // window deleted in afterEach; detect must not throw
    expect(detectModeSync()).toBe('hub');
  });

  test('createWallet picks miniapp when nimiqPay injected', () => {
    setWindow({ nimiqPay: { language: 'en' }, nimiq: fakeMiniAppProvider() });
    const w = createWallet();
    expect(w.mode).toBe('miniapp');
  });

  test('createWallet picks hub standalone', () => {
    setWindow({});
    const w = createWallet({ appName: 'Test' }, { hub: { client: fakeHubClient() } });
    expect(w.mode).toBe('hub');
  });

  test('explicit mode overrides detection', () => {
    setWindow({ nimiqPay: { language: 'en' } });
    const w = createWallet({ mode: 'hub' }, { hub: { client: fakeHubClient() } });
    expect(w.mode).toBe('hub');
  });
});

// ---- miniapp backend routing ----------------------------------------------

describe('miniapp wallet', () => {
  test('connect maps listAccounts()[0] to the account', async () => {
    const provider = fakeMiniAppProvider();
    setWindow({ nimiqPay: { language: 'en' }, nimiq: provider });
    const w = createWallet({}, { miniApp: { provider } });
    const acc = await w.connect();
    expect(acc).not.toBeNull();
    expect(acc!.address).toBe('NQ07 0000 0000 0000 0000 0000 0000 0000 0000');
    expect(w.account?.address).toBe(acc!.address);
  });

  test('connect with empty account list resolves null', async () => {
    const provider = fakeMiniAppProvider({ listAccounts: async () => [] });
    setWindow({ nimiqPay: {}, nimiq: provider });
    const w = createWallet({}, { miniApp: { provider } });
    expect(await w.connect()).toBeNull();
    expect(w.account).toBeNull();
  });

  test('listAccounts ErrorResponse throws', async () => {
    const provider = fakeMiniAppProvider({
      listAccounts: async () => ({ error: { type: 'denied', message: 'user rejected' } }),
    });
    setWindow({ nimiqPay: {}, nimiq: provider });
    const w = createWallet({}, { miniApp: { provider } });
    await expect(w.connect()).rejects.toThrow(/user rejected/);
  });

  test('signAndSend without data → sendBasicTransaction (value in Luna)', async () => {
    let captured: any = null;
    const provider = fakeMiniAppProvider({
      sendBasicTransaction: async (tx) => {
        captured = tx;
        return 'serialized-basic';
      },
    });
    setWindow({ nimiqPay: {}, nimiq: provider });
    const w = createWallet({}, { miniApp: { provider } });
    const res = await w.signAndSend({ recipient: 'NQ11', valueLuna: 100000 });
    expect(captured).toEqual({
      recipient: 'NQ11',
      value: 100000,
      fee: 0,
      validityStartHeight: undefined,
    });
    expect(res.txHash).toBe('serialized-basic');
    expect(res.serializedTx).toBe('serialized-basic');
  });

  test('signAndSend with data → sendBasicTransactionWithData (hex-encoded)', async () => {
    let captured: any = null;
    const provider = fakeMiniAppProvider({
      sendBasicTransactionWithData: async (tx) => {
        captured = tx;
        return 'serialized-with-data';
      },
    });
    setWindow({ nimiqPay: {}, nimiq: provider });
    const w = createWallet({}, { miniApp: { provider } });
    const res = await w.signAndSend({ recipient: 'NQ11', valueLuna: 5, data: 'hi' });
    // "hi" → 0x68 0x69
    expect(captured.data).toBe('6869');
    expect(captured.value).toBe(5);
    expect(res.txHash).toBe('serialized-with-data');
  });

  test('onAccountChange fires on connect and disconnect', async () => {
    const provider = fakeMiniAppProvider();
    setWindow({ nimiqPay: {}, nimiq: provider });
    const w = createWallet({}, { miniApp: { provider } });
    const seen: (string | null)[] = [];
    w.onAccountChange((a) => seen.push(a ? a.address : null));
    await w.connect();
    w.disconnect();
    expect(seen).toEqual(['NQ07 0000 0000 0000 0000 0000 0000 0000 0000', null]);
    expect(w.account).toBeNull();
  });
});

// ---- hub backend routing ---------------------------------------------------

describe('hub wallet', () => {
  test('connect resolves {address,label} on desktop', async () => {
    setWindow({});
    const w = createWallet({}, { hub: { client: fakeHubClient(), isMobile: false } });
    const acc = await w.connect();
    expect(acc).toEqual({
      address: 'NQ11 1111 1111 1111 1111 1111 1111 1111 1111',
      label: 'My Wallet',
    });
  });

  test('signAndSend routes a basic transfer and returns the hash', async () => {
    let captured: any = null;
    const client = fakeHubClient({
      signTransaction: async (req) => {
        captured = req;
        return { serializedTx: 'hub-serialized', hash: 'hub-hash' };
      },
    });
    setWindow({});
    const w = createWallet({ appName: 'Demo' }, { hub: { client, isMobile: false } });
    await w.connect();
    const res = await w.signAndSend({ recipient: 'NQ99', valueLuna: 7, feeLuna: 1 });
    expect(captured.recipientType).toBe(0);
    expect(captured.flags).toBe(0);
    expect(captured.sender).toBe('NQ11 1111 1111 1111 1111 1111 1111 1111 1111');
    expect(captured.value).toBe(7);
    expect(captured.fee).toBe(1);
    expect(res.txHash).toBe('hub-hash');
    expect(res.serializedTx).toBe('hub-serialized');
  });

  test('signAndSend before connect throws', async () => {
    setWindow({});
    const w = createWallet({}, { hub: { client: fakeHubClient(), isMobile: false } });
    await expect(w.signAndSend({ recipient: 'NQ99', valueLuna: 1 })).rejects.toThrow(
      /connect/i,
    );
  });
});
