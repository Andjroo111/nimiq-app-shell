// Data pins for the corner control, plus a DOM block for the receive view.
//
// Most of this file pins data rather than rendering. The receive block is the
// exception and earns it: showing one asset's address under another asset's
// name is the one failure in this component that costs somebody money.
import { describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { FIAT_FLAGS, NATIVE_NAMES, addressGrid, mountMiniWallet, type CornerControlOptions, type ShellContact } from './corner-control';
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

  // Both are three-row blocks, which is what upstream keeps constant: NIM as
  // nine four-char cells in three columns, Polygon as three fourteens in one.
  // Neither wraps as a ragged string.
  test('each address renders as a three-row block', async () => {
    const { host } = mount();
    await settle();

    (host.querySelectorAll('.nq-al-row')[1] as HTMLElement).click();
    await settle();
    const polygonCells = host.querySelectorAll('.nq-cc-address span');
    expect(polygonCells).toHaveLength(3);
    expect([...polygonCells].map((c) => c.textContent).join(''))
      .toBe('0x71C7656EC7ab88b098defB751B7401B5f6d8976F');

    (host.querySelectorAll('.nq-al-row')[0] as HTMLElement).click();
    await settle();
    const nimCells = host.querySelectorAll('.nq-cc-address span');
    expect(nimCells).toHaveLength(9);
    expect([...new Set([...nimCells].map((c) => c.textContent?.length))]).toEqual([4]);
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

describe('switching account drops the previous account money', () => {
  const A = 'NQ34 248H 8MB8 8QK2 5RVK EM8Q QJ8N 2Q5R 3XRK';
  const B = 'NQ21 8LNC MJD3 D7T4 8FSX N5M8 5V2M A9GY 4KUJ';

  function mount(
    read: () => Promise<bigint> = async () => 4_218_37500n,
    extra: Partial<CornerControlOptions> = {},
  ) {
    const w = new Window();
    for (const key of ['document', 'HTMLElement', 'navigator', 'localStorage', 'getComputedStyle', 'window']) {
      (globalThis as unknown as Record<string, unknown>)[key] =
        (w as unknown as Record<string, unknown>)[key];
    }
    const i18n = createI18n({ locales: mergeLocales(shellLocales), fallback: 'en' });
    let account: { address: string; label: string } | null = { address: A, label: 'A' };
    const listeners = new Set<(a: unknown) => void>();
    const wallet = {
      mode: 'hub',
      get account() { return account; },
      connect: async () => { account = { address: B, label: 'B' }; for (const l of listeners) l(account); return account; },
      signAndSend: async () => ({ txHash: '' }),
      pay: async () => ({ txHash: 'ok' }),
      signMessage: async () => ({ address: '', message: '', publicKeyHex: '', signatureHex: '' }),
      onAccountChange: (cb: (a: unknown) => void) => { listeners.add(cb); return () => listeners.delete(cb); },
      disconnect: () => { account = null; for (const l of listeners) l(null); },
    } as unknown as Wallet;
    const host = w.document.createElement('div') as unknown as HTMLElement;
    mountMiniWallet(host, {
      wallet,
      i18n,
      assets: [{ ticker: 'NIM', name: 'Nimiq', network: 'Nimiq', decimals: 5,
        address: A, balance: read }],
      ...extra,
    });
    return { host, wallet };
  }
  const settle = () => new Promise((r) => setTimeout(r, 50));

  // The bug this closes: the balance rows keep their last value on purpose (a
  // flaky RPC must not blank a real balance), which across an account switch
  // means showing one account's money under another account's name.
  //
  // The second account's read is held open so the WINDOW between the switch and
  // the new figure is observable. That window is the whole bug: without the
  // clear it shows the previous account's balance, confidently.
  test('the previous balance does not survive the switch', async () => {
    let releaseSecondRead: (v: bigint) => void = () => {};
    let readCount = 0;
    const { host, wallet } = mount(() => {
      readCount += 1;
      if (readCount === 1) return Promise.resolve(4_218_37500n);
      return new Promise<bigint>((resolve) => { releaseSecondRead = resolve; });
    });
    await settle();
    expect(host.querySelector('.nq-al-units')?.textContent).toContain('4');

    await wallet.connect();
    await settle();
    const during = host.querySelector('.nq-al-units');
    expect(during?.textContent).toBe('—');
    expect(during?.className).toContain('nq-al-pending');

    releaseSecondRead(11_100000n);
    await settle();
    expect(host.querySelector('.nq-al-units')?.textContent).toContain('11');
  });

  // A receive screen left open after a switch would be showing the previous
  // account's address, which is where money arrives.
  test('an open receive screen closes on the switch', async () => {
    const { host, wallet } = mount();
    await settle();
    (host.querySelectorAll('.nq-al-row')[0] as HTMLElement).click();
    await settle();
    expect(host.querySelector('.nq-cc')?.className).toContain('nq-cc-show-receive');
    await wallet.connect();
    await settle();
    expect(host.querySelector('.nq-cc')?.className).not.toContain('nq-cc-show-receive');
  });

  // Hashmark's wallet is an adapter over a betting key, where connect() means
  // "set up betting" and can route to onboarding. Offering that as "Switch
  // account" describes an action the app does not have.
  test('switchAccount:false removes the row without touching Disconnect', async () => {
    const { host } = mount(undefined, { switchAccount: false });
    await settle();
    const labels = [...host.querySelectorAll('.nq-cc-row')].map((r) => r.textContent);
    expect(labels.some((l) => l?.includes('Switch account'))).toBe(false);
    expect(host.querySelector('.nq-cc-disconnect')?.textContent).toBe('Disconnect');
  });

  test('the switch row exists and is not the disconnect', async () => {
    const { host } = mount();
    await settle();
    const labels = [...host.querySelectorAll('.nq-cc-row')].map((r) => r.textContent);
    expect(labels.some((l) => l?.includes('Switch account'))).toBe(true);
    expect(host.querySelector('.nq-cc-disconnect')?.textContent).toBe('Disconnect');
  });
});

describe('saved recipients', () => {
  const A = 'NQ34 248H 8MB8 8QK2 5RVK EM8Q QJ8N 2Q5R 3XRK';
  const CONTACTS: ShellContact[] = [
    { label: 'Mum', address: 'NQ21 8LNC MJD3 D7T4 8FSX N5M8 5V2M A9GY 4KUJ' },
    { label: 'Polygon till', address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', asset: 'USDT' },
  ];

  function mount(contacts?: CornerControlOptions['contacts']) {
    const w = new Window();
    for (const key of ['document', 'HTMLElement', 'navigator', 'localStorage', 'getComputedStyle', 'window']) {
      (globalThis as unknown as Record<string, unknown>)[key] =
        (w as unknown as Record<string, unknown>)[key];
    }
    const i18n = createI18n({ locales: mergeLocales(shellLocales), fallback: 'en' });
    const wallet = {
      mode: 'hub',
      account: { address: A, label: 'A' },
      connect: async () => null,
      signAndSend: async () => ({ txHash: '' }),
      pay: async () => ({ txHash: 'ok' }),
      signMessage: async () => ({ address: '', message: '', publicKeyHex: '', signatureHex: '' }),
      onAccountChange: () => () => {},
      disconnect: () => {},
    } as unknown as Wallet;
    const host = w.document.createElement('div') as unknown as HTMLElement;
    mountMiniWallet(host, { wallet, i18n, getBalanceLuna: async () => 100_000_000, contacts });
    return host;
  }
  const settle = () => new Promise((r) => setTimeout(r, 50));
  const openSend = async (host: HTMLElement) => {
    (host.querySelector('.nq-cc-send') as HTMLElement).click();
    await settle();
  };

  test('no contacts wired renders no chips', async () => {
    const host = mount();
    await openSend(host);
    expect((host.querySelector('.nq-cc-contacts') as HTMLElement)?.hidden).toBe(true);
  });

  // Offering a Polygon address while sending NIM is offering a mistake.
  test('only contacts for the asset being sent are offered', async () => {
    const host = mount({ list: () => CONTACTS });
    await openSend(host);
    const chips = [...host.querySelectorAll('.nq-cc-contact')].map((c) => c.textContent);
    expect(chips).toContain('Mum');
    expect(chips).not.toContain('Polygon till');
  });

  // Picking fills the field rather than bypassing it, so the address stays
  // visible and checkable before the send is confirmed.
  test('picking a contact fills the recipient field', async () => {
    const host = mount({ list: () => CONTACTS });
    await openSend(host);
    (host.querySelector('.nq-cc-contact') as HTMLElement).click();
    await settle();
    expect((host.querySelector('.nq-cc-input-addr') as HTMLInputElement).value)
      .toBe(CONTACTS[0]!.address);
  });

  // A send view that refuses to open because the host address book threw is
  // worse than one with no chips.
  test('a throwing contacts read still opens the send view', async () => {
    const host = mount({ list: () => { throw new Error('store offline'); } });
    await openSend(host);
    expect(host.querySelector('.nq-cc')?.className).toContain('nq-cc-show-send');
    expect((host.querySelector('.nq-cc-contacts') as HTMLElement)?.hidden).toBe(true);
  });
});

describe('an asset without its own address cannot open receive', () => {
  const NIM = 'NQ34 248H 8MB8 8QK2 5RVK EM8Q QJ8N 2Q5R 3XRK';

  function mount() {
    const w = new Window();
    for (const key of ['document', 'HTMLElement', 'navigator', 'localStorage', 'getComputedStyle', 'window']) {
      (globalThis as unknown as Record<string, unknown>)[key] =
        (w as unknown as Record<string, unknown>)[key];
    }
    const i18n = createI18n({ locales: mergeLocales(shellLocales), fallback: 'en' });
    const wallet = {
      mode: 'hub',
      account: { address: NIM, label: 'Betting' },
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
          address: NIM, balance: async () => 1n },
        // Hashmark's real shape: the EVM key is not derived until a bet flow
        // runs, so this row carries no address for most of a session.
        { ticker: 'USDT', name: 'Tether USD', network: 'Polygon', decimals: 6,
          balance: async () => 1n },
      ],
    });
    return host;
  }
  const settle = () => new Promise((r) => setTimeout(r, 40));

  // The money-loss path. Falling back to the account address printed "Send USDT
  // on Polygon only" over a NIM address, and the warning made that pairing read
  // as deliberate rather than as a bug.
  test('the row is not activatable, so it cannot show another chain address', async () => {
    const host = mount();
    await settle();
    const rows = host.querySelectorAll('.nq-al-row');
    expect(rows[0]?.tagName).toBe('BUTTON');   // NIM has its own address
    expect(rows[1]?.tagName).toBe('DIV');      // USDT does not
    (rows[1] as HTMLElement).click();
    await settle();
    expect(host.querySelector('.nq-cc')?.className).not.toContain('nq-cc-show-receive');
  });

  // Second guard on the same hazard, for a host calling the view directly.
  test('the row becomes activatable once the address exists', async () => {
    const w = new Window();
    for (const key of ['document', 'HTMLElement', 'navigator', 'localStorage', 'getComputedStyle', 'window']) {
      (globalThis as unknown as Record<string, unknown>)[key] =
        (w as unknown as Record<string, unknown>)[key];
    }
    const i18n = createI18n({ locales: mergeLocales(shellLocales), fallback: 'en' });
    let evmAddress: string | undefined;
    const wallet = {
      mode: 'hub',
      account: { address: NIM, label: 'Betting' },
      connect: async () => null,
      signAndSend: async () => ({ txHash: '' }),
      pay: async () => ({ txHash: '' }),
      signMessage: async () => ({ address: '', message: '', publicKeyHex: '', signatureHex: '' }),
      onAccountChange: () => () => {},
      disconnect: () => {},
    } as unknown as Wallet;
    const host = w.document.createElement('div') as unknown as HTMLElement;
    const handle = mountMiniWallet(host, {
      wallet,
      i18n,
      assets: () => [
        { ticker: 'USDT', name: 'Tether USD', network: 'Polygon', decimals: 6,
          address: evmAddress, balance: async () => 1n },
      ],
    });
    await settle();
    expect(host.querySelector('.nq-al-row')?.tagName).toBe('DIV');

    evmAddress = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
    handle.open();
    await settle();
    expect(host.querySelector('.nq-al-row')?.tagName).toBe('BUTTON');
  });
});

describe('address grid', () => {
  const NIM = 'NQ34248H8MB88QK25RVKEM8QQJ8N2Q5R3XRK';           // 36
  const EVM = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';     // 42
  const P2WPKH = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';  // 42
  const P2TR = 'bc1p5cyxnuxmeuwuvkwfem96l0bqtnhh0hxk8x8gu9v0nc4jqhq8fq3q9k5cxn'; // 62
  const LEGACY = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';          // 34
  const ALL = [NIM, EVM, P2WPKH, P2TR, LEGACY];

  // THE invariant, and the one upstream gets wrong. These cells are
  // concatenated back into an address people send money to, so a dropped
  // character is a lost payment that looks perfectly tidy on screen.
  test('the cells always rejoin to exactly the original address', () => {
    for (const address of ALL) {
      expect(addressGrid(address).cells.join(''), address).toBe(address);
    }
  });

  // The registry does address.match(/.{14}/g), which returns only whole
  // 14-character groups and silently discards the tail. A 34-character legacy
  // BTC address renders as 28. This is the case that proves we do not.
  test('a length that is not a multiple of 14 keeps every character', () => {
    const cells = addressGrid(LEGACY).cells;
    expect(cells.join('')).toBe(LEGACY);
    expect(cells.join('').length).toBe(34);
    expect(LEGACY.match(/.{14}/g)!.join('').length).toBe(28); // what upstream would show
  });

  // The block is always three ROWS. That is what upstream keeps constant
  // between its nimiq and ethereum formats, and it is what makes a NIM address
  // and a Polygon one read as siblings at the same height.
  test('every address is three rows', () => {
    for (const address of ALL) {
      const { cells, columns } = addressGrid(address);
      expect(cells.length / columns, address).toBe(3);
    }
  });

  // The wallet ships a 3x3 of four-character blocks for NIM. Changing that
  // would be a visible regression in every app on the shell.
  test('a NIM address is still nine four-character blocks in three columns', () => {
    const { cells, columns } = addressGrid(NIM);
    expect(cells).toHaveLength(9);
    expect(columns).toBe(3);
    expect([...new Set(cells.map((c) => c.length))]).toEqual([4]);
  });

  // 42 characters in three rows of fourteen, one column: upstream's
  // format-ethereum verbatim, which is the point.
  test('a 42-character address matches the upstream ethereum split', () => {
    for (const address of [EVM, P2WPKH]) {
      const { cells, columns } = addressGrid(address);
      expect(columns, address).toBe(1);
      expect(cells, address).toEqual(address.match(/.{14}/g)!);
    }
  });

  // Rows within one character of each other read as even. A wider spread does
  // not, and neither does a short orphan final row.
  test('row lengths never differ by more than one', () => {
    for (const address of ALL) {
      const { cells, columns } = addressGrid(address);
      const rows: number[] = [];
      for (let i = 0; i < cells.length; i += columns) {
        rows.push(cells.slice(i, i + columns).join('').length);
      }
      expect(Math.max(...rows) - Math.min(...rows), address).toBeLessThanOrEqual(1);
    }
  });

  test('spaces in the input do not become cells', () => {
    expect(addressGrid('NQ34 248H 8MB8 8QK2 5RVK EM8Q QJ8N 2Q5R 3XRK').cells.join(''))
      .toBe(NIM);
  });

  test('an empty address yields no cells', () => {
    expect(addressGrid('').cells).toEqual([]);
  });
});
