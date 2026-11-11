// The mini wallet's "Other chains" section, through the real mount.
import { describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { mountMiniWallet } from './corner-control';
import { mountEvmSection } from './evm-section';
import { createEvmWallet, METAMASK_RDNS, type Eip1193Provider, type EvmWallet } from '../evm';
import { shellLocales, mergeLocales } from '../locales';
import { createI18n } from '../i18n';
import type { Wallet } from '../wallet';

const NIM_ADDRESS = 'NQ34 248H 8MB8 8QK2 5RVK EM8Q QJ8N 2Q5R 3XRK';
const ADDR = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
const ICON = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E';
const word = (n: bigint): string => `0x${n.toString(16).padStart(64, '0')}`;
const settle = (ms = 40) => new Promise((r) => setTimeout(r, ms));

function dom(): Window {
  const w = new Window();
  for (const key of ['document', 'HTMLElement', 'navigator', 'localStorage', 'getComputedStyle']) {
    (globalThis as unknown as Record<string, unknown>)[key] =
      (w as unknown as Record<string, unknown>)[key];
  }
  return w;
}

function nimWallet(connected: boolean, mode: 'hub' | 'miniapp' = 'hub'): Wallet {
  return {
    mode,
    account: connected ? { address: NIM_ADDRESS, label: 'Test' } : null,
    connect: async () => null,
    signAndSend: async () => ({ txHash: '' }),
    pay: async () => ({ txHash: '' }),
    signMessage: async () => ({ address: '', message: '', publicKeyHex: '', signatureHex: '' }),
    onAccountChange: () => () => {},
    disconnect: () => {},
  } as unknown as Wallet;
}

interface Scripted extends Eip1193Provider { calls: string[]; emit(event: string, ...args: unknown[]): void }
function provider(over: Record<string, () => unknown> = {}): Scripted {
  const handlers: Record<string, () => unknown> = {
    eth_requestAccounts: () => [ADDR],
    eth_accounts: () => [],
    eth_chainId: () => '0x89',
    eth_call: () => word(402_110_000n),
    ...over,
  };
  const listeners = new Map<string, Set<(...a: any[]) => void>>();
  const calls: string[] = [];
  return {
    calls,
    async request({ method }) {
      calls.push(method);
      const h = handlers[method];
      if (!h) throw new Error(`unhandled ${method}`);
      return h();
    },
    on(event, cb) { (listeners.get(event) ?? listeners.set(event, new Set()).get(event)!).add(cb); },
    removeListener(event, cb) { listeners.get(event)?.delete(cb); },
    emit(event, ...args) { for (const cb of [...(listeners.get(event) ?? [])]) cb(...args); },
  };
}

function announce(w: Window, p: Eip1193Provider, rdns = METAMASK_RDNS, name = 'MetaMask', icon: string | undefined = ICON): void {
  w.dispatchEvent(new w.CustomEvent('eip6963:announceProvider', {
    detail: { info: { rdns, name, icon }, provider: p },
  }) as never);
}

function setup(opts: { nim?: boolean; announced?: Scripted | null; planned?: [] } = {}) {
  const w = dom();
  const i18n = createI18n({ locales: mergeLocales(shellLocales), fallback: 'en', initial: 'en' });
  const evm = createEvmWallet({ win: w as unknown as globalThis.Window, planned: opts.planned });
  if (opts.announced) announce(w, opts.announced);
  const host = w.document.createElement('div') as unknown as HTMLElement;
  const handle = mountMiniWallet(host, { wallet: nimWallet(!!opts.nim), i18n, evm, balance: false, reportBug: false });
  const q = (sel: string) => host.querySelector(sel) as HTMLElement | null;
  const all = (sel: string) => [...host.querySelectorAll(sel)] as HTMLElement[];
  return { w, i18n, evm, host, handle, q, all };
}

describe('the mini wallet without the evm option', () => {
  test('renders no section, no label and no extra divider', () => {
    const w = dom();
    const i18n = createI18n({ locales: mergeLocales(shellLocales), fallback: 'en', initial: 'en' });
    const mount = (evm?: EvmWallet) => {
      const host = w.document.createElement('div') as unknown as HTMLElement;
      mountMiniWallet(host, { wallet: nimWallet(false), i18n, balance: false, reportBug: false, evm });
      return host;
    };
    const plain = mount();
    expect(plain.querySelector('.nq-cc-evm')).toBeNull();
    expect(plain.querySelector('.nq-cc-evm-label')).toBeNull();
    expect(plain.innerHTML).not.toContain('nq-cc-evm');
    expect(plain.textContent).not.toContain('Other chains');

    // The option adds exactly: the "Nimiq" label, the section, one divider.
    const withEvm = mount(createEvmWallet({ win: w as unknown as globalThis.Window }));
    const count = (host: HTMLElement, sel: string) => host.querySelectorAll(sel).length;
    expect(count(withEvm, '.nq-cc-view-main > *') - count(plain, '.nq-cc-view-main > *')).toBe(2);
    expect(count(withEvm, '.nq-cc-divider') - count(plain, '.nq-cc-divider')).toBe(1);
  });

  test('inside Nimiq Pay the option renders nothing: that WebView has no browser wallet', () => {
    const w = dom();
    const i18n = createI18n({ locales: mergeLocales(shellLocales), fallback: 'en', initial: 'en' });
    const host = w.document.createElement('div') as unknown as HTMLElement;
    mountMiniWallet(host, {
      wallet: nimWallet(true, 'miniapp'), i18n, balance: false, reportBug: false,
      evm: createEvmWallet({ win: w as unknown as globalThis.Window }),
    });
    expect(host.querySelector('.nq-cc-evm')).toBeNull();
  });
});

describe('signed out of EVM', () => {
  test('a MetaMask row with the wallet own icon, under the Nimiq connect, then the Soon rows', () => {
    const { q, all, host } = setup({ announced: provider() });
    expect(q('.nq-cc-evm .nq-cc-evm-label')?.textContent).toBe('Other chains');
    expect(q('.nq-cc-when-out .nq-cc-evm-label')?.textContent).toBe('Nimiq');

    const rows = all('.nq-cc-evm-wallets .nq-cc-evm-row');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.tagName).toBe('BUTTON');
    expect(rows[0]!.querySelector('.nq-cc-evm-name')?.textContent).toBe('MetaMask');
    expect(rows[0]!.querySelector('.nq-cc-evm-sub')?.textContent).toBe('USDC and USDT on Polygon');
    expect(rows[0]!.querySelector('.nq-cc-evm-pill')?.textContent).toBe('Connect');
    expect(rows[0]!.querySelector('img')?.getAttribute('src')).toBe(ICON);

    // Not buttons: a row that can do nothing must not look pressable.
    const soon = all('.nq-cc-evm-planned .nq-cc-evm-row');
    expect(soon.map((r) => r.tagName)).toEqual(['DIV', 'DIV']);
    expect(soon.map((r) => r.querySelector('.nq-cc-evm-name')?.textContent)).toEqual(['WalletConnect', 'Ledger']);
    expect(soon.map((r) => r.querySelector('.nq-cc-evm-pill')?.textContent)).toEqual(['Soon', 'Soon']);
    expect(soon.every((r) => r.querySelector('img') === null)).toBe(true);

    // In the menu between the Nimiq connect and the language picker.
    const kids = [...host.querySelector('.nq-cc-view-main')!.children];
    const at = (sel: string) => kids.findIndex((k) => k.matches(sel));
    expect(at('.nq-cc-evm')).toBeGreaterThan(at('.nq-cc-when-out'));
    expect(at('.nq-cc-evm')).toBeLessThan(kids.findIndex((k) => k.querySelector('.nq-cc-acc') !== null));
    expect(all('.nq-al-row')).toHaveLength(0);
  });

  test('every announced wallet gets a row by its own name, MetaMask first', () => {
    const { w, all } = setup({ planned: [] });
    announce(w, provider(), 'io.rabby', 'Rabby');
    announce(w, provider());
    expect(all('.nq-cc-evm-wallets .nq-cc-evm-name').map((n) => n.textContent)).toEqual(['MetaMask', 'Rabby']);
  });

  test('a bare window.ethereum shows the neutral glyph, never a drawn logo', () => {
    const w = dom();
    (w as unknown as { ethereum: Eip1193Provider }).ethereum = provider();
    const i18n = createI18n({ locales: mergeLocales(shellLocales), fallback: 'en', initial: 'en' });
    const host = w.document.createElement('div') as unknown as HTMLElement;
    mountMiniWallet(host, {
      wallet: nimWallet(false), i18n, balance: false, reportBug: false,
      evm: createEvmWallet({ win: w as unknown as globalThis.Window, planned: [] }),
    });
    const row = host.querySelector('.nq-cc-evm-wallets .nq-cc-evm-row')!;
    expect(row.querySelector('.nq-cc-evm-name')?.textContent).toBe('Browser wallet');
    expect(row.querySelector('img')).toBeNull();
    expect(row.querySelector('.nq-cc-evm-mark svg')).not.toBeNull();
  });

  test('no wallet on desktop: the row says to install MetaMask', () => {
    const { q } = setup({ planned: [] });
    const row = q('.nq-cc-evm-wallets .nq-cc-evm-row')!;
    expect(row.querySelector('.nq-cc-evm-name')?.textContent).toBe('MetaMask');
    row.click();
    expect(q('.nq-cc-evm-wallets .nq-cc-evm-sub')?.textContent).toBe('Install MetaMask, then reload');
  });

  test('no wallet on a phone: the row opens this page in the MetaMask app', () => {
    const w = dom();
    const i18n = createI18n({ locales: mergeLocales(shellLocales), fallback: 'en', initial: 'en' });
    const parent = w.document.createElement('div') as unknown as HTMLElement;
    const went: string[] = [];
    mountEvmSection(parent, {
      evm: createEvmWallet({ win: w as unknown as globalThis.Window }),
      i18n,
      glyph: '<svg></svg>',
      isMobile: () => true,
      navigate: (url) => went.push(url),
      location: { host: 'nimiq.markets', pathname: '/swap', search: '' },
    });
    (parent.querySelector('.nq-cc-evm-wallets .nq-cc-evm-row') as HTMLElement).click();
    expect(went).toEqual(['https://metamask.app.link/dapp/nimiq.markets/swap']);
    expect(parent.textContent).not.toContain('Install MetaMask');
  });

  test('closing the wallet prompt (4001) says Cancelled, without the error colour', async () => {
    const p = provider({ eth_requestAccounts: () => { throw Object.assign(new Error('no'), { code: 4001 }); } });
    const { q, evm } = setup({ announced: p });
    q('.nq-cc-evm-wallets .nq-cc-evm-row')!.click();
    await settle();
    const sub = q('.nq-cc-evm-wallets .nq-cc-evm-sub')!;
    expect(sub.textContent).toBe('Cancelled');
    expect(sub.hasAttribute('data-error')).toBe(false);
    expect(evm.account).toBeNull();
    expect((q('.nq-cc-evm-wallets .nq-cc-evm-row') as HTMLButtonElement).disabled).toBe(false);
  });

  test('any other failure says Could not connect, in the error colour', async () => {
    const p = provider({ eth_requestAccounts: () => { throw new Error('extension crashed'); } });
    const { q } = setup({ announced: p });
    q('.nq-cc-evm-wallets .nq-cc-evm-row')!.click();
    await settle();
    const sub = q('.nq-cc-evm-wallets .nq-cc-evm-sub')!;
    expect(sub.textContent).toBe('Could not connect');
    expect(sub.hasAttribute('data-error')).toBe(true);
  });
});

describe('connected to EVM', () => {
  for (const nim of [false, true]) {
    test(`short address, USDC and USDT balances, Disconnect (Nimiq ${nim ? 'connected' : 'signed out'})`, async () => {
      const { q, all, evm } = setup({ announced: provider(), nim });
      q('.nq-cc-evm-wallets .nq-cc-evm-row')!.click();
      await settle();

      expect(evm.account?.address).toBe(ADDR);
      const row = q('.nq-cc-evm-wallets .nq-cc-evm-row')!;
      expect(row.tagName).toBe('DIV');
      expect(row.querySelector('.nq-cc-evm-name')?.textContent).toBe('MetaMask');
      expect(row.querySelector('.nq-cc-evm-addr')?.textContent).toBe('0x71C7…976F');
      expect(row.querySelector('.nq-cc-evm-addr')?.getAttribute('title')).toBe(ADDR);
      expect(row.querySelector('img')?.getAttribute('src')).toBe(ICON);
      expect(q('.nq-cc-evm-disconnect')?.textContent).toBe('Disconnect');

      const rows = all('.nq-cc-evm-assets .nq-al-row');
      expect(rows.map((r) => r.querySelector('.nq-al-tick')?.textContent)).toEqual(['USDC', 'USDT']);
      expect(rows.map((r) => r.querySelector('.nq-al-name')?.textContent))
        .toEqual(['USD Coin · Polygon', 'Tether USD · Polygon']);
      expect(rows.map((r) => r.querySelector('.nq-al-units')?.textContent)).toEqual(['402.11', '402.11']);
      // The Soon rows stay; the other connect rows are gone.
      expect(all('.nq-cc-evm-planned .nq-cc-evm-row')).toHaveLength(2);
      expect(all('button.nq-cc-evm-row')).toHaveLength(0);
    });
  }

  test('a balance past 2^53 smallest units is shown exactly', async () => {
    const units = 2n ** 53n + 1n; // the first integer a Number cannot hold
    const { q, all } = setup({ announced: provider({ eth_call: () => word(units) }) });
    q('.nq-cc-evm-wallets .nq-cc-evm-row')!.click();
    await settle();
    const shown = all('.nq-cc-evm-assets .nq-al-units')[0]!.textContent!.replace(/\s/g, '');
    const digits = units.toString();
    expect(shown).toBe(`${digits.slice(0, -6)}.${digits.slice(-6)}`);
  });

  test('a wallet on the wrong chain keeps the dash instead of another chain balance', async () => {
    // Restored (no prompt, so no chain switch) while the wallet sits on Ethereum.
    const p = provider({ eth_accounts: () => [ADDR], eth_chainId: () => '0x1' });
    const { all, evm } = setup({ announced: p });
    await settle();
    expect(evm.account?.address).toBe(ADDR);
    expect(all('.nq-cc-evm-assets .nq-al-units').map((u) => u.textContent)).toEqual(['—', '—']);
    expect(p.calls).not.toContain('eth_call');
  });

  test('a returning visitor is restored silently at mount, with no prompt', async () => {
    const p = provider({ eth_accounts: () => [ADDR] });
    const { q } = setup({ announced: p });
    await settle();
    expect(q('.nq-cc-evm-addr')?.textContent).toBe('0x71C7…976F');
    expect(p.calls).not.toContain('eth_requestAccounts');
  });

  test('tapping USDC opens receive for THAT address with the Polygon warning, Nimiq signed out', async () => {
    const { q, all, host } = setup({ announced: provider() });
    q('.nq-cc-evm-wallets .nq-cc-evm-row')!.click();
    await settle();
    all('.nq-cc-evm-assets .nq-al-row')[0]!.click();
    await settle();
    expect(q('.nq-cc')?.classList.contains('nq-cc-show-receive')).toBe(true);
    expect(q('.nq-cc-address')?.textContent).toBe(ADDR);
    expect(q('.nq-cc-view-receive .nq-cc-view-title')?.textContent).toBe('Receive USDC');
    const warn = q('.nq-cc-net-warn')!;
    expect(warn.hasAttribute('hidden')).toBe(false);
    expect(warn.textContent).toBe('Send USDC on Polygon only. Coins sent on another network are lost.');
    expect(host.textContent).not.toContain('NQ34');
    // A Nimiq request link over a Polygon address is a link to nothing.
    expect((q('.nq-cc-request-open') as HTMLElement).hidden).toBe(true);
  });

  test('Disconnect returns to the connect row and closes an open EVM receive view', async () => {
    const { q, all, evm } = setup({ announced: provider() });
    q('.nq-cc-evm-wallets .nq-cc-evm-row')!.click();
    await settle();
    all('.nq-cc-evm-assets .nq-al-row')[1]!.click();
    await settle();
    q('.nq-cc-evm-disconnect')!.click();
    await settle();
    expect(evm.account).toBeNull();
    expect(q('.nq-cc')?.classList.contains('nq-cc-show-receive')).toBe(false);
    expect(q('.nq-cc-address')?.textContent).toBe('');
    expect(all('.nq-cc-evm-assets .nq-al-row')).toHaveLength(0);
    expect(q('button.nq-cc-evm-row .nq-cc-evm-pill')?.textContent).toBe('Connect');
  });

  test('switching account inside the wallet repaints the address and re-reads', async () => {
    const p = provider();
    const { q } = setup({ announced: p });
    q('.nq-cc-evm-wallets .nq-cc-evm-row')!.click();
    await settle();
    const reads = p.calls.filter((c) => c === 'eth_call').length;
    p.emit('accountsChanged', ['0x000000000000000000000000000000000000dEaD']);
    await settle();
    expect(q('.nq-cc-evm-addr')?.textContent).toBe('0x0000…dEaD');
    expect(p.calls.filter((c) => c === 'eth_call').length).toBe(reads + 2);
  });

  test('a language switch restates every string in the section', async () => {
    const { q, i18n } = setup({ announced: provider() });
    i18n.setLanguage('de');
    await settle();
    expect(q('.nq-cc-evm .nq-cc-evm-label')?.textContent).toBe('Andere Chains');
    expect(q('button.nq-cc-evm-row .nq-cc-evm-sub')?.textContent).toBe('USDC und USDT auf Polygon');
    expect(q('.nq-cc-evm-planned .nq-cc-evm-pill')?.textContent).toBe('Bald');
  });

  test('destroying the mini wallet leaves a host-owned EVM wallet connected', async () => {
    const { q, evm, handle, w } = setup({ announced: provider() });
    q('.nq-cc-evm-wallets .nq-cc-evm-row')!.click();
    await settle();
    // destroy() closes the menu, which touches window; lent for this call only
    // so it cannot leak into the files that run after this one.
    const g = globalThis as unknown as { window?: unknown };
    const had = 'window' in g;
    const prior = g.window;
    g.window = w;
    try { handle.destroy(); } finally { if (had) g.window = prior; else delete g.window; }
    expect(evm.account?.address).toBe(ADDR);
    expect(q('.nq-cc-evm')).toBeNull();
  });
});

describe('the section strings', () => {
  test('exist, translated, in every shipped locale', () => {
    const keys = ['shell.evmOtherChains', 'shell.evmSub', 'shell.evmConnect', 'shell.evmSoon',
      'shell.evmInstall', 'shell.evmCancelled', 'shell.evmFailed', 'shell.evmBrowserWallet',
      'shell.evmAnyMobile', 'shell.evmLedgerSub'];
    const en = shellLocales.en as Record<string, string>;
    for (const [locale, messages] of Object.entries(shellLocales)) {
      for (const key of keys) {
        const value = (messages as Record<string, string>)[key];
        expect(value, `${locale}:${key}`).toBeTruthy();
        if (locale !== 'en') expect(value, `${locale}:${key}`).not.toBe(en[key]);
        // Nimiq copy rule: no em or en dashes.
        expect(value, `${locale}:${key}`).not.toMatch(/[–—]/);
      }
      expect((messages as Record<string, string>)['shell.evmSub']).toContain('{network}');
    }
  });
});
