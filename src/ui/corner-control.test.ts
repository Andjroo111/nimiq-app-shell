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
});
