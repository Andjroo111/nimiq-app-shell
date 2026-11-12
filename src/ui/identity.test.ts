// Identity-only connected mode (`identity`): an account with no Nimiq address
// the shell may show or act on (nimiq.ninja's stealth meta-address). Stubs the
// GLOBAL fetch, like history-view.test.ts, and asserts it is never called.
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { mountMiniWallet, type CornerControlOptions } from './corner-control';
import { createI18n } from '../i18n';
import { mergeLocales, shellLocales } from '../locales';
import type { Account, Wallet } from '../wallet';

const META = 'nqstealth:1:q8vnc7m2k4x9pz3rt6wy5hj0dfa1bse8ulg4oicv2nmkx7rtq9p';

const KEYS = ['window', 'document', 'HTMLElement', 'navigator', 'localStorage', 'getComputedStyle', 'Event'] as const;
let saved: Record<string, unknown> = {};
let realFetch: typeof fetch;
/** Every request the page made, by URL. Identity mode must make none. */
let requests: string[] = [];

beforeEach(() => {
  const w = new Window();
  saved = {};
  for (const k of KEYS) {
    saved[k] = (globalThis as Record<string, unknown>)[k];
    (globalThis as Record<string, unknown>)[k] = (w as unknown as Record<string, unknown>)[k] ?? saved[k];
  }
  realFetch = globalThis.fetch;
  requests = [];
  globalThis.fetch = (async (url: string) => {
    requests.push(String(url));
    return { ok: true, status: 200, json: async () => ({ result: { data: null } }) } as Response;
  }) as unknown as typeof fetch;
});
afterEach(() => {
  for (const k of KEYS) (globalThis as Record<string, unknown>)[k] = saved[k];
  globalThis.fetch = realFetch;
});

const settle = (ms = 30) => new Promise((r) => setTimeout(r, ms));

interface FakeWallet extends Wallet {
  set(next: Account | null): void;
  disconnects: number;
}

function fakeWallet(account: Account | null): FakeWallet {
  const listeners: Array<(a: Account | null) => void> = [];
  const w = {
    mode: 'hub',
    account,
    disconnects: 0,
    connect: async () => null,
    signAndSend: async () => ({ txHash: '' }),
    pay: async () => ({ txHash: 'x' }),
    signMessage: async () => ({ address: '', message: '', publicKeyHex: '', signatureHex: '' }),
    onAccountChange: (fn: (a: Account | null) => void) => {
      listeners.push(fn);
      return () => {};
    },
    disconnect: () => { w.disconnects += 1; },
    set(next: Account | null) {
      w.account = next;
      for (const fn of listeners) fn(next);
    },
  };
  return w as unknown as FakeWallet;
}

/** Every reader seam and every network-shaped option set ON, with spies, so a
 *  test proves identity wins over all of them rather than over the defaults. */
function hostile() {
  const calls: string[] = [];
  const opts: Partial<CornerControlOptions> = {
    balance: { rpc: 'https://rpc.example' },
    getBalanceLuna: async () => { calls.push('balance'); return 5; },
    getStakedLuna: async () => { calls.push('staked'); return 5; },
    history: { fetch: async () => { calls.push('history'); return []; } },
    assets: () => {
      calls.push('assets');
      return [{ ticker: 'NIM', network: 'Nimiq', decimals: 5, address: META, balance: async () => { calls.push('asset-read'); return 1n; } }];
    },
    names: {},
    evm: true,
    fiat: { currencies: ['USD', 'EUR'], rate: async () => { calls.push('rate'); return 1; } },
    contacts: { list: () => { calls.push('contacts'); return []; } },
    scan: () => { calls.push('scan'); },
    createCashlink: () => { calls.push('cashlink'); },
    reportBug: false,
  };
  return { calls, opts };
}

function mount(account: Account | null, opts: Partial<CornerControlOptions> = {}) {
  const i18n = createI18n({ locales: mergeLocales(shellLocales), fallback: 'en', initial: 'en' });
  const host = document.createElement('div');
  document.body.appendChild(host);
  const wallet = fakeWallet(account);
  const handle = mountMiniWallet(host, { wallet, i18n, ...opts });
  return { host, handle, wallet, i18n };
}

const q = (host: HTMLElement, sel: string) => host.querySelector(sel) as HTMLElement | null;

describe('identity mode, connected', () => {
  test('shows the label and the host rows; a row calls onSelect and closes the menu', async () => {
    const picked: string[] = [];
    const { host, handle } = mount({ address: META, label: 'ninja-7' }, {
      identity: {
        rows: [
          { label: 'Back up phrase', onSelect: () => picked.push('backup') },
          { label: 'Stealth inbox', onSelect: () => picked.push('inbox') },
        ],
      },
    });
    expect(handle.el.hasAttribute('data-identity')).toBe(true);
    expect(handle.el.hasAttribute('data-connected')).toBe(true);
    expect(q(host, '.nq-cc-face-label')!.textContent).toBe('ninja-7');
    expect(q(host, '.nq-cc-name')!.textContent).toBe('ninja-7');

    handle.open();
    const rows = [...host.querySelectorAll('.nq-cc-identity-rows .nq-cc-row')] as HTMLElement[];
    expect(rows.map((r) => r.textContent)).toEqual(['Back up phrase', 'Stealth inbox']);
    rows[1]!.click();
    expect(picked).toEqual(['inbox']);
    expect(q(host, '.nq-cc-menu')!.hidden).toBe(true);
  });

  test('identity: true works with no rows, and a missing label reads "Account"', () => {
    const { host } = mount({ address: META, label: '' }, { identity: true });
    expect(q(host, '.nq-cc-face-label')!.textContent).toBe('Account');
    expect(q(host, '.nq-cc-name')!.textContent).toBe('Account');
    expect(q(host, '.nq-cc-identity-rows')).toBeNull();
  });

  test('no balance, receive, send, scan, history, contacts, other chains or fiat grid is on the page', async () => {
    const { calls, opts } = hostile();
    const { host, handle } = mount({ address: META, label: 'ninja-7' }, { ...opts, identity: true });
    handle.open();
    await settle();
    for (const sel of [
      '.nq-cc-actions', '.nq-cc-receive', '.nq-cc-send', '.nq-cc-scan',
      '.nq-cc-view-receive', '.nq-cc-view-qr', '.nq-cc-view-request', '.nq-cc-view-sendto', '.nq-cc-view-send',
      '.nq-cc-recent', '.nq-cc-view-history', '.nq-cc-view-txdetail',
      '.nq-cc-contact', '.nq-al', '[class*="nq-cc-evm"]', '.nq-cc-cols-3',
      '.nq-cc-cashlink-slot', 'input',
    ]) {
      expect({ sel, found: !!q(host, sel) }).toEqual({ sel, found: false });
    }
    expect(q(host, '.nq-cc-balance')!.hidden).toBe(true);
    expect(q(host, '.nq-cc-balance-staked')!.hidden).toBe(true);
    // The name is not a rename button, and no placeholder hexagon stands in
    // for an identicon the host did not pass.
    expect(q(host, '.nq-cc-name')!.tagName).toBe('SPAN');
    expect(q(host, '.nq-cc-identicon')!.hidden).toBe(true);
    expect(q(host, '.nq-cc-identicon')!.innerHTML).toBe('');
    expect(q(host, '.nq-cc-face-icon')).toBeNull();
    expect(handle.fiatTicker).toBeNull();
    // Language and Disconnect are still there.
    expect(q(host, '.nq-cc-acc')!.textContent).toContain('Language');
    expect(q(host, '.nq-cc-disconnect')).not.toBeNull();
    expect(calls).toEqual([]);
  });

  test('the address never reaches the page, in text or in markup', async () => {
    const { opts } = hostile();
    for (const account of [{ address: META, label: 'ninja-7' }, { address: META, label: '' }]) {
      document.body.textContent = '';
      const { host, handle } = mount(account, { ...opts, identity: { rows: [{ label: 'Inbox', onSelect: () => {} }] } });
      handle.open();
      await settle();
      expect(host.textContent).not.toContain(META.slice(0, 7));
      expect(host.textContent).not.toContain(META.slice(-4));
      expect(host.innerHTML).not.toContain(META.slice(-8));
      expect(q(host, '[data-address]')).toBeNull();
      handle.destroy();
    }
  });

  test('the host identicon is still called when wired, and only then', () => {
    const seeds: string[] = [];
    const identicon = (address: string, size: number) => {
      seeds.push(`${address}@${size}`);
      return document.createElement('i');
    };
    const { host } = mount({ address: META, label: 'ninja-7' }, { identity: true, identicon });
    expect(seeds).toEqual([`${META}@28`, `${META}@68`]);
    expect(q(host, '.nq-cc-face-icon > i')).not.toBeNull();
    expect(q(host, '.nq-cc-identicon')!.hidden).toBe(false);
  });

  test('zero network requests, whatever the other options ask for', async () => {
    const { opts } = hostile();
    const { handle, wallet } = mount({ address: META, label: 'ninja-7' }, { ...opts, identity: true });
    handle.open();
    await settle(60);
    handle.close();
    wallet.set({ address: `${META}x`, label: 'other' });
    handle.open();
    await settle(60);
    expect(requests).toEqual([]);
  });

  test('Disconnect calls wallet.disconnect', () => {
    const { host, handle, wallet } = mount({ address: META, label: 'ninja-7' }, { identity: true });
    handle.open();
    q(host, '.nq-cc-disconnect')!.click();
    expect(wallet.disconnects).toBe(1);
  });

  test('the default built-in reads (no host seams) make no request either', async () => {
    const { handle } = mount({ address: META, label: 'ninja-7' }, { identity: true, history: true, reportBug: false });
    handle.open();
    await settle(60);
    expect(requests).toEqual([]);
  });

  test('a conflicting option does not throw', () => {
    const { opts } = hostile();
    expect(() => mount({ address: META, label: '' }, { ...opts, identity: true, switchAccount: true, receive: true })).not.toThrow();
  });
});

describe('identity mode, signed out and switching', () => {
  test('signed out it is the ordinary Connect wallet control', () => {
    const { host, handle } = mount(null, { identity: { rows: [{ label: 'Inbox', onSelect: () => {} }] } });
    expect(handle.el.hasAttribute('data-connected')).toBe(false);
    expect(handle.el.hasAttribute('data-identity')).toBe(false);
    expect(q(host, '.nq-cc-face')!.textContent).toBe('Connect wallet');
    expect(q(host, '.nq-cc-connect')!.textContent).toBe('Connect wallet');
    expect(handle.el.dataset.mode).toBe('hub');
  });

  test('account changes switch between the two states live', () => {
    const { host, handle, wallet } = mount(null, { identity: true });
    wallet.set({ address: META, label: 'ninja-7' });
    expect(handle.el.hasAttribute('data-identity')).toBe(true);
    expect(q(host, '.nq-cc-face-label')!.textContent).toBe('ninja-7');
    expect(q(host, '.nq-cc-name')!.textContent).toBe('ninja-7');
    wallet.set(null);
    expect(handle.el.hasAttribute('data-identity')).toBe(false);
    expect(handle.el.hasAttribute('data-connected')).toBe(false);
    expect(q(host, '.nq-cc-face')!.textContent).toBe('Connect wallet');
    expect(host.textContent).not.toContain(META.slice(-4));
  });
});
