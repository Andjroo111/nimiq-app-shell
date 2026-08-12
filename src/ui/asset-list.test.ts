// Contract pins for the multi-asset seam. The rendering is verified by consumer
// apps' browser passes (this repo has no DOM harness, by convention), so what is
// pinned here is the SHAPE, which is the part a later refactor can quietly break
// for every app at once.
import { describe, expect, test } from 'bun:test';
import type { CornerControlOptions } from './corner-control';
import type { AssetListOptions, ShellAsset } from './asset-list';

const NIM: ShellAsset = {
  ticker: 'NIM',
  decimals: 5,
  balance: async () => 120_000_000n,
};

describe('asset-list contract', () => {
  // nimiq.kids and every other app on v0.9.x pass getBalanceLuna and nothing
  // else. `assets` arriving must not make it required, or the corner goes
  // balance-less across the fleet on upgrade.
  test('getBalanceLuna still stands alone', () => {
    const nimOnly: CornerControlOptions = {
      i18n: {} as never,
      getBalanceLuna: async () => 120_000_000,
    };
    expect(nimOnly.assets).toBeUndefined();
  });

  // Hashmark has no assets before onboarding and no BTC row unless the market is
  // cross-chain, so the list has to be re-readable without a remount. Both forms
  // are load-bearing: the array for a fixed list, the thunk for a changing one.
  test('assets takes an array or a thunk', () => {
    const fixed: CornerControlOptions = { i18n: {} as never, assets: [NIM] };
    const dynamic: CornerControlOptions = { i18n: {} as never, assets: () => [NIM] };
    expect(Array.isArray(fixed.assets)).toBe(true);
    expect(typeof dynamic.assets).toBe('function');
  });

  // The fleet's existing rate feeds are 1-arg (price of 1 NIM). Widening the
  // signature to (ticker, asset?) keeps them assignable; making the second
  // parameter required would silently break every one of them.
  test('a 1-arg fiat rate feed still satisfies the option', () => {
    const legacy: CornerControlOptions = {
      i18n: {} as never,
      fiat: { currencies: ['USD'], rate: async (ticker) => (ticker === 'USD' ? 0.0015 : null) },
    };
    expect(legacy.fiat?.currencies).toEqual(['USD']);
  });

  // Smallest units, never whole coins: a 6-decimal token through a float is the
  // drift format/nim.ts exists to end, and bigint is what every chain client
  // (viem, the BTC explorers, Nimiq consensus) already hands back.
  test('a balance reads in smallest units and may be bigint', async () => {
    await expect(NIM.balance()).resolves.toBe(120_000_000n);
  });

  // A reader that throws must not blank a real balance: on screen that reads as
  // "your money is gone", not "the RPC is flaky".
  test('a reader may resolve null to mean "no answer this time"', async () => {
    const flaky: ShellAsset = { ticker: 'BTC', decimals: 8, balance: async () => null };
    await expect(flaky.balance()).resolves.toBeNull();
  });

  test('rate and onSelect are optional', () => {
    const bare: AssetListOptions = { assets: [NIM] };
    expect(bare.rate).toBeUndefined();
    expect(bare.onSelect).toBeUndefined();
  });
});
