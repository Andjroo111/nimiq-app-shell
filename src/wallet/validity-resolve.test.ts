import { describe, expect, test } from 'bun:test';
import { MAX_HEIGHT_DISAGREEMENT, createRpcHeadReader, resolveValidityStartHeight } from './validity';

const wallet = (h: unknown) => ({ getBlockNumber: async () => h });
const rpc = (h: number | null) => async () => h;

describe('resolveValidityStartHeight', () => {
  test('max of wallet and RPC on the same chain', async () => {
    expect(await resolveValidityStartHeight(wallet(100), { readRpcHead: rpc(150) })).toBe(150);
    expect(await resolveValidityStartHeight(wallet(200), { readRpcHead: rpc(150) })).toBe(200);
  });

  test('RPC missing: the wallet height, or undefined', async () => {
    expect(await resolveValidityStartHeight(wallet(100), { readRpcHead: rpc(null) })).toBe(100);
    expect(await resolveValidityStartHeight(wallet(null), { readRpcHead: rpc(null) })).toBeUndefined();
  });

  test('a throwing RPC reader degrades to the wallet height', async () => {
    const boom = async () => { throw new Error('x'); };
    expect(await resolveValidityStartHeight(wallet(100), { readRpcHead: boom })).toBe(100);
  });

  test('undeclared network: a head from another chain is ignored', async () => {
    // A testnet wallet next to the default mainnet RPC.
    expect(await resolveValidityStartHeight(wallet(13_662_000), { readRpcHead: rpc(63_798_359) })).toBe(13_662_000);
    expect(await resolveValidityStartHeight(wallet(null), { readRpcHead: rpc(63_798_359) })).toBeUndefined();
  });

  test('declared network: the RPC is trusted however far behind the wallet is', async () => {
    const lag = MAX_HEIGHT_DISAGREEMENT * 2;
    expect(await resolveValidityStartHeight(wallet(63_798_359 - lag), { readRpcHead: rpc(63_798_359), network: 'main' })).toBe(63_798_359);
    expect(await resolveValidityStartHeight(wallet(null), { readRpcHead: rpc(63_798_359), network: 'main' })).toBe(63_798_359);
  });
});

describe('createRpcHeadReader', () => {
  const answer = (body: unknown, ok = true) => (async () => new Response(JSON.stringify(body), { status: ok ? 200 : 500 })) as unknown as typeof fetch;

  test('unwraps the Albatross { data } envelope and a flat number', async () => {
    expect(await createRpcHeadReader({ rpc: 'x', fetchImpl: answer({ result: { data: 42, metadata: null } }) })()).toBe(42);
    expect(await createRpcHeadReader({ rpc: 'x', fetchImpl: answer({ result: 43 }) })()).toBe(43);
  });

  test('highest node wins; a dead node is skipped', async () => {
    const f = (async (url: string) => {
      if (url === 'dead') throw new Error('down');
      return new Response(JSON.stringify({ result: { data: url === 'a' ? 10 : 12 } }));
    }) as unknown as typeof fetch;
    expect(await createRpcHeadReader({ rpc: ['a', 'dead', 'b'], fetchImpl: f })()).toBe(12);
  });

  test('every node failing resolves null, never throws', async () => {
    expect(await createRpcHeadReader({ rpc: 'x', fetchImpl: answer({ error: { message: 'no' } }) })()).toBeNull();
    expect(await createRpcHeadReader({ rpc: 'x', fetchImpl: answer({}, false) })()).toBeNull();
  });

  test('a hung node is cut off at the timeout', async () => {
    const hang = ((_u: string, init?: RequestInit) =>
      new Promise((_, rej) => init?.signal?.addEventListener('abort', () => rej(new Error('aborted'))))) as unknown as typeof fetch;
    const t0 = Date.now();
    expect(await createRpcHeadReader({ rpc: 'x', fetchImpl: hang, timeoutMs: 30 })()).toBeNull();
    expect(Date.now() - t0).toBeLessThan(1000);
  });
});
