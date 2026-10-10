import { afterEach, describe, expect, test } from 'bun:test';
import { MiniAppBackend, type MiniAppProvider } from './miniapp-backend';
import { describeWalletError } from './outcome';
import type { NimAccount } from './account';

const BASIC = 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000';
const HTLC = 'NQ11 1111 1111 1111 1111 1111 1111 1111 1111';
const OTHER = 'NQ22 2222 2222 2222 2222 2222 2222 2222 2222';

type Sent = { method: string; tx: Record<string, unknown> };

function provider(o: Partial<MiniAppProvider> = {}, sent: Sent[] = []): MiniAppProvider {
  return {
    listAccounts: async () => [BASIC],
    sendBasicTransaction: async (tx) => (sent.push({ method: 'basic', tx }), 'ser-basic'),
    sendBasicTransactionWithData: async (tx) => (sent.push({ method: 'data', tx }), 'ser-data'),
    sign: async () => ({ publicKey: 'ab'.repeat(32), signature: 'cd'.repeat(64) }),
    ...o,
  };
}

const account = (type: NimAccount['type']): NimAccount => ({ type, balanceLuna: 0, spendableLuna: null });
const fastClock = { sleep: async () => {}, pollMs: 50, graceMs: 0 };

afterEach(() => {
  delete (globalThis as any).window;
});

// The 0.2 init() Proxy throws this shape (NimiqProviderError) instead of
// returning { error }. Built by hand so the test does not depend on the class.
function providerError(type: string, message: string, code?: number) {
  return Object.assign(new Error(message), { name: 'NimiqProviderError', type, code });
}

describe('SDK 0.2 error contract', () => {
  test('a thrown NimiqProviderError decline classifies as cancelled', async () => {
    const be = new MiniAppBackend({
      provider: provider({ listAccounts: async () => { throw providerError('USER_REJECTED', 'User closed the sheet'); } }),
    });
    const err = await be.connect().catch((e) => e);
    expect(err.message).toContain('Nimiq Pay:');
    expect(err.type).toBe('USER_REJECTED');
    expect(describeWalletError(err).kind).toBe('cancelled');
  });

  test('a decline carried only in `type` still reads as a cancel', async () => {
    const be = new MiniAppBackend({
      provider: provider({ listAccounts: async () => { throw providerError('PERMISSION_DENIED', 'Request failed', 4001); } }),
    });
    const err = await be.connect().catch((e) => e);
    expect(err.message).toBe('Nimiq Pay: Request failed (PERMISSION_DENIED)');
    expect(describeWalletError(err).kind).toBe('cancelled');
  });

  test('the legacy { error } return still throws the same shape', async () => {
    const be = new MiniAppBackend({
      provider: provider({ listAccounts: async () => ({ error: { type: 'USER_REJECTED', message: 'User rejected the request' } }) }),
    });
    const err = await be.connect().catch((e) => e);
    expect(err.message).toBe('Nimiq Pay: User rejected the request');
    expect(err.type).toBe('USER_REJECTED');
  });

  test('a real failure stays a failure, not a cancel', async () => {
    const be = new MiniAppBackend({ provider: provider() });
    await be.connect();
    (be as any).provider.sendBasicTransaction = async () => { throw providerError('INVALID_TRANSACTION', 'Transaction value exceeds balance'); };
    const err = await be.signAndSend({ recipient: OTHER, valueLuna: 1 }).catch((e) => e);
    expect(describeWalletError(err).kind).toBe('failed');
  });

  test('a non-provider throw passes through untouched', async () => {
    const boom = new TypeError('bridge gone');
    const be = new MiniAppBackend({ provider: provider({ listAccounts: async () => { throw boom; } }) });
    expect(await be.connect().catch((e) => e)).toBe(boom);
  });
});

describe('memo is hex on the wire', () => {
  test('UTF-8 memo goes out as lowercase hex, never plaintext', async () => {
    const sent: Sent[] = [];
    const be = new MiniAppBackend({ provider: provider({}, sent) });
    await be.signAndSend({ recipient: OTHER, valueLuna: 1, data: 'np:42:hé 🐶' });
    const data = sent[0]!.tx.data as string;
    expect(sent[0]!.method).toBe('data');
    expect(data).toMatch(/^[0-9a-f]+$/);
    expect(new TextDecoder().decode(Uint8Array.from(data.match(/../g)!.map((h) => parseInt(h, 16))))).toBe('np:42:hé 🐶');
  });

  test('raw bytes are hexed as-is; an empty memo is a basic send', async () => {
    const sent: Sent[] = [];
    const be = new MiniAppBackend({ provider: provider({}, sent) });
    await be.signAndSend({ recipient: OTHER, valueLuna: 1, data: new Uint8Array([0, 255, 16]) });
    await be.signAndSend({ recipient: OTHER, valueLuna: 1, data: '' });
    expect(sent[0]!.tx.data).toBe('00ff10');
    expect(sent[1]!.method).toBe('basic');
  });
});

describe('HTLC accounts never become the identity', () => {
  test('one listed address: taken as-is, no RPC read', async () => {
    let reads = 0;
    const be = new MiniAppBackend({ provider: provider(), readAccount: async () => (reads++, account('basic')) });
    expect((await be.connect())!.address).toBe(BASIC);
    expect(reads).toBe(0);
  });

  test('an HTLC listed first is skipped for the basic wallet', async () => {
    const types: Record<string, NimAccount['type']> = { [HTLC]: 'htlc', [BASIC]: 'basic' };
    const be = new MiniAppBackend({
      provider: provider({ listAccounts: async () => [HTLC, BASIC] }),
      readAccount: async (a) => account(types[a]!),
    });
    expect((await be.connect())!.address).toBe(BASIC);
  });

  test('no basic account among several: fail closed, not connected', async () => {
    const types: Record<string, NimAccount['type']> = { [HTLC]: 'htlc', [OTHER]: 'unknown' };
    const be = new MiniAppBackend({
      provider: provider({ listAccounts: async () => [HTLC, OTHER] }),
      readAccount: async (a) => account(types[a]!),
    });
    expect(await be.connect()).toBeNull();
  });

  test('an unreadable address is dropped when another reads basic', async () => {
    const be = new MiniAppBackend({
      provider: provider({ listAccounts: async () => [HTLC, BASIC] }),
      readAccount: async (a) => { if (a === HTLC) throw new Error('rpc 500'); return account('basic'); },
    });
    expect((await be.connect())!.address).toBe(BASIC);
  });

  test('RPC down for every address: Pay order stands', async () => {
    const be = new MiniAppBackend({
      provider: provider({ listAccounts: async () => [HTLC, BASIC] }),
      readAccount: async () => { throw new Error('offline'); },
    });
    expect((await be.connect())!.address).toBe(HTLC);
  });
});

describe('send prep: consensus wait and validity height', () => {
  const synced = (height: number | null, extra: Partial<MiniAppProvider> = {}, sent: Sent[] = []) =>
    provider({ isConsensusEstablished: async () => true, getBlockNumber: async () => height, ...extra }, sent);

  test('a provider without the sync probes is sent untouched', async () => {
    const sent: Sent[] = [];
    let rpcReads = 0;
    const be = new MiniAppBackend({ provider: provider({}, sent), readRpcHead: async () => (rpcReads++, 999) });
    await be.signAndSend({ recipient: OTHER, valueLuna: 1 });
    expect(sent[0]!.tx.validityStartHeight).toBeUndefined();
    expect(rpcReads).toBe(0);
  });

  test('a stale wallet height is lifted to the RPC head', async () => {
    const sent: Sent[] = [];
    const be = new MiniAppBackend({ provider: synced(63_790_000, {}, sent), readRpcHead: async () => 63_798_359 });
    await be.signAndSend({ recipient: OTHER, valueLuna: 1 });
    expect(sent[0]!.tx.validityStartHeight).toBe(63_798_359);
  });

  test('the wallet height wins when it is ahead', async () => {
    const sent: Sent[] = [];
    const be = new MiniAppBackend({ provider: synced(63_800_000, {}, sent), readRpcHead: async () => 63_798_359 });
    await be.signAndSend({ recipient: OTHER, valueLuna: 1 });
    expect(sent[0]!.tx.validityStartHeight).toBe(63_800_000);
  });

  test("a caller's explicit height is kept", async () => {
    const sent: Sent[] = [];
    const be = new MiniAppBackend({ provider: synced(10, {}, sent), readRpcHead: async () => 20 });
    await be.signAndSend({ recipient: OTHER, valueLuna: 1, validityStartHeight: 5 });
    expect(sent[0]!.tx.validityStartHeight).toBe(5);
  });

  test('waits for consensus, then sends', async () => {
    const sent: Sent[] = [];
    let probes = 0;
    const be = new MiniAppBackend({
      provider: synced(100, { isConsensusEstablished: async () => ++probes >= 3 }, sent),
      readRpcHead: async () => null,
      sendReadyClock: fastClock,
    });
    await be.signAndSend({ recipient: OTHER, valueLuna: 1 });
    expect(probes).toBeGreaterThanOrEqual(3);
    expect(sent).toHaveLength(1);
  });

  test('no consensus within the budget: refuses and sends nothing', async () => {
    const sent: Sent[] = [];
    const be = new MiniAppBackend({
      provider: synced(100, { isConsensusEstablished: async () => false }, sent),
      readRpcHead: async () => null,
      consensusTimeoutMs: 200,
      sendReadyClock: fastClock,
    });
    await expect(be.signAndSend({ recipient: OTHER, valueLuna: 1 })).rejects.toThrow(/still syncing.*nothing was sent/);
    expect(sent).toHaveLength(0);
  });

  test('a declared testnet host never takes a mainnet-sized head', async () => {
    (globalThis as any).window = { nimiqPay: { network: 'testnet' } };
    const sent: Sent[] = [];
    const be = new MiniAppBackend({ provider: synced(13_662_000, {}, sent), readRpcHead: async () => 13_662_292 });
    await be.signAndSend({ recipient: OTHER, valueLuna: 1 });
    expect(sent[0]!.tx.validityStartHeight).toBe(13_662_292);
  });
});
