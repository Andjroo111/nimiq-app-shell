import { describe, expect, test } from 'bun:test';
import { createNimAccountReader, parseNimAccount } from './account';

const wrap = (data: unknown) => ({ jsonrpc: '2.0', id: 1, result: { data, metadata: null } });

describe('parseNimAccount', () => {
  test('a basic account is spendable', () => {
    expect(parseNimAccount(wrap({ type: 'basic', balance: 500 }))).toEqual({ type: 'basic', balanceLuna: 500, spendableLuna: 500 });
  });
  test('htlc, vesting and staking balances are never spendable', () => {
    for (const type of ['htlc', 'vesting', 'staking', 'HTLC']) {
      expect(parseNimAccount(wrap({ type, balance: 9 }))).toEqual({ type: type.toLowerCase() as never, balanceLuna: 9, spendableLuna: null });
    }
  });
  test('a missing, null or non-string type is unknown and not spendable', () => {
    for (const type of [undefined, null, 5]) {
      expect(parseNimAccount(wrap({ type, balance: 99 }))).toEqual({ type: 'unknown', balanceLuna: 99, spendableLuna: null });
    }
    expect(parseNimAccount(wrap({ type: 'mystery', balance: 5 }))).toEqual({ type: 'unknown', balanceLuna: 5, spendableLuna: null });
  });
  test('an answer about another address is refused', () => {
    expect(parseNimAccount(wrap({ address: 'NQ00 OTHER', type: 'basic', balance: 42 }), 'NQ07 0000')).toBe(null);
    expect(parseNimAccount(wrap({ address: 'nq07 0000', type: 'basic', balance: 42 }), 'NQ07 0000')?.spendableLuna).toBe(42);
  });
  test('flat results and junk', () => {
    expect(parseNimAccount({ result: { type: 'basic', balance: 3 } })?.spendableLuna).toBe(3);
    expect(parseNimAccount(null)).toBe(null);
    expect(parseNimAccount(wrap({ type: 'basic', balance: -1 }))?.balanceLuna).toBe(0);
  });
});

describe('createNimAccountReader', () => {
  test('sends the spaced address with getAccountByAddress, maps the answer', async () => {
    let sent: { method?: string; params?: string[] } = {};
    const impl = (async (_u: string, init?: RequestInit) => {
      sent = JSON.parse(String(init?.body));
      return new Response(JSON.stringify(wrap({ type: 'htlc', balance: 7 })));
    }) as unknown as typeof fetch;
    const acct = await createNimAccountReader({ rpc: 'https://node', fetchImpl: impl })('nq0700000000000000000000000000000000');
    expect(sent.method).toBe('getAccountByAddress');
    expect(sent.params?.[0]).toBe('NQ07 0000 0000 0000 0000 0000 0000 0000 0000');
    expect(acct).toEqual({ type: 'htlc', balanceLuna: 7, spendableLuna: null });
  });
  test('rpc and http errors throw', async () => {
    const err = (async () => new Response(JSON.stringify({ error: { message: 'bad' } }))) as unknown as typeof fetch;
    await expect(createNimAccountReader({ fetchImpl: err })('NQ07')).rejects.toThrow('bad');
    const http = (async () => new Response('', { status: 502 })) as unknown as typeof fetch;
    await expect(createNimAccountReader({ fetchImpl: http })('NQ07')).rejects.toThrow('502');
  });
});
