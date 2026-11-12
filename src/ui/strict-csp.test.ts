// Strict CSP: `styleNonce` reaches every <style> the mini wallet creates,
// `injectStyles: false` creates none, MINI_WALLET_CSS carries every component's
// rules, and no markup string carries a style attribute (a style-src without
// 'unsafe-inline' drops those). These are DOM facts in happy-dom; what a real
// browser's CSP enforcement does with them is not exercised here.
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Window } from 'happy-dom';
import { mountMiniWallet, CORNER_CONTROL_CSS, MINI_WALLET_CSS, type CornerControlOptions } from './corner-control';
import { ASSET_LIST_CSS } from './asset-list';
import { REPORT_SHEET_CSS } from './report-bug';
import { MINI_WALLET_CSS as FROM_INDEX } from '../index';
import { createI18n } from '../i18n';
import { mergeLocales, shellLocales } from '../locales';
import type { Wallet } from '../wallet';

const ME = 'NQ53 VN1C MLA8 YNXD 7HR1 CDYK DHHF GN7Q 714B';
const KEYS = ['window', 'document', 'HTMLElement', 'navigator', 'localStorage', 'getComputedStyle', 'Event'] as const;
let saved: Record<string, unknown> = {};
let realFetch: typeof fetch;

beforeEach(() => {
  const w = new Window();
  saved = {};
  for (const k of KEYS) {
    saved[k] = (globalThis as Record<string, unknown>)[k];
    (globalThis as Record<string, unknown>)[k] = (w as unknown as Record<string, unknown>)[k] ?? saved[k];
  }
  realFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    ({ ok: true, status: 200, json: async () => ({ result: { data: null } }) }) as Response) as unknown as typeof fetch;
});
afterEach(() => {
  for (const k of KEYS) (globalThis as Record<string, unknown>)[k] = saved[k];
  globalThis.fetch = realFetch;
});

function wallet(): Wallet {
  return {
    mode: 'hub',
    account: { address: ME, label: 'Me' },
    connect: async () => null,
    signAndSend: async () => ({ txHash: '' }),
    pay: async () => ({ txHash: 'x' }),
    signMessage: async () => ({ address: '', message: '', publicKeyHex: '', signatureHex: '' }),
    onAccountChange: () => () => {},
    disconnect: () => {},
  } as unknown as Wallet;
}

/** Mount with every style-creating piece on: the corner itself, the asset
 *  stack, and (opened from the menu) the bug sheet. */
function mountAll(opts: Partial<CornerControlOptions>) {
  const i18n = createI18n({ locales: mergeLocales(shellLocales), fallback: 'en', initial: 'en' });
  const host = document.createElement('div');
  document.body.appendChild(host);
  const handle = mountMiniWallet(host, {
    wallet: wallet(),
    i18n,
    assets: [{ ticker: 'NIM', network: 'Nimiq', decimals: 5, address: ME, balance: async () => 1n }],
    reportBug: { endpoint: '/api/feedback' },
    ...opts,
  });
  handle.open();
  (host.querySelector('.nq-cc-report') as HTMLElement).click();
  expect(document.querySelector('.nq-fb-scrim')).not.toBeNull();
  return { host, handle };
}

const styles = () => [...document.querySelectorAll('style')] as HTMLStyleElement[];

describe('styleNonce', () => {
  test('lands on every <style> the mini wallet and its sub-components create', () => {
    expect(styles()).toHaveLength(0);
    mountAll({ styleNonce: 'r4nd0m' });
    const all = styles();
    expect(all.map((s) => s.id).sort()).toEqual([
      'nimiq-shell-asset-list-style',
      'nimiq-shell-corner-control-style',
      'nimiq-shell-report-bug-style',
    ]);
    for (const s of all) {
      expect(s.getAttribute('nonce')).toBe('r4nd0m');
      expect(s.nonce).toBe('r4nd0m');
    }
  });

  test('without it, no nonce attribute is written', () => {
    mountAll({});
    expect(styles()).toHaveLength(3);
    for (const s of styles()) expect(s.hasAttribute('nonce')).toBe(false);
  });
});

describe('injectStyles: false', () => {
  test('leaves zero <style> elements after mounting, opening the menu and opening the bug sheet', () => {
    mountAll({ injectStyles: false, styleNonce: 'ignored' });
    expect(styles()).toHaveLength(0);
  });
});

describe('MINI_WALLET_CSS', () => {
  test('is the three component strings, and the index exports the same one', () => {
    expect(MINI_WALLET_CSS).toBe(CORNER_CONTROL_CSS + ASSET_LIST_CSS + REPORT_SHEET_CSS);
    expect(FROM_INDEX).toBe(MINI_WALLET_CSS);
    expect(MINI_WALLET_CSS.length).toBeGreaterThan(10_000);
  });

  test('carries a selector from every component the mini wallet can mount', () => {
    for (const selector of [
      '.nq-cc {', // corner-control
      '.nq-al {', // asset-list
      '.nq-fb-scrim {', // report-bug sheet
      '.nq-cc-evm-label', // evm-section
      '.nq-cc-view-history', // history-view
      '.nq-cc-addr-is-name', // name-lookup
      '.nq-flag-hex {', // flag-hex (was a style attribute)
      '.nq-cc-wallet-glyph {', // the EVM wallet glyph (was a style attribute)
    ]) {
      expect({ selector, found: MINI_WALLET_CSS.includes(selector) }).toEqual({ selector, found: true });
    }
  });
});

describe('no style attribute in inserted markup', () => {
  test('no non-test src/ui file writes style="..." or setAttribute(\'style\', ...)', () => {
    const dir = import.meta.dir;
    const offenders: string[] = [];
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.ts') || file.endsWith('.test.ts')) continue;
      const src = readFileSync(join(dir, file), 'utf8');
      src.split('\n').forEach((line, i) => {
        if (/style=["'\\]|setAttribute\(\s*['"]style['"]/.test(line)) offenders.push(`${file}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  test('a mounted, opened mini wallet has no element with a style attribute from markup', () => {
    const { host } = mountAll({});
    // CSSOM writes (el.style.x = ...) are allowed under CSP and also surface as
    // a style attribute, so only the markup-built pieces are checked: SVGs.
    const svgs = [...host.querySelectorAll('svg'), ...document.querySelectorAll('.nq-fb-scrim svg')];
    expect(svgs.length).toBeGreaterThan(0);
    for (const svg of svgs) expect(svg.hasAttribute('style')).toBe(false);
  });
});
