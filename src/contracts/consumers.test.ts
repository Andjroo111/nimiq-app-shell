// Consumer contract: the exported call shapes the fleet actually uses, pinned.
//
// Every import and call below is lifted from a consumer's main branch (grepped
// 2026-10-31). If one of these breaks, a fleet app breaks on its next bump, so
// a failure here means: bump the major, or keep the old shape working.
//
//   nimiq.cool     src/shell/entry.ts
//   nimiq.game     src/client/wallet.ts
//   nimiq.kids     src/app-shell.ts, src/parent-shell.ts, *.test.ts
//   nimiq.markets  web/src/lib/nim-wallet.ts, web/src/components/market/ShellCorner.vue
//   nimiq.sale     public/js/wallet-pill.js (dynamic import of the built bundle)
//   hashmark       app/src/client/{i18n.ts, ui/topbar.ts, ui/corner-wallet.ts} (pinned 0.17.3)
//
// nimiq.school and nimmesh import nothing from the shell.
//
// Types are pinned too: this file is type-checked by `bun run check`, so a type
// a consumer names that disappears or narrows fails CI there.

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import pkg from '../../package.json';
import * as shell from '../index';
import * as walletEntry from '../wallet/index';
import {
  SHELL_LANGUAGES,
  createI18n,
  createWallet,
  fmtFiat,
  installReportCapture,
  isMiniAppHost,
  mergeLocales,
  mountCornerControl,
  mountMiniWallet,
  pageContext,
  shellLocales,
  submitToBot,
  type Account,
  type AccountChangeListener,
  type CornerControlHandle,
  type FeedbackInput,
  type I18n,
  type Locales,
  type MiniAppProvider,
  type MiniWalletHandle,
  type SendArgs,
  type SendResult,
  type ShellAsset,
  type Wallet,
} from '../index';
import { MiniAppBackend, type MiniAppProvider as WalletEntryMiniAppProvider } from '../wallet/index';

// ---- the names each consumer imports ----

const VALUES_ROOT = [
  'SHELL_LANGUAGES', // kids
  'createI18n', // cool, hashmark, kids, markets, sale
  'createWallet', // cool, game, kids, markets, sale
  'fmtFiat', // kids
  'installReportCapture', // kids
  'isMiniAppHost', // kids
  'mergeLocales', // cool, hashmark, kids, markets, sale
  'mountCornerControl', // hashmark, kids
  'mountMiniWallet', // cool, markets, sale
  'pageContext', // kids
  'shellLocales', // cool, hashmark, kids, markets, sale
  'submitToBot', // kids
] as const;

describe('entry points', () => {
  test('package.json exports the two entries consumers import from', () => {
    expect(pkg.exports['.']).toBe('./src/index.ts');
    expect(pkg.exports['./wallet']).toBe('./src/wallet/index.ts');
  });

  test('every value a consumer imports from "nimiq-app-shell" is exported', () => {
    for (const name of VALUES_ROOT) expect([name, typeof (shell as Record<string, unknown>)[name]]).not.toEqual([name, 'undefined']);
  });

  test('"nimiq-app-shell/wallet" exports MiniAppBackend (kids)', () => {
    expect(typeof walletEntry.MiniAppBackend).toBe('function');
  });
});

// ---- types: compile-time pins, checked by `bun run check` ----

// hashmark builds its own Wallet as an object literal (corner-wallet.ts). A new
// REQUIRED member on Wallet breaks that literal; optional members are fine.
const hashmarkWallet: Wallet = {
  mode: 'hub',
  account: null,
  connect: async () => null,
  pay: async (_args: SendArgs): Promise<SendResult> => ({ txHash: '' }) as SendResult,
  signAndSend: async () => ({ txHash: '' }) as SendResult,
  signMessage: async () => { throw new Error('not here'); },
  onAccountChange: (_cb: AccountChangeListener) => () => {},
  disconnect: () => {},
};

// hashmark: the account callback receives Account | null.
const onAccount: AccountChangeListener = (a: Account | null) => void a?.address;
// kids, cool, hashmark: Locales is a plain lang -> key -> string map.
const appLocales: Locales = { en: { 'app.hello': 'Hello {name}' }, de: { 'app.hello': 'Hallo {name}' } };
// kids: the root and the /wallet entry name the same provider type.
type SameProvider = MiniAppProvider extends WalletEntryMiniAppProvider ? (WalletEntryMiniAppProvider extends MiniAppProvider ? true : false) : false;
const sameProvider: SameProvider = true;
// cool and markets name the handle MiniWalletHandle; hashmark names it CornerControlHandle.
type SameHandle = MiniWalletHandle extends CornerControlHandle ? (CornerControlHandle extends MiniWalletHandle ? true : false) : false;
const sameHandle: SameHandle = true;
// kids: installReportCapture(BOT) with the bot origin string.
const capture: (origin: string) => void = installReportCapture;
// hashmark: assets passed to the corner control.
const noAssets: ShellAsset[] = [];
// kids: a bug report input, as its privacy test builds it.
const kidsReport: FeedbackInput = { type: 'bug', title: 't', description: 'd', pageContext: {} };

test('type pins are referenced (compile-time checks above)', () => {
  expect([hashmarkWallet.mode, typeof onAccount, sameProvider, sameHandle, typeof capture, noAssets.length, kidsReport.type, Object.keys(appLocales)])
    .toEqual(['hub', 'function', true, true, 'function', 0, 'bug', ['en', 'de']]);
});

// ---- i18n: hashmark, cool, kids, markets, sale ----

describe('createI18n + mergeLocales + shellLocales', () => {
  test('cool, hashmark, kids: mergeLocales(shellLocales, app) keeps both key sets', () => {
    const i18n: I18n = createI18n({ locales: mergeLocales(shellLocales, appLocales), fallback: 'en' });
    expect(i18n.t('app.hello', { name: 'Ana' })).toBe('Hello Ana');
    expect(i18n.t('shell.receive')).not.toBe('shell.receive');
  });

  test('markets and sale: mergeLocales(shellLocales) with one argument', () => {
    const i18n = createI18n({ locales: mergeLocales(shellLocales), fallback: 'en' });
    expect(typeof i18n.t('shell.receive')).toBe('string');
  });

  test('hashmark: getLanguage() and onChange(cb) returning an unsubscribe', () => {
    const i18n = createI18n({ locales: mergeLocales(shellLocales, appLocales), fallback: 'en' });
    expect(typeof i18n.getLanguage()).toBe('string');
    const off = i18n.onChange(() => {});
    expect(typeof off).toBe('function');
    off();
  });

  test('kids: SHELL_LANGUAGES is a list of {id, name, flag} it passes as `languages`', () => {
    expect(Array.isArray(SHELL_LANGUAGES)).toBe(true);
    for (const l of SHELL_LANGUAGES) expect(Object.keys(l).sort()).toEqual(['flag', 'id', 'name']);
  });
});

// ---- wallet: cool, game, kids, markets, sale, hashmark ----

describe('createWallet', () => {
  const MEMBERS = ['account', 'connect', 'disconnect', 'mode', 'onAccountChange', 'pay', 'signAndSend', 'signMessage'];

  test('cool, game, markets, sale: createWallet({ appName }) is a full Wallet', () => {
    const w = createWallet({ appName: 'nimiq.game' });
    for (const m of MEMBERS) expect([m, m in w]).toEqual([m, true]);
    expect(['hub', 'miniapp']).toContain(w.mode);
    const off = w.onAccountChange(() => {});
    expect(typeof off).toBe('function');
    off();
  });

  test('markets: a Wallet can be wrapped in a Proxy that swaps connect()', async () => {
    const base = createWallet({ appName: 'Nimiq Markets', mode: 'hub' });
    const wrapped: Wallet = new Proxy(base, {
      get(target, key, receiver) {
        if (key === 'connect') return () => Promise.resolve(null);
        return Reflect.get(target, key, receiver);
      },
    });
    expect(await wrapped.connect()).toBeNull();
    expect(wrapped.mode).toBe('hub');
    expect(wrapped.account).toBe(base.account);
  });

  test('kids: createWallet(opts, { miniApp: { getProvider, ...chain reads } })', () => {
    const w = createWallet(
      { appName: 'nimiq.kids', mode: 'miniapp' },
      { miniApp: { getProvider: () => new Promise<MiniAppProvider>(() => {}), readRpcHead: async () => 1, readAccount: async () => ({}) as never } },
    );
    expect(w.mode).toBe('miniapp');
  });

  test('kids: isMiniAppHost() is a boolean, false outside Nimiq Pay', () => {
    expect(isMiniAppHost()).toBe(false);
  });

  test('kids: new MiniAppBackend({ provider, ...chain reads }) has connect and signAndSend', () => {
    const b = new MiniAppBackend({ provider: {} as MiniAppProvider, readRpcHead: async () => 1 });
    expect(typeof b.connect).toBe('function');
    expect(typeof b.signAndSend).toBe('function');
  });
});

// ---- format: kids ----

test('kids: fmtFiat(value, currency, language) returns a string', () => {
  expect(typeof fmtFiat(12.5, 'USD', 'en')).toBe('string');
  expect(fmtFiat(12.5, 'USD', 'en')).toContain('12');
});

// ---- the corner control: cool, hashmark, kids, markets, sale ----

describe('mountMiniWallet / mountCornerControl', () => {
  const KEYS = ['document', 'HTMLElement', 'navigator', 'localStorage', 'getComputedStyle', 'window'] as const;
  let saved: Record<string, unknown> = {};
  let host: HTMLElement;

  beforeEach(() => {
    const w = new Window();
    saved = {};
    for (const k of KEYS) {
      saved[k] = (globalThis as Record<string, unknown>)[k];
      (globalThis as Record<string, unknown>)[k] = k === 'window' ? w : (w as unknown as Record<string, unknown>)[k];
    }
    host = w.document.createElement('div') as unknown as HTMLElement;
    w.document.body.appendChild(host as never);
  });
  afterEach(() => {
    for (const k of KEYS) (globalThis as Record<string, unknown>)[k] = saved[k];
  });

  const i18n = () => createI18n({ locales: mergeLocales(shellLocales), fallback: 'en' });
  const handleShape = (h: CornerControlHandle) => {
    expect(h.el).toBeTruthy();
    for (const m of ['open', 'close', 'destroy'] as const) expect([m, typeof h[m]]).toEqual([m, 'function']);
    expect('fiatTicker' in h).toBe(true);
  };

  test('sale and cool: mountMiniWallet(host, { wallet, i18n })', () => {
    const h = mountMiniWallet(host, { wallet: createWallet({ appName: 'nimiq.sale', mode: 'hub' }), i18n: i18n(), balance: false });
    handleShape(h);
    h.destroy();
  });

  test('markets: mountMiniWallet with onboard, a reportBug function and a theme', () => {
    const wallet = createWallet({ appName: 'Nimiq Markets', mode: 'hub' });
    const h = mountMiniWallet(host, { wallet, i18n: i18n(), onboard: () => void wallet.connect(), reportBug: () => {}, theme: undefined, balance: false });
    handleShape(h);
    h.destroy();
  });

  test('hashmark: mountCornerControl with a custom wallet, identicon, assets, receive, switchAccount: false', () => {
    const h = mountCornerControl(host, {
      wallet: hashmarkWallet,
      i18n: i18n(),
      identicon: () => document.createElement('div'),
      assets: noAssets,
      receive: true,
      switchAccount: false,
      reportBug: () => {},
    });
    handleShape(h);
    h.destroy();
  });

  test('kids: wallet-less, language-only corner with SHELL_LANGUAGES', () => {
    const h = mountCornerControl(host, { i18n: i18n(), languages: SHELL_LANGUAGES, reportBug: false });
    handleShape(h);
    h.destroy();
  });
});

// ---- bug reports: kids ----

describe('submitToBot + pageContext (kids)', () => {
  let realFetch: typeof fetch;
  beforeEach(() => { realFetch = globalThis.fetch; });
  afterEach(() => { globalThis.fetch = realFetch; });

  test('pageContext() is a plain object kids passes as input.pageContext', () => {
    const ctx = pageContext() as unknown as Record<string, unknown>;
    expect(typeof ctx).toBe('object');
    expect(typeof ctx.url).toBe('string');
  });

  test('submitToBot({ repo }, input) resolves { ok } after draft then file', async () => {
    const paths: string[] = [];
    globalThis.fetch = (async (url: string) => {
      paths.push(new URL(url).pathname);
      const body = url.endsWith('/api/draft')
        ? { reportId: 'r1', draft: { title: 'T', body: 'B', labels: [] } }
        : { ok: true, number: 1, url: 'https://github.com/x/y/issues/1' };
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
    }) as unknown as typeof fetch;
    const result = await submitToBot({ repo: 'nimiq.kids' }, kidsReport);
    expect(result.ok).toBe(true);
    expect(paths[0]).toBe('/api/draft');
  });
});
