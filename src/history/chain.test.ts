// Chain history parse. The row shapes are the live node's (rpc.nimiqwatch.com,
// 2026-11-11, getTransactionsByAddress for NQ53 VN1C MLA8 YNXD 7HR1 CDYK DHHF
// GN7Q 714B), trimmed of proof and size.
import { describe, expect, test } from 'bun:test';
import {
  createNimHistoryReader, decodeTxMessage, groupTxsByMonth, parseNimTransactions, parseNimTx, type ShellTx,
} from './chain';

const ME = 'NQ53 VN1C MLA8 YNXD 7HR1 CDYK DHHF GN7Q 714B';
const OTHER = 'NQ60 S8EH 3NNG K591 C4U9 CJQ4 83RD 108N BC4L';
const STAKING = 'NQ77 0000 0000 0000 0000 0000 0000 0000 0001';
const hex = (s: string) => [...new TextEncoder().encode(s)].map((b) => b.toString(16).padStart(2, '0')).join('');

const LIVE_OUT = {
  hash: '0aca56f4c59aafa37eca2c92ff8a3020ed4b806ad9d9e45f9e17717cc8290c19', blockNumber: 65310113,
  timestamp: 1793082436000, confirmations: 1319481, from: ME, fromType: 0, to: STAKING, toType: 3,
  value: 999980394000, fee: 0, senderData: '', recipientData: '0501b22abf7d99f2f972008c9fa73a113551d7b781',
  flags: 0, validityStartHeight: 65310076, networkId: 24, executionResult: true,
};
const LIVE_IN = {
  hash: 'f84bf86b15412cd381ffa9bdc786fa75c233068f2b67fd25ecbfbf4b59badbb4', blockNumber: 65308840,
  timestamp: 1793081163000, confirmations: 1320754, from: OTHER, to: ME, value: 999983394000, fee: 300,
  senderData: '', recipientData: '', executionResult: true,
};

describe('decodeTxMessage', () => {
  test('readable UTF-8 is the message, emoji and accents included', () => {
    expect(decodeTxMessage(hex('Rent share'))).toBe('Rent share');
    expect(decodeTxMessage(hex('Danke schön 🎉'))).toBe('Danke schön 🎉');
  });

  test('binary data is not a message (the live staking payload, a cashlink)', () => {
    expect(decodeTxMessage(LIVE_OUT.recipientData)).toBeNull();
    expect(decodeTxMessage('ff00ff00')).toBeNull();
  });

  test('a control character or a newline sinks it: a memo is one line', () => {
    expect(decodeTxMessage(hex('pay\nNQ07 fake'))).toBeNull();
    expect(decodeTxMessage(hex('a\u0007b'))).toBeNull();
  });

  test('bidi overrides and zero-width characters are removed', () => {
    expect(decodeTxMessage(hex('invoice\u202Efdp.exe'))).toBe('invoicefdp.exe');
    expect(decodeTxMessage(hex('\u200B\u200B'))).toBeNull();
  });

  test('bad hex is null', () => {
    for (const bad of ['', 'abc', 'zz', null, 42, undefined]) expect(decodeTxMessage(bad)).toBeNull();
  });
});

describe('parseNimTx', () => {
  test('outgoing: counterparty is the recipient', () => {
    const tx = parseNimTx(LIVE_OUT, ME)!;
    expect(tx.direction).toBe('out');
    expect(tx.counterparty).toBe(STAKING);
    expect(tx.valueLuna).toBe(999980394000);
    expect(tx.message).toBeNull();
    expect(tx.pending).toBe(false);
    expect(tx.timestamp).toBe(1793082436000);
  });

  test('incoming: counterparty is the sender, and a compact owner still matches', () => {
    const tx = parseNimTx(LIVE_IN, ME.replace(/\s/g, '').toLowerCase())!;
    expect(tx.direction).toBe('in');
    expect(tx.counterparty).toBe(OTHER);
    expect(tx.feeLuna).toBe(300);
  });

  test('to yourself is self, with no sign', () => {
    expect(parseNimTx({ ...LIVE_IN, from: ME, to: ME }, ME)!.direction).toBe('self');
  });

  test('a row that does not move money in or out of the owner is dropped', () => {
    expect(parseNimTx({ ...LIVE_IN, from: OTHER, to: STAKING }, ME)).toBeNull();
  });

  test('the message comes from recipientData', () => {
    expect(parseNimTx({ ...LIVE_IN, recipientData: hex('Birthday money') }, ME)!.message).toBe('Birthday money');
  });

  test('no block and no confirmations is pending; executionResult false is failed', () => {
    const p = parseNimTx({ ...LIVE_IN, blockNumber: null, confirmations: 0, timestamp: null }, ME)!;
    expect(p.pending).toBe(true);
    expect(p.timestamp).toBeNull();
    expect(parseNimTx({ ...LIVE_IN, executionResult: false }, ME)!.failed).toBe(true);
  });

  test('bad data is dropped, not guessed', () => {
    expect(parseNimTx(null, ME)).toBeNull();
    expect(parseNimTx({ ...LIVE_IN, hash: 'nothex' }, ME)).toBeNull();
    expect(parseNimTx({ ...LIVE_IN, from: 'NQ00 BAD' }, ME)).toBeNull();
    expect(parseNimTx({ ...LIVE_IN, value: -1 }, ME)).toBeNull();
    expect(parseNimTx({ ...LIVE_IN, value: '5' }, ME)).toBeNull();
    expect(parseNimTx({ ...LIVE_IN, to: undefined }, ME)).toBeNull();
  });
});

describe('parseNimTransactions', () => {
  test('the wrapped live body, malformed rows and duplicates dropped, order kept', () => {
    const txs = parseNimTransactions({ result: { data: [LIVE_OUT, { junk: 1 }, LIVE_IN, LIVE_OUT] } }, ME);
    expect(txs.map((t) => t.direction)).toEqual(['out', 'in']);
  });

  test('an RPC error throws, so it can never read as "no transactions"', () => {
    expect(() => parseNimTransactions({ error: { message: 'Invalid params' } }, ME)).toThrow();
    expect(() => parseNimTransactions({ error: 'Method not allowed' }, ME)).toThrow();
    expect(() => parseNimTransactions({ result: { data: null } }, ME)).toThrow();
  });

  test('an empty list is an empty history', () => {
    expect(parseNimTransactions({ result: { data: [] } }, ME)).toEqual([]);
    expect(parseNimTransactions([], ME)).toEqual([]);
  });
});

describe('groupTxsByMonth', () => {
  const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();
  const tx = (ts: number | null, n: number): ShellTx => ({
    hash: String(n).padStart(64, '0'), direction: 'in', counterparty: OTHER, sender: OTHER, recipient: ME,
    valueLuna: 1, feeLuna: 0, timestamp: ts, message: null, pending: ts === null,
  });

  test('local calendar months, newest first, pending leading', () => {
    const groups = groupTxsByMonth([tx(at(2026, 11, 10), 1), tx(null, 2), tx(at(2026, 11, 1), 3), tx(at(2026, 10, 31), 4), tx(at(2025, 11, 2), 5)]);
    expect(groups.map((g) => [g.key, g.txs.length])).toEqual([
      ['pending', 1], ['2026-11', 2], ['2026-10', 1], ['2025-11', 1],
    ]);
  });
});

describe('createNimHistoryReader', () => {
  test('one request, three params (the node refuses two), startAt passed through', async () => {
    const bodies: { method: string; params: unknown[] }[] = [];
    const read = createNimHistoryReader({
      rpc: 'https://a.example',
      fetchImpl: (async (_url: string, init: RequestInit) => {
        bodies.push(JSON.parse(String(init.body)));
        return { ok: true, status: 200, json: async () => ({ result: { data: [LIVE_IN] } }) } as Response;
      }) as unknown as typeof fetch,
    });
    const first = await read(ME.replace(/\s/g, ''), { max: 20 });
    expect(first).toHaveLength(1);
    await read(ME, { max: 20, startAt: LIVE_OUT.hash });
    expect(bodies).toEqual([
      { jsonrpc: '2.0', id: 1, method: 'getTransactionsByAddress', params: [ME, 20, null] } as never,
      { jsonrpc: '2.0', id: 1, method: 'getTransactionsByAddress', params: [ME, 20, LIVE_OUT.hash] } as never,
    ]);
  });

  test('a cursor that is not a hash is dropped rather than sent', async () => {
    let params: unknown[] = [];
    const read = createNimHistoryReader({
      rpc: 'https://a.example',
      fetchImpl: (async (_u: string, init: RequestInit) => {
        params = JSON.parse(String(init.body)).params;
        return { ok: true, status: 200, json: async () => ({ result: { data: [] } }) } as Response;
      }) as unknown as typeof fetch,
    });
    await read(ME, { max: 5, startAt: '"; drop' });
    expect(params[2]).toBeNull();
  });

  test('fails over in order and throws when every node fails', async () => {
    const urls: string[] = [];
    const read = createNimHistoryReader({
      rpc: ['https://a.example', 'https://b.example'],
      fetchImpl: (async (url: string) => {
        urls.push(url);
        return { ok: false, status: 429, json: async () => ({}) } as Response;
      }) as unknown as typeof fetch,
    });
    await expect(read(ME, { max: 3 })).rejects.toThrow();
    expect(urls).toEqual(['https://a.example', 'https://b.example']);
  });
});
