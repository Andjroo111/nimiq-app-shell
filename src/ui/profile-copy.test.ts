// The profile widget's Copy button. Two ways it lied: with no Clipboard API it
// said "Copied" having copied nothing, and a second click inside the 1.2 s
// window read "Copied" back as the label to restore, so it stuck on "Copied".
import { afterEach, beforeEach, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { createI18n } from '../i18n';
import { mergeLocales, shellLocales } from '../locales';
import type { Wallet } from '../wallet';
import { mountProfileWidget } from './profile';

const A = 'NQ07 0000 68AR 5E5Q 0KE5 4C5T 8DH9 B4SH 6RH9';
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

function mountCopy(clipboard: unknown) {
  Object.defineProperty(w.navigator, 'clipboard', { value: clipboard, configurable: true });
  const wallet = {
    account: { address: A, label: '' },
    disconnect: () => {},
    onAccountChange: () => () => {},
  } as unknown as Wallet;
  const host = w.document.createElement('div') as unknown as HTMLElement;
  const i18n = createI18n({ locales: mergeLocales(shellLocales), initial: 'en' });
  const h = mountProfileWidget(host, { wallet, i18n, showDisconnect: false });
  return h.el.querySelector('.nq-profile__btn') as HTMLButtonElement;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

test('no Clipboard API: the button does not claim it copied', async () => {
  const copy = mountCopy(undefined);
  copy.click();
  await wait(0);
  expect(copy.textContent).toBe('Copy address');
});

test('a second click inside the window still returns to "Copy address"', async () => {
  const copy = mountCopy({ writeText: async () => {} });
  copy.click();
  await wait(0);
  expect(copy.textContent).toBe('Copied');
  await wait(600);
  copy.click();
  await wait(1300);
  expect(copy.textContent).toBe('Copy address');
});
