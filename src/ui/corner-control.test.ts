// Data pins for the corner control, plus a DOM block for the receive view.
//
// Most of this file pins data rather than rendering. The receive block is the
// exception and earns it: showing one asset's address under another asset's
// name is the one failure in this component that costs somebody money.
import { describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { FIAT_FLAGS, NATIVE_NAMES, mountMiniWallet, type CornerControlOptions } from './corner-control';
import { FLAG_SVG } from '../flags/data';
import { SHELL_LANGUAGES, FEATURED_LANGUAGES, shellLocales, mergeLocales } from '../locales';
import { createI18n } from '../i18n';
import type { Wallet } from '../wallet';

describe('corner-control data', () => {
  test('every fiat flag code has bundled artwork', () => {
    for (const [ticker, code] of Object.entries(FIAT_FLAGS)) {
      expect(FLAG_SVG[code], `${ticker} → ${code}`).toBeDefined();
    }
  });

  test('every shell + featured language has a native display name', () => {
    for (const lang of [...SHELL_LANGUAGES, ...FEATURED_LANGUAGES]) {
      expect(NATIVE_NAMES[lang.id], lang.id).toBeDefined();
    }
  });

  test('the menu strings exist in every shipped locale', () => {
    const keys = [
      'shell.receive', 'shell.amountsIn', 'shell.openInPay', 'shell.network',
      'shell.tapToCopy', 'shell.createCashlink', 'shell.newToNimiq',
    ];
    for (const [locale, messages] of Object.entries(shellLocales)) {
      for (const key of keys) {
        expect((messages as Record<string, string>)[key], `${locale}:${key}`).toBeDefined();
      }
    }
  });

  // Wallet-less pages (a kid app on device pairing, a portal chooser) mount the
  // corner WITHOUT a wallet and get the language-only presentation. tsc is the
  // real gate here; this pins the contract so `wallet` can't quietly go required
  // again — that would push those pages back onto the mismatched language pill.
  test('the corner mounts without a wallet (language-only pages)', () => {
    const langOnly: CornerControlOptions = { i18n: {} as never };
    expect(langOnly.wallet).toBeUndefined();
  });

  // v0.5.0 gave those pages the mini-app FACE too — chrome-less flag, no pill —
  // so the nimiq.kids portal header lost the control outline every wallet page
  // still wore (Andjroo, 7/31). The menu gating is legitimately shared; the face
  // is not. No DOM in this suite, so pin both halves at the source: the mount
  // stamps data-face, and data-face carries the pill.
  test('a wallet-less corner wears the outline pill, not the mini-app flag', async () => {
    const src = await Bun.file(new URL('./corner-control.ts', import.meta.url)).text();
    expect(src).toContain("if (!wallet) root.dataset.face = 'lang';");
    expect(src).toMatch(/\.nq-cc\[data-face="lang"\] \.nq-cc-face-flag \{[^}]*border-radius:999px/);
  });

  // v0.9.0 traded the outline for elevation (Andjroo, 8/3: "remove the gray line
  // ... around the actual white of the pill"). The pill must still READ as a
  // control on the 16 hosts that style nothing themselves, so what replaced the
  // border is pinned here: a surface and a shadow, and the foreground that has to
  // travel with them — the caret is currentColor, so a white pill with an
  // inherited light colour would be a blank white lozenge on a dark header.
  test('the language pill reads through elevation, never a border', async () => {
    const src = await Bun.file(new URL('./corner-control.ts', import.meta.url)).text();
    const rule = src.match(/\.nq-cc\[data-face="lang"\] \.nq-cc-face-flag \{[^}]*\}/)?.[0] ?? '';
    expect(rule).toContain('border:none');
    expect(rule).not.toMatch(/border:\s*1px/);
    expect(rule).toContain('--nq-cc-face-bg');
    expect(rule).toContain('--nq-cc-face-fg');
    expect(rule).toContain('--nq-cc-face-shadow');
  });

  // The currency grid used to be gated on getBalanceLuna, which made it
  // unreachable on exactly the wallet-less pages above — a display preference
  // hidden behind being signed in. These pin the decoupled contract: `fiat`
  // stands alone, and `onChange` is how a fiat-only host prices its own screens.
  test('fiat needs no wallet and no balance source', () => {
    const fiatOnly: CornerControlOptions = {
      i18n: {} as never,
      fiat: { currencies: ['USD', 'EUR'], rate: async () => null },
    };
    expect(fiatOnly.wallet).toBeUndefined();
    expect(fiatOnly.getBalanceLuna).toBeUndefined();
    expect(fiatOnly.fiat!.currencies).toHaveLength(2);
  });

  test('fiat.onChange is part of the contract', () => {
    const seen: string[] = [];
    const withHook: CornerControlOptions = {
      i18n: {} as never,
      fiat: {
        currencies: ['USD'], rate: async () => null,
        onChange: (ticker) => seen.push(ticker),
      },
    };
    withHook.fiat!.onChange!('EUR');
    expect(seen).toEqual(['EUR']);
  });

  // The bug row is a seam like every other one here: absent option, no row. It
  // takes either an options object (the shell owns the sheet) or a plain
  // callback (the host renders its own).
  test('reportBug is optional, and accepts either form', () => {
    const none: CornerControlOptions = { i18n: {} as never };
    expect(none.reportBug).toBeUndefined();

    const shellOwned: CornerControlOptions = {
      i18n: {} as never,
      reportBug: { endpoint: '/api/feedback', context: { surface: 'kid' } },
    };
    expect(typeof shellOwned.reportBug).toBe('object');

    let opened = 0;
    const hostOwned: CornerControlOptions = { i18n: {} as never, reportBug: () => { opened += 1; } };
    (hostOwned.reportBug as () => void)();
    expect(opened).toBe(1);
  });

  // A bug on a wallet-less page is still a bug. The row must NOT carry the
  // nq-cc-when-hub / nq-cc-when-connected gates the wallet rows use, or the kid
  // app and every mini-app surface would render the menu without it.
  test('the bug row is ungated by wallet state', async () => {
    const src = await Bun.file(new URL('./corner-control.ts', import.meta.url)).text();
    const row = src.match(/const row = el\('button', 'nq-cc-row nq-cc-report'[^;]*;/);
    expect(row).not.toBeNull();
    expect(row![0]).not.toContain('nq-cc-when-');
  });

  test('the bug row strings exist in every shipped locale', () => {
    const keys = [
      'shell.reportBug', 'shell.fbType', 'shell.fbBug', 'shell.fbIdea', 'shell.fbQuestion',
      'shell.fbSummary', 'shell.fbDetails', 'shell.fbIncludeDiag', 'shell.fbSend',
      'shell.fbSending', 'shell.fbThanks', 'shell.fbFailed', 'shell.fbFailEmail',
    ];
    for (const [locale, messages] of Object.entries(shellLocales)) {
      for (const key of keys) {
        expect((messages as Record<string, string>)[key], `${locale}:${key}`).toBeDefined();
      }
    }
  });

  test('every ticker a host may offer has flag artwork', () => {
    // nimiq.kids offers all 14 its rate feed returns; each needs a hexagon.
    const offered = ['USD', 'EUR', 'GBP', 'MXN', 'BRL', 'CNY', 'INR',
      'JPY', 'CHF', 'CAD', 'AUD', 'KRW', 'TRY', 'VND'];
    for (const ticker of offered) expect(FIAT_FLAGS[ticker], ticker).toBeDefined();
  });
});

describe('receive view names the chain it is showing', () => {
  const NIM_ADDRESS = 'NQ34 248H 8MB8 8QK2 5RVK EM8Q QJ8N 2Q5R 3XRK';
  const POLYGON_ADDRESS = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';

  function mount() {
    const w = new Window();
    for (const key of ['document', 'HTMLElement', 'navigator', 'localStorage', 'getComputedStyle']) {
      (globalThis as unknown as Record<string, unknown>)[key] =
        (w as unknown as Record<string, unknown>)[key];
    }
    const i18n = createI18n({ locales: mergeLocales(shellLocales), fallback: 'en' });
    const wallet = {
      mode: 'hub',
      account: { address: NIM_ADDRESS, label: 'Test' },
      connect: async () => null,
      signAndSend: async () => ({ txHash: '' }),
      pay: async () => ({ txHash: '' }),
      signMessage: async () => ({ address: '', message: '', publicKeyHex: '', signatureHex: '' }),
      onAccountChange: () => () => {},
      disconnect: () => {},
    } as unknown as Wallet;
    const host = w.document.createElement('div') as unknown as HTMLElement;
    mountMiniWallet(host, {
      wallet,
      i18n,
      assets: [
        { ticker: 'NIM', name: 'Nimiq', network: 'Nimiq', decimals: 5,
          address: NIM_ADDRESS, balance: async () => 1n },
        { ticker: 'USDT', name: 'Tether USD', network: 'Polygon', decimals: 6,
          address: POLYGON_ADDRESS, balance: async () => 1n },
      ],
    });
    return { host, i18n };
  }
  const settle = () => new Promise((r) => setTimeout(r, 40));

  // The whole point of #120: before this, tapping any row showed the NIM
  // address, because the receive view only ever read wallet.account.
  test('selecting an asset shows THAT asset address, not the account one', async () => {
    const { host } = mount();
    await settle();
    const rows = host.querySelectorAll('.nq-al-row');
    (rows[1] as HTMLElement).click();
    await settle();
    const shown = host.querySelector('.nq-cc-address')?.textContent ?? '';
    expect(shown).toContain('0x71C7656EC7ab88b098defB751B7401B5f6d8976F');
    expect(shown).not.toContain('NQ34');
  });

  test('the chain is stated on the receive screen, not only in the row', async () => {
    const { host } = mount();
    await settle();
    (host.querySelectorAll('.nq-al-row')[1] as HTMLElement).click();
    await settle();
    const warn = host.querySelector('.nq-cc-net-warn');
    expect(warn?.hasAttribute('hidden')).toBe(false);
    expect(warn?.textContent).toContain('Polygon');
    expect(warn?.textContent).toContain('USDT');
  });

  // The 3x3 grid assumes 36 characters in nine four-char blocks. A 42-character
  // Polygon address forced through it renders as ragged nonsense.
  test('a non-NIM address drops the 3x3 grid', async () => {
    const { host } = mount();
    await settle();
    (host.querySelectorAll('.nq-al-row')[1] as HTMLElement).click();
    await settle();
    expect(host.querySelector('.nq-cc-address')?.className).toContain('nq-cc-address-flat');
    (host.querySelectorAll('.nq-al-row')[0] as HTMLElement).click();
    await settle();
    expect(host.querySelector('.nq-cc-address')?.className).not.toContain('nq-cc-address-flat');
  });

  // The account's own NIM address is not a wrong-chain hazard, and a warning on
  // every screen is a warning nobody reads.
  test('the NIM row warns too, but the bare account view does not', async () => {
    const { host } = mount();
    await settle();
    (host.querySelectorAll('.nq-al-row')[0] as HTMLElement).click();
    await settle();
    expect(host.querySelector('.nq-cc-net-warn')?.textContent).toContain('Nimiq');
  });

  // applyLang() rewrites every i18n node from its key, which would blank an
  // interpolated warning and drop the asset ticker from the back label.
  test('a language switch keeps the warning and the per-asset label', async () => {
    const { host, i18n } = mount();
    await settle();
    (host.querySelectorAll('.nq-al-row')[1] as HTMLElement).click();
    await settle();
    i18n.setLanguage('de');
    await settle();
    const warn = host.querySelector('.nq-cc-net-warn')?.textContent ?? '';
    expect(warn).toContain('Polygon');
    expect(warn).toContain('USDT');
    expect(host.querySelector('.nq-cc-back')?.textContent).toContain('USDT');
  });
});
