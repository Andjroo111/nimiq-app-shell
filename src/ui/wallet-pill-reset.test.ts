// The wallet pill's Connect button after connect() returns. A connect that
// resolves null with no account change (a cancelled pick) used to leave the
// button disabled on "Connecting" for good; it now resets, as corner-control's does.
import { afterEach, beforeEach, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { createI18n } from '../i18n';
import { mergeLocales, shellLocales } from '../locales';
import type { Wallet } from '../wallet';
import { mountWalletPill } from './wallet-pill';

const KEYS = ['window', 'document', 'navigator', 'localStorage'] as const;
const g = globalThis as unknown as Record<string, unknown>;
let saved: Record<string, PropertyDescriptor | undefined> = {};
let w: Window;

beforeEach(() => {
  w = new Window({ url: 'https://app.example/' });
  saved = {};
  for (const k of KEYS) {
    saved[k] = Object.getOwnPropertyDescriptor(globalThis, k);
    Object.defineProperty(globalThis, k, { value: (w as unknown as Record<string, unknown>)[k], configurable: true, writable: true });
  }
});

afterEach(() => {
  for (const k of KEYS) {
    const d = saved[k];
    if (d) Object.defineProperty(globalThis, k, d);
    else delete g[k];
  }
  void w.happyDOM.close();
});

function mount(connect: () => Promise<null>) {
  const wallet = { account: null, connect, disconnect: () => {}, onAccountChange: () => () => {} } as unknown as Wallet;
  const host = w.document.createElement('div') as unknown as HTMLElement;
  const i18n = createI18n({ locales: mergeLocales(shellLocales), initial: 'en' });
  mountWalletPill(host, { wallet, i18n, injectStyles: false });
  return host.querySelector('.nq-connect') as HTMLButtonElement;
}

const flush = () => new Promise((r) => setTimeout(r, 0));

test('a connect that resolves null re-enables the button as "Connect wallet"', async () => {
  const btn = mount(async () => null);
  btn.click();
  expect(btn.disabled).toBe(true);
  await flush();
  expect(btn.disabled).toBe(false);
  expect(btn.textContent).toBe('Connect wallet');
});

test('a failed connect still re-enables the button as "Retry"', async () => {
  const btn = mount(async () => { throw new Error('closed'); });
  btn.click();
  await flush();
  expect(btn.disabled).toBe(false);
  expect(btn.textContent).toBe('Retry');
});
