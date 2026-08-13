// Contract pins for the multi-asset seam. Most of what is pinned here is the
// SHAPE, which is the part a later refactor can quietly break for every app at
// once.
//
// The mount block at the bottom is the exception, and it exists because the
// shape tests could not have caught the bug it pins: a standalone list mounted
// with a dash in every row and stayed that way, because only the corner ever
// called refresh(). Every type was correct. Found by the playground on its
// first run (2026-08-13).
import { describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import type { CornerControlOptions } from './corner-control';
import type { AssetListOptions, ShellAsset } from './asset-list';
import { mountAssetList } from './asset-list';

const NIM: ShellAsset = {
  ticker: 'NIM',
  network: 'Nimiq',
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
    const flaky: ShellAsset = { ticker: 'BTC', network: 'Bitcoin', decimals: 8, balance: async () => null };
    await expect(flaky.balance()).resolves.toBeNull();
  });

  test('rate and onSelect are optional', () => {
    const bare: AssetListOptions = { assets: [NIM] };
    expect(bare.rate).toBeUndefined();
    expect(bare.onSelect).toBeUndefined();
  });
});

describe('asset-list mounts with real balances', () => {
  function withDom(): HTMLElement {
    const w = new Window();
    (globalThis as unknown as { document: unknown }).document = w.document;
    (globalThis as unknown as { HTMLElement: unknown }).HTMLElement = w.HTMLElement;
    return w.document.createElement('div') as unknown as HTMLElement;
  }
  const settle = () => new Promise((r) => setTimeout(r, 30));

  // The regression. A wallet screen that mounts this and shows a dash forever
  // is indistinguishable from a broken RPC, and the README advertises exactly
  // that standalone use.
  test('a standalone mount reads its balances without the host calling refresh', async () => {
    const host = withDom();
    mountAssetList(host, { assets: [NIM] });
    await settle();
    expect(host.textContent).toContain('1200');
    expect(host.textContent).not.toContain('—');
  });

  // The corner reads on menu-open instead, so it must be able to opt out: a
  // Polygon RPC and a BTC explorer on every page load, for a panel most
  // visitors never open, is the cost the lazy read exists to avoid.
  test('autoRefresh:false leaves the rows pending for the host to drive', async () => {
    const host = withDom();
    const handle = mountAssetList(host, { assets: [NIM], autoRefresh: false });
    await settle();
    expect(handle.units('NIM')).toBeNull();
    await handle.refresh();
    expect(handle.units('NIM')).toBe(120_000_000n);
  });

  // The row's second line has to name the chain, because a bare ticker is not
  // enough to receive safely. USDT exists on five chains and only one of them
  // is the one this wallet can accept.
  test('the row names the chain next to the asset name', async () => {
    const host = withDom();
    mountAssetList(host, {
      assets: [{ ticker: 'USDT', name: 'Tether USD', network: 'Polygon', decimals: 6,
        balance: async () => 1_000_000n }],
    });
    await settle();
    expect(host.textContent).toContain('Tether USD · Polygon');
  });

  // NIM is name 'Nimiq' on network 'Nimiq'. Printing both spends the row's one
  // subtitle line saying the same word twice.
  test('a name matching its network is not printed twice', async () => {
    const host = withDom();
    mountAssetList(host, { assets: [NIM] });
    await settle();
    expect(host.textContent).toContain('Nimiq');
    expect(host.textContent).not.toContain('Nimiq · Nimiq');
  });

  // A throwing reader must keep the row rather than blank it, because a balance
  // that vanishes reads as "your money is gone", not "the RPC is flaky".
  test('a throwing reader still renders its row', async () => {
    const host = withDom();
    mountAssetList(host, {
      assets: [{ ticker: 'USDT', network: 'Polygon', decimals: 6,
        balance: async () => { throw new Error('rpc 503'); } }],
    });
    await settle();
    expect(host.textContent).toContain('USDT');
  });
});
