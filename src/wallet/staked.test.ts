// The staked read. The response shapes below are the live node's, captured
// 2026-11-11 from https://rpc.nimiqwatch.com (staker NQ53 VN1C MLA8 YNXD 7HR1
// CDYK DHHF GN7Q 714B, and the burn address for the no-staker error).
import { describe, expect, test } from 'bun:test';
import { createNimStakedReader, isNoStakerError, parseNimStaker } from './staked';

const STAKER = 'NQ53 VN1C MLA8 YNXD 7HR1 CDYK DHHF GN7Q 714B';
const LIVE_STAKER = {
  jsonrpc: '2.0',
  result: {
    data: {
      address: STAKER, balance: 1003492679103,
      delegation: 'NQ49 N8MB XYCR XBUP 404C KXKK L49M A7BT F082',
      inactiveBalance: 0, inactiveFrom: null, retiredBalance: 0,
    },
    metadata: { blockNumber: 66629579, blockHash: '361414a1' },
  },
  id: 1,
};
const LIVE_NO_STAKER = {
  jsonrpc: '2.0',
  error: { code: -32603, message: 'Internal error', data: 'No staker with address: NQ07 0000 0000 0000 0000 0000 0000 0000 0000' },
  id: 1,
};

describe('parseNimStaker', () => {
  test('reads the live staker record', () => {
    const s = parseNimStaker(LIVE_STAKER, STAKER)!;
    expect(s.activeLuna).toBe(1003492679103);
    expect(s.totalLuna).toBe(1003492679103);
    expect(s.delegation).toStartWith('NQ49');
  });

  test('inactive and retired stake count as staked: none of it is spendable', () => {
    const s = parseNimStaker({ result: { data: { address: STAKER, balance: 100, inactiveBalance: 20, retiredBalance: 3 } } })!;
    expect(s.totalLuna).toBe(123);
  });

  test('the node\'s no-staker error is a zero, not a failure', () => {
    expect(parseNimStaker(LIVE_NO_STAKER)?.totalLuna).toBe(0);
    expect(isNoStakerError('No staker with address: NQ..')).toBe(true);
  });

  test('any other error is a failure (null), never a zero', () => {
    expect(parseNimStaker({ error: { code: -32601, message: 'Method not found' } })).toBeNull();
    expect(parseNimStaker({ error: 'Method not allowed' })).toBeNull();
  });

  test('an answer about another address is refused', () => {
    expect(parseNimStaker(LIVE_STAKER, 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000')).toBeNull();
  });

  test('garbage is null, and negative or odd numbers read as zero, never negative', () => {
    expect(parseNimStaker(null)).toBeNull();
    expect(parseNimStaker({ result: {} })).toBeNull();
    expect(parseNimStaker({ result: { data: { balance: -5, inactiveBalance: 'x', retiredBalance: Infinity } } })?.totalLuna).toBe(0);
  });
});

describe('createNimStakedReader', () => {
  const reply = (body: unknown, ok = true) => ({ ok, status: ok ? 200 : 503, json: async () => body }) as Response;

  test('one request when the first node answers, with the spaced address', async () => {
    const calls: { url: string; body: { method: string; params: unknown[] } }[] = [];
    const read = createNimStakedReader({
      rpc: ['https://a.example', 'https://b.example'],
      fetchImpl: (async (url: string, init: RequestInit) => {
        calls.push({ url, body: JSON.parse(String(init.body)) });
        return reply(LIVE_STAKER);
      }) as unknown as typeof fetch,
    });
    expect(await read(STAKER.replace(/\s/g, ''))).toBe(1003492679103);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.body.method).toBe('getStakerByAddress');
    expect(calls[0]!.body.params).toEqual([STAKER]);
  });

  test('the next node is asked only after a failure', async () => {
    const urls: string[] = [];
    const read = createNimStakedReader({
      rpc: ['https://a.example', 'https://b.example'],
      fetchImpl: (async (url: string) => {
        urls.push(url);
        return url.includes('a.') ? reply({}, false) : reply(LIVE_NO_STAKER);
      }) as unknown as typeof fetch,
    });
    expect(await read(STAKER)).toBe(0);
    expect(urls).toEqual(['https://a.example', 'https://b.example']);
  });

  test('throws when no node answered, so the caller can hide the line', async () => {
    const read = createNimStakedReader({
      rpc: 'https://a.example',
      fetchImpl: (async () => reply({ error: { message: 'boom' } })) as unknown as typeof fetch,
    });
    await expect(read(STAKER)).rejects.toThrow();
  });
});
