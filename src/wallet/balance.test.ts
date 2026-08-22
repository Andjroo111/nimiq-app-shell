// The built-in NIM balance read.
//
// Every assertion here was pinned against the LIVE node first (rpc.nimiqwatch.com,
// 2026-08-22) rather than assumed, because two of them are counter-intuitive:
// the node rejects a COMPACT address outright, and an address it has never seen
// answers `balance: 0` instead of erroring.
import { describe, expect, test } from 'bun:test';
import { createNimBalanceReader, DEFAULT_NIM_RPC } from './balance';

const A_SPACED = 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000';
const A_COMPACT = A_SPACED.replace(/ /g, '');

function fakeFetch(body: unknown, init: { status?: number } = {}) {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  const impl = (async (url: string, opts: RequestInit) => {
    calls.push({ url: String(url), body: JSON.parse(String(opts.body)) });
    return {
      ok: (init.status ?? 200) < 400,
      status: init.status ?? 200,
      json: async () => body,
    } as Response;
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const wrapped = (balance: number) => ({
  jsonrpc: '2.0',
  id: 1,
  result: { data: { address: A_SPACED, balance, type: 'basic' }, metadata: { blockNumber: 1 } },
});

describe('createNimBalanceReader', () => {
  // The one that would silently break everything: the live node answers
  // {"code":-32602,"message":"Invalid params","data":"Unknown format"} for a
  // compact address, so re-spacing is not tidiness, it is the request working.
  test('sends the address SPACED, whatever form it arrives in', async () => {
    const { impl, calls } = fakeFetch(wrapped(1));
    const read = createNimBalanceReader({ fetchImpl: impl });
    await read(A_COMPACT);
    await read(A_SPACED.toLowerCase());
    expect(calls[0]!.body.params).toEqual([A_SPACED]);
    expect(calls[1]!.body.params).toEqual([A_SPACED]);
  });

  test('calls getAccountByAddress on the public node by default', async () => {
    const { impl, calls } = fakeFetch(wrapped(1));
    await createNimBalanceReader({ fetchImpl: impl })(A_SPACED);
    expect(calls[0]!.url).toBe(DEFAULT_NIM_RPC);
    expect(calls[0]!.body.method).toBe('getAccountByAddress');
  });

  test('a host can point it at its own node', async () => {
    const { impl, calls } = fakeFetch(wrapped(1));
    await createNimBalanceReader({ rpc: 'https://node.example/rpc', fetchImpl: impl })(A_SPACED);
    expect(calls[0]!.url).toBe('https://node.example/rpc');
  });

  test('reads the balance out of the result envelope', async () => {
    const { impl } = fakeFetch(wrapped(448_812_838_826));
    expect(await createNimBalanceReader({ fetchImpl: impl })(A_SPACED)).toBe(448_812_838_826);
  });

  // A host proxying this through its own server should not have to mimic the
  // node's {data, metadata} wrapper just to satisfy a parser.
  test('accepts a flat result too', async () => {
    const { impl } = fakeFetch({ result: { address: A_SPACED, balance: 7 } });
    expect(await createNimBalanceReader({ fetchImpl: impl })(A_SPACED)).toBe(7);
  });

  // Verified live: a valid address the chain has never seen comes back as a
  // basic account with balance 0. Zero is an ANSWER, and it must reach the UI —
  // throwing here would leave the corner showing the previous account's money.
  test('an unseen account is zero, not an error', async () => {
    const { impl } = fakeFetch(wrapped(0));
    expect(await createNimBalanceReader({ fetchImpl: impl })(A_SPACED)).toBe(0);
    const missing = fakeFetch({ result: { data: { address: A_SPACED, type: 'basic' } } });
    expect(await createNimBalanceReader({ fetchImpl: missing.impl })(A_SPACED)).toBe(0);
  });

  // Throwing is the CONTRACT for a failure: the corner catches it and keeps the
  // last known figure, so a flaky node never blanks a real balance.
  test('an rpc error throws rather than reading as zero', async () => {
    const { impl } = fakeFetch({ error: { code: -32602, message: 'Invalid params' } });
    expect(createNimBalanceReader({ fetchImpl: impl })(A_SPACED)).rejects.toThrow(/Invalid params/);
  });

  test('a non-200 throws', async () => {
    const { impl } = fakeFetch({}, { status: 429 });
    expect(createNimBalanceReader({ fetchImpl: impl })(A_SPACED)).rejects.toThrow(/429/);
  });

  test('a response with no result at all throws', async () => {
    const { impl } = fakeFetch({ jsonrpc: '2.0', id: 1 });
    expect(createNimBalanceReader({ fetchImpl: impl })(A_SPACED)).rejects.toThrow(/no result/);
  });
});
