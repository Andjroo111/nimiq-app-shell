import { describe, expect, test } from 'bun:test';
import { matchNetworkByHeight, readWalletHeight, walletMatchesNetwork } from './network-gate';

const HEADS = { main: 12_000_000, test: 9_000_000 };

describe('matchNetworkByHeight', () => {
  test('picks the network whose head is near', () => {
    expect(matchNetworkByHeight(12_000_100, HEADS)).toEqual({ network: 'main', drift: 100 });
    expect(matchNetworkByHeight(8_999_500, HEADS)).toEqual({ network: 'test', drift: 500 });
  });
  test('the tolerance edge is inclusive, one past it is no-match', () => {
    expect(matchNetworkByHeight(12_000_600, HEADS).network).toBe('main');
    expect(matchNetworkByHeight(12_000_601, HEADS)).toEqual({ network: null, reason: 'no-match' });
  });
  test('two heads in range is ambiguous, never a guess', () => {
    expect(matchNetworkByHeight(100, { main: 50, test: 150 })).toEqual({ network: null, reason: 'ambiguous' });
  });
  test('missing inputs say which', () => {
    expect(matchNetworkByHeight(null, HEADS)).toEqual({ network: null, reason: 'no-height' });
    expect(matchNetworkByHeight(0, HEADS)).toEqual({ network: null, reason: 'no-height' });
    expect(matchNetworkByHeight(NaN, HEADS)).toEqual({ network: null, reason: 'no-height' });
    expect(matchNetworkByHeight(5, { main: null })).toEqual({ network: null, reason: 'no-heads' });
  });
});

describe('walletMatchesNetwork', () => {
  test('a testnet wallet on a mainnet invoice is refused and named', () => {
    expect(walletMatchesNetwork('main', 9_000_010, HEADS)).toEqual({ ok: false, actual: 'test', reason: 'wrong-network' });
  });
  test('unknown is not ok', () => {
    expect(walletMatchesNetwork('main', null, HEADS)).toEqual({ ok: false, actual: null, reason: 'no-height' });
    expect(walletMatchesNetwork('main', 12_000_000, { test: 9_000_000 })).toEqual({ ok: false, actual: null, reason: 'no-match' });
  });
  test('match is ok', () => {
    expect(walletMatchesNetwork('test', 9_000_000, HEADS)).toEqual({ ok: true });
  });
});

describe('readWalletHeight', () => {
  test('number, numeric string, error envelope, throw, missing method', async () => {
    expect(await readWalletHeight({ getBlockNumber: async () => 42 })).toBe(42);
    expect(await readWalletHeight({ getBlockNumber: async () => '42' })).toBe(42);
    expect(await readWalletHeight({ getBlockNumber: async () => ({ error: { type: 'x', message: 'y' } }) })).toBe(null);
    expect(await readWalletHeight({ getBlockNumber: async () => { throw new Error('no'); } })).toBe(null);
    expect(await readWalletHeight({})).toBe(null);
    expect(await readWalletHeight(null)).toBe(null);
  });
  test('keeps `this` bound to the provider', async () => {
    const p = { h: 7, async getBlockNumber(this: { h: number }) { return this.h; } };
    expect(await readWalletHeight(p)).toBe(7);
  });
});
