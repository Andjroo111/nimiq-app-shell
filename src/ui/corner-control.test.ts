// Data pins for the corner control (the DOM behavior is verified by consumer
// apps' browser passes — this repo has no DOM harness, by convention).
import { describe, expect, test } from 'bun:test';
import { FIAT_FLAGS, NATIVE_NAMES, type CornerControlOptions } from './corner-control';
import { FLAG_SVG } from '../flags/data';
import { SHELL_LANGUAGES, FEATURED_LANGUAGES, shellLocales } from '../locales';

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

  test('every ticker a host may offer has flag artwork', () => {
    // nimiq.kids offers all 14 its rate feed returns; each needs a hexagon.
    const offered = ['USD', 'EUR', 'GBP', 'MXN', 'BRL', 'CNY', 'INR',
      'JPY', 'CHF', 'CAD', 'AUD', 'KRW', 'TRY', 'VND'];
    for (const ticker of offered) expect(FIAT_FLAGS[ticker], ticker).toBeDefined();
  });
});
