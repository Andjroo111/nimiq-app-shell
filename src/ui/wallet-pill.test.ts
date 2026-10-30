// The older pill pair: the wallet pill (connect / connected + dropdown) and the
// profile widget it hosts. Pinned: what each state renders, that a stale async
// result never overwrites a newer account, the menu's open and close paths, and
// that destroy() lets go of every listener. The menu toggle is pinned twice on
// purpose: an earlier teardown reset `menuOpen` and the dropdown could never open.
//
// happy-dom supplies the DOM. bun test shares one global object across files,
// so every global set here is put back after each test.
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { createI18n, type I18n } from '../i18n';
import { mergeLocales, shellLocales } from '../locales';
import type { Account, Wallet } from '../wallet';
import { mountProfileWidget } from './profile';
import { mountWalletPill } from './wallet-pill';

const A = 'NQ07 0000 68AR 5E5Q 0KE5 4C5T 8DH9 B4SH 6RH9';
const B = 'NQ45 78MF K2AA NREJ B39U YLRH C8B3 7S1X MH44';

const KEYS = ['window', 'document', 'navigator', 'localStorage'] as const;
const g = globalThis as unknown as Record<string, unknown>;
let saved: Record<string, PropertyDescriptor | undefined> = {};
let w: Window;
let host: HTMLElement;
let i18n: I18n;

beforeEach(() => {
  w = new Window({ url: 'https://app.example/' });
  saved = {};
  for (const k of KEYS) {
    saved[k] = Object.getOwnPropertyDescriptor(globalThis, k);
    Object.defineProperty(globalThis, k, { value: (w as unknown as Record<string, unknown>)[k], configurable: true, writable: true });
  }
  host = w.document.createElement('div') as unknown as HTMLElement;
  w.document.body.appendChild(host as never);
  i18n = createI18n({ locales: mergeLocales(shellLocales), initial: 'en' });
});

afterEach(() => {
  for (const k of KEYS) {
    const d = saved[k];
    if (d) Object.defineProperty(globalThis, k, d);
    else delete g[k];
  }
  void w.happyDOM.close();
});

/** A wallet whose account the test moves by hand, the way a backend would. */
function fakeWallet(start: Account | null = null, connect?: () => Promise<Account | null>) {
  const listeners = new Set<(a: Account | null) => void>();
  const calls: string[] = [];
  const wallet = {
    mode: 'hub',
    account: start,
    connect: async () => {
      calls.push('connect');
      return connect ? connect() : null;
    },
    disconnect: () => {
      calls.push('disconnect');
      set(null);
    },
    onAccountChange: (cb: (a: Account | null) => void) => (listeners.add(cb), () => listeners.delete(cb)),
  } as unknown as Wallet & { account: Account | null };
  function set(a: Account | null): void {
    wallet.account = a;
    listeners.forEach((l) => l(a));
  }
  return { wallet, set, calls, listeners };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('mountProfileWidget', () => {
  test('not connected: the placeholder, "Not connected", and no actions', () => {
    const { wallet } = fakeWallet();
    const h = mountProfileWidget(host, { wallet, i18n });
    expect(h.el.querySelector('.nq-profile__label')!.textContent).toBe('Not connected');
    expect(h.el.querySelector('.nq-profile__addr')).toBeNull();
    expect(h.el.querySelector('.nq-profile__actions')).toBeNull();
    expect((h.el.querySelector('img') as HTMLImageElement).src).toStartWith('data:image/svg+xml,');
  });

  test('connected: label, a short address with the full one in the title, both actions', () => {
    const { wallet } = fakeWallet({ address: A, label: 'Savings' });
    const h = mountProfileWidget(host, { wallet, i18n });
    expect(h.el.querySelector('.nq-profile__label')!.textContent).toBe('Savings');
    const addr = h.el.querySelector('.nq-profile__addr') as HTMLElement;
    expect(addr.textContent).toBe('NQ07 0000 68AR … 6RH9');
    expect(addr.title).toBe(A);
    expect([...h.el.querySelectorAll('.nq-profile__btn')].map((b) => b.textContent)).toEqual(['Copy address', 'Disconnect']);
  });

  test('an unlabelled account reads "Account"; short and unspaced addresses shorten their own way', () => {
    const { wallet, set } = fakeWallet({ address: 'NQ07ABCDEFGHJKLMNPQRS', label: '' });
    const h = mountProfileWidget(host, { wallet, i18n, showCopy: false, showDisconnect: false });
    expect(h.el.querySelector('.nq-profile__label')!.textContent).toBe('Account');
    expect(h.el.querySelector('.nq-profile__addr')!.textContent).toBe('NQ07ABCD…NPQRS');
    expect(h.el.querySelector('.nq-profile__actions')).toBeNull();
    set({ address: 'NQ07 SHORT', label: '' });
    expect(h.el.querySelector('.nq-profile__addr')!.textContent).toBe('NQ07 SHORT');
  });

  test('balance: an ellipsis, then the text; a failure clears it', async () => {
    const { wallet } = fakeWallet({ address: A, label: '' });
    const h = mountProfileWidget(host, { wallet, i18n, getBalance: () => '1,234.5 NIM' });
    expect(h.el.querySelector('.nq-profile__bal')!.textContent).toBe('…');
    await flush();
    expect(h.el.querySelector('.nq-profile__bal')!.textContent).toBe('1,234.5 NIM');
    h.destroy();

    const failing = mountProfileWidget(host, { wallet, i18n, getBalance: async () => { throw new Error('rpc down'); } });
    await flush();
    expect(failing.el.querySelector('.nq-profile__bal')!.textContent).toBe('');
  });

  test('a slow balance for the OLD account never lands on the new one', async () => {
    let releaseA!: (v: string) => void;
    const { wallet, set } = fakeWallet({ address: A, label: '' });
    const h = mountProfileWidget(host, {
      wallet, i18n,
      getBalance: (addr) => (addr === A ? new Promise<string>((r) => (releaseA = r)) : '2 NIM'),
    });
    set({ address: B, label: '' });
    await flush();
    releaseA('999 NIM');
    await flush();
    expect(h.el.querySelector('.nq-profile__bal')!.textContent).toBe('2 NIM');
  });

  test('a caller identicon replaces the img, sized by identiconSize', () => {
    const { wallet } = fakeWallet({ address: A, label: '' });
    const seen: Array<[string, number]> = [];
    const h = mountProfileWidget(host, {
      wallet, i18n, identiconSize: 32,
      identicon: (addr, px) => (seen.push([addr, px]), w.document.createElement('i') as unknown as HTMLElement),
    });
    expect(seen).toEqual([[A, 32]]);
    expect(h.el.querySelector('img')).toBeNull();
    expect((h.el.querySelector('.nq-profile__icon') as HTMLElement).style.width).toBe('32px');
  });

  test('copy writes the full address; disconnect calls the wallet', async () => {
    const written: string[] = [];
    Object.defineProperty(w.navigator, 'clipboard', { value: { writeText: async (t: string) => void written.push(t) }, configurable: true });
    const { wallet, calls } = fakeWallet({ address: A, label: '' });
    const h = mountProfileWidget(host, { wallet, i18n });
    const [copy, dc] = [...h.el.querySelectorAll('.nq-profile__btn')] as HTMLButtonElement[];
    copy!.click();
    await flush();
    expect(written).toEqual([A]);
    expect(copy!.textContent).toBe('Copied');
    dc!.click();
    expect(calls).toEqual(['disconnect']);
    expect(h.el.querySelector('.nq-profile__label')!.textContent).toBe('Not connected');
  });

  test('a blocked clipboard leaves the button as it was', async () => {
    Object.defineProperty(w.navigator, 'clipboard', { value: { writeText: async () => { throw new Error('denied'); } }, configurable: true });
    const { wallet } = fakeWallet({ address: A, label: '' });
    const h = mountProfileWidget(host, { wallet, i18n, showDisconnect: false });
    const copy = h.el.querySelector('.nq-profile__btn') as HTMLButtonElement;
    copy.click();
    await flush();
    expect(copy.textContent).toBe('Copy address');
  });

  test('a language change re-renders; refresh() re-renders; destroy stops both', () => {
    const { wallet, listeners } = fakeWallet({ address: A, label: '' });
    const h = mountProfileWidget(host, { wallet, i18n, injectStyles: false });
    i18n.setLanguage('de');
    const de = h.el.querySelector('.nq-profile__btn')!.textContent;
    expect(de).not.toBe('Copy address');
    h.refresh();
    expect(h.el.querySelector('.nq-profile__btn')!.textContent).toBe(de);
    h.destroy();
    expect(listeners.size).toBe(0);
    expect(host.contains(h.el)).toBe(false);
  });
});

describe('mountWalletPill', () => {
  const connectBtn = (root: Element) => root.querySelector('.nq-connect') as HTMLButtonElement;
  const pillBtn = (root: Element) => root.querySelector('.nq-wallet__btn') as HTMLButtonElement;

  test('disconnected: one Connect button, styles injected once', () => {
    const { wallet } = fakeWallet();
    const h = mountWalletPill(host, { wallet, i18n });
    mountWalletPill(host, { wallet, i18n });
    expect(connectBtn(h.el).textContent).toBe('Connect wallet');
    expect(w.document.querySelectorAll('#nimiq-shell-walletpill-style')).toHaveLength(1);
  });

  test('connect: Connecting while it runs, then the connected pill when the account arrives', async () => {
    const f = fakeWallet(null, async () => {
      const a = { address: A, label: '' };
      f.set(a);
      return a;
    });
    const h = mountWalletPill(host, { wallet: f.wallet, i18n });
    connectBtn(h.el).click();
    expect(f.calls).toEqual(['connect']);
    await flush();
    expect(connectBtn(h.el)).toBeNull();
    expect(pillBtn(h.el).textContent).toBe('NQ07 00…6RH9');
  });

  test('a failed connect re-enables the button as Retry', async () => {
    const { wallet } = fakeWallet(null, async () => { throw new Error('closed'); });
    const h = mountWalletPill(host, { wallet, i18n });
    connectBtn(h.el).click();
    expect(connectBtn(h.el).disabled).toBe(true);
    expect(connectBtn(h.el).textContent).toBe('Connecting');
    await flush();
    expect(connectBtn(h.el).disabled).toBe(false);
    expect(connectBtn(h.el).textContent).toBe('Retry');
  });

  test('the pill toggles a dropdown that hosts the profile widget', () => {
    const { wallet } = fakeWallet({ address: A, label: 'Main' });
    const h = mountWalletPill(host, { wallet, i18n });
    expect(pillBtn(h.el).textContent).toBe('Main');
    expect(pillBtn(h.el).getAttribute('aria-expanded')).toBe('false');
    pillBtn(h.el).click();
    expect(pillBtn(h.el).getAttribute('aria-expanded')).toBe('true');
    expect(h.el.querySelector('.nq-wallet__menu .nq-profile')).not.toBeNull();
    pillBtn(h.el).click();
    expect(h.el.querySelector('.nq-wallet__menu')).toBeNull();
  });

  test('an outside click and Escape each close it; an inside click does not', () => {
    const { wallet } = fakeWallet({ address: A, label: 'Main' });
    const h = mountWalletPill(host, { wallet, i18n });
    pillBtn(h.el).click();
    h.el.querySelector('.nq-profile__label')!.dispatchEvent(new w.MouseEvent('click', { bubbles: true }) as unknown as Event);
    expect(h.el.querySelector('.nq-wallet__menu')).not.toBeNull();
    w.document.body.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    expect(h.el.querySelector('.nq-wallet__menu')).toBeNull();

    pillBtn(h.el).click();
    w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Tab' }));
    expect(h.el.querySelector('.nq-wallet__menu')).not.toBeNull();
    w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape' }));
    expect(h.el.querySelector('.nq-wallet__menu')).toBeNull();
  });

  test('an account change closes the menu and relabels; disconnect inside it returns to Connect', () => {
    const { wallet, set } = fakeWallet({ address: A, label: 'Main' });
    const h = mountWalletPill(host, { wallet, i18n });
    pillBtn(h.el).click();
    set({ address: B, label: '' });
    expect(h.el.querySelector('.nq-wallet__menu')).toBeNull();
    expect(pillBtn(h.el).textContent).toBe('NQ45 78…MH44');
    pillBtn(h.el).click();
    const dc = [...h.el.querySelectorAll('.nq-profile__btn')].find((b) => b.textContent === 'Disconnect') as HTMLButtonElement;
    dc.click();
    expect(connectBtn(h.el).textContent).toBe('Connect wallet');
  });

  test('a caller identicon is used for the pill avatar', () => {
    const { wallet } = fakeWallet({ address: A, label: '' });
    const seen: number[] = [];
    const h = mountWalletPill(host, {
      wallet, i18n, injectStyles: false,
      identicon: (_a, px) => (seen.push(px), w.document.createElement('i') as unknown as HTMLElement),
    });
    expect(seen).toEqual([28]);
    expect(pillBtn(h.el).querySelector('img')).toBeNull();
  });

  test('language: re-renders the Connect label, leaves the connected pill alone', () => {
    const f = fakeWallet();
    const h = mountWalletPill(host, { wallet: f.wallet, i18n });
    i18n.setLanguage('de');
    expect(connectBtn(h.el).textContent).not.toBe('Connect wallet');
    f.set({ address: A, label: 'Main' });
    const pill = pillBtn(h.el);
    i18n.setLanguage('en');
    expect(pillBtn(h.el)).toBe(pill);
  });

  test('destroy removes it and lets go of the wallet', () => {
    const { wallet, listeners } = fakeWallet({ address: A, label: 'Main' });
    const h = mountWalletPill(host, { wallet, i18n });
    pillBtn(h.el).click();
    h.destroy();
    expect(host.contains(h.el)).toBe(false);
    expect(listeners.size).toBe(0);
  });
});
