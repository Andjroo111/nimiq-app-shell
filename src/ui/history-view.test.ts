// The account row's spendable/staked split and the transaction history, as
// mounted in the corner. Stubs the GLOBAL fetch everywhere a built-in read can
// run: a test that forgets this makes a live request to the public node.
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { mountMiniWallet, type CornerControlOptions } from './corner-control';
import { counterpartyLabel, shortTxAddress, signedTxAmount } from './history-view';
import { createI18n } from '../i18n';
import { mergeLocales, shellLocales } from '../locales';
import type { Wallet } from '../wallet';
import type { ShellTx } from '../history/chain';

const ME = 'NQ53 VN1C MLA8 YNXD 7HR1 CDYK DHHF GN7Q 714B';
const MUM = 'NQ21 8LNC MJD3 D7T4 8FSX N5M8 5V2M A9GY 4KUJ';
const STRANGER = 'NQ60 S8EH 3NNG K591 C4U9 CJQ4 83RD 108N BC4L';
const HASH = (n: number) => n.toString(16).padStart(2, '0').repeat(32);

const KEYS = ['window', 'document', 'HTMLElement', 'navigator', 'localStorage', 'getComputedStyle', 'Event'] as const;
let saved: Record<string, unknown> = {};
let realFetch: typeof fetch;
/** Every JSON-RPC method the built-in readers sent, in order. */
let methods: string[] = [];
let rpcReply: (method: string) => unknown = () => ({ result: { data: null } });

beforeEach(() => {
  const w = new Window();
  saved = {};
  for (const k of KEYS) {
    saved[k] = (globalThis as Record<string, unknown>)[k];
    (globalThis as Record<string, unknown>)[k] = (w as unknown as Record<string, unknown>)[k] ?? saved[k];
  }
  realFetch = globalThis.fetch;
  methods = [];
  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    const method = JSON.parse(String(init?.body ?? '{}')).method as string;
    methods.push(method);
    return { ok: true, status: 200, json: async () => rpcReply(method) } as Response;
  }) as unknown as typeof fetch;
});
afterEach(() => {
  for (const k of KEYS) (globalThis as Record<string, unknown>)[k] = saved[k];
  globalThis.fetch = realFetch;
});

const settle = (ms = 30) => new Promise((r) => setTimeout(r, ms));

function wallet(mode: 'hub' | 'miniapp' = 'hub'): Wallet {
  return {
    mode,
    account: { address: ME, label: 'Me' },
    connect: async () => null,
    signAndSend: async () => ({ txHash: '' }),
    pay: async () => ({ txHash: 'x' }),
    signMessage: async () => ({ address: '', message: '', publicKeyHex: '', signatureHex: '' }),
    onAccountChange: () => () => {},
    disconnect: () => {},
  } as unknown as Wallet;
}

function mount(opts: Partial<CornerControlOptions> = {}, mode: 'hub' | 'miniapp' = 'hub') {
  const i18n = createI18n({ locales: mergeLocales(shellLocales), fallback: 'en', initial: 'en' });
  const host = document.createElement('div');
  document.body.appendChild(host);
  const handle = mountMiniWallet(host, { wallet: wallet(mode), i18n, ...opts });
  return { host, handle, i18n };
}

const q = (host: HTMLElement, sel: string) => host.querySelector(sel) as HTMLElement | null;
const qa = (host: HTMLElement, sel: string) => [...host.querySelectorAll(sel)] as HTMLElement[];

function tx(n: number, over: Partial<ShellTx> = {}): ShellTx {
  return {
    hash: HASH(n), direction: 'in', counterparty: STRANGER, sender: STRANGER, recipient: ME,
    valueLuna: 1_000_00000, feeLuna: 0, timestamp: Date.UTC(2026, 10, 10, 12) - n * 3_600_000,
    message: null, pending: false, ...over,
  };
}

// ---------------------------------------------------------------------------
describe('pure helpers', () => {
  test('signed amounts use U+2212 for out and + for in, self unsigned', () => {
    expect(signedTxAmount({ direction: 'out', valueLuna: 125050000 })).toStartWith('\u2212');
    expect(signedTxAmount({ direction: 'out', valueLuna: 125050000 })).not.toContain('-');
    expect(signedTxAmount({ direction: 'in', valueLuna: 100000 })).toStartWith('+');
    expect(signedTxAmount({ direction: 'self', valueLuna: 100000 })).toBe('1 NIM');
    // dust keeps its luna rather than reading as 0
    expect(signedTxAmount({ direction: 'in', valueLuna: 1 })).toContain('0.00001');
  });

  test('a contact name wins over the address; other chains and strangers do not', () => {
    const book = [
      { label: 'Mum', address: MUM.replace(/\s/g, '').toLowerCase() },
      { label: 'Polygon Mum', address: STRANGER, asset: 'USDT' },
    ];
    expect(counterpartyLabel(MUM, book)).toEqual({ kind: 'contact', label: 'Mum' });
    expect(counterpartyLabel(STRANGER, book)).toBeNull();
    expect(counterpartyLabel('NQ77 0000 0000 0000 0000 0000 0000 0000 0001', [])).toEqual({ kind: 'staking' });
  });

  test('short address: first block, ellipsis, last block', () => {
    expect(shortTxAddress(STRANGER)).toBe('NQ60 \u2026 BC4L');
    expect(shortTxAddress(STRANGER, 2)).toBe('NQ60 S8EH \u2026 BC4L');
  });
});

// ---------------------------------------------------------------------------
describe('spendable and staked on the account row', () => {
  test('the figure is labelled Available, and stake is a second line never summed in', async () => {
    rpcReply = (m) => m === 'getStakerByAddress'
      ? { result: { data: { address: ME, balance: 1_000_000_00000, inactiveBalance: 5_00000, retiredBalance: 0 } } }
      : { result: { data: { address: ME, balance: 30_00000 } } };
    const { host } = mount({ history: false });
    await settle();
    expect(q(host, '.nq-cc-balance-label')!.textContent).toBe('Available');
    expect(q(host, '.nq-cc-balance-nim')!.textContent).toBe('30.00 NIM');
    const staked = q(host, '.nq-cc-balance-staked')!;
    expect(staked.hidden).toBe(false);
    expect(staked.textContent).toContain('Staked');
    expect(staked.textContent).toContain('1\u202F000\u202F005');
    expect(methods.filter((m) => m === 'getStakerByAddress')).toHaveLength(1);
  });

  test('a failed stake read hides only its own line', async () => {
    rpcReply = (m) => m === 'getStakerByAddress'
      ? { error: { message: 'Method not allowed' } }
      : { result: { data: { address: ME, balance: 30_00000 } } };
    const { host } = mount({ history: false });
    await settle();
    expect(q(host, '.nq-cc-balance-nim')!.textContent).toBe('30.00 NIM');
    expect(q(host, '.nq-cc-balance')!.hidden).toBe(false);
    expect(q(host, '.nq-cc-balance-staked')!.hidden).toBe(true);
  });

  test('nothing staked (the node\'s no-staker error) is no line at all', async () => {
    rpcReply = (m) => m === 'getStakerByAddress'
      ? { error: { code: -32603, message: 'Internal error', data: `No staker with address: ${ME}` } }
      : { result: { data: { address: ME, balance: 30_00000 } } };
    const { host } = mount({ history: false });
    await settle();
    expect(q(host, '.nq-cc-balance-staked')!.hidden).toBe(true);
  });

  test('Send caps against and shows the SPENDABLE figure, not spendable + staked', async () => {
    const { host } = mount({ history: false, getBalanceLuna: async () => 30_00000, getStakedLuna: async () => 9_000_00000 });
    await settle();
    q(host, '.nq-cc-face')!.click();
    q(host, '.nq-cc-send')!.click();
    expect(q(host, '.nq-cc-send-hint')!.textContent).toBe('Available: 30.00 NIM');
  });

  test('a host with its own reader gets no built-in stake read, and its own seam works', async () => {
    const { host } = mount({ history: false, getBalanceLuna: async () => 1 });
    await settle();
    expect(methods).toEqual([]);
    expect(q(host, '.nq-cc-balance-staked')!.hidden).toBe(true);
    const two = mount({ history: false, getBalanceLuna: async () => 1, getStakedLuna: async () => 2_00000 });
    await settle();
    expect(q(two.host, '.nq-cc-balance-staked')!.textContent).toBe('Staked 2.00 NIM');
  });

  test('the account block shows whole NIM from 1 000 up, and the Send step keeps the exact figure', async () => {
    const { host, handle } = mount({
      history: false,
      getBalanceLuna: async () => 421_837_500,
      getStakedLuna: async () => 1_250_099_999,
    });
    await settle();
    handle.open();
    await settle();
    expect(q(host, '.nq-cc-balance-nim')!.textContent).toBe('4218 NIM');
    expect(q(host, '.nq-cc-balance-staked')!.textContent).toBe('Staked 12\u202F500 NIM');
    q(host, '.nq-cc-send')!.click();
    await settle();
    expect(host.textContent).toContain('4218.375 NIM');
  });

  test('a balance read still in flight when the account changes never paints beside the new name', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    let onChange: (() => void) | null = null;
    const w = wallet();
    (w as { onAccountChange: unknown }).onAccountChange = (cb: () => void) => { onChange = cb; return () => {}; };
    const { host } = mount({
      wallet: w,
      history: false,
      // ME answers late; the account switched to never answers at all.
      getBalanceLuna: async (address: string) => {
        if (address === ME) { await gate; return 7_00000; }
        return new Promise<number>(() => {});
      },
    });
    await settle();
    (w as { account: unknown }).account = { address: STRANGER, label: 'Other' };
    onChange!();
    await settle();
    release();
    await settle();
    expect(q(host, '.nq-cc-balance')!.hidden).toBe(true);
    expect(q(host, '.nq-cc-balance-nim')!.textContent).not.toContain('7');
  });

  test('a host with its own balance wiring gets no built-in history unless it asks', async () => {
    const quiet = mount({ getBalanceLuna: async () => 1 });
    await settle();
    quiet.handle.open();
    await settle();
    expect(methods).toEqual([]);
    expect(q(quiet.host, '.nq-cc-history')).toBeNull();
    const stack = mount({ assets: [{ ticker: 'NIM', name: 'Nimiq', network: 'Nimiq', decimals: 5, balance: async () => 1, address: ME }] });
    await settle();
    stack.handle.open();
    await settle();
    expect(methods).toEqual([]);
    const asked = mount({ getBalanceLuna: async () => 1, history: true });
    await settle();
    asked.handle.open();
    await settle();
    expect(methods).toContain('getTransactionsByAddress');
  });

  test('balance: false and testnet make no stake request', async () => {
    mount({ balance: false, history: false });
    mount({ network: 'test', history: false });
    await settle();
    expect(methods).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
describe('transaction history', () => {
  const page = (rows: unknown[]) => ({ result: { data: rows } });
  const rawIn = (n: number, extra: Record<string, unknown> = {}) => ({
    hash: HASH(n), blockNumber: 100 - n, timestamp: Date.UTC(2026, 10, 10) - n * 60_000, confirmations: 5,
    from: STRANGER, to: ME, value: 1_00000 * n, fee: 0, recipientData: '', executionResult: true, ...extra,
  });

  test('no history request while the menu is closed; one when it opens; none on a quick reopen', async () => {
    rpcReply = (m) => m === 'getTransactionsByAddress' ? page([rawIn(1)]) : { result: { data: { address: ME, balance: 0 } } };
    const { host, handle } = mount();
    await settle();
    expect(methods).not.toContain('getTransactionsByAddress');
    handle.open();
    await settle();
    expect(methods.filter((m) => m === 'getTransactionsByAddress')).toHaveLength(1);
    expect(qa(host, '.nq-cc-recent .nq-cc-tx')).toHaveLength(1);
    handle.close();
    handle.open();
    await settle();
    expect(methods.filter((m) => m === 'getTransactionsByAddress')).toHaveLength(1);
  });

  test('loading shows skeleton rows, then the last three', async () => {
    let release: (v: ShellTx[]) => void = () => {};
    const { host, handle } = mount({
      balance: false,
      history: { fetch: () => new Promise<ShellTx[]>((r) => { release = r; }) },
    });
    handle.open();
    await settle(5);
    expect(qa(host, '.nq-cc-recent .nq-cc-tx-skel')).toHaveLength(3);
    expect(q(host, '.nq-cc-recent .nq-cc-tx')).toBeNull();
    release([tx(1), tx(2), tx(3), tx(4), tx(5)]);
    await settle();
    expect(qa(host, '.nq-cc-recent .nq-cc-tx-skel')).toHaveLength(0);
    expect(qa(host, '.nq-cc-recent .nq-cc-tx')).toHaveLength(3);
    expect(q(host, '.nq-cc-tx-all')!.hidden).toBe(false);
  });

  test('empty says so, with no All transactions link', async () => {
    const { host, handle } = mount({ balance: false, history: { fetch: async () => [] } });
    handle.open();
    await settle();
    expect(q(host, '.nq-cc-recent .nq-cc-tx-note')!.textContent).toBe('No transactions yet');
    expect(q(host, '.nq-cc-tx-all')!.hidden).toBe(true);
  });

  test('error is one line with a retry, and the rest of the menu is untouched', async () => {
    let fail = true;
    const { host, handle } = mount({
      getBalanceLuna: async () => 30_00000,
      history: { fetch: async () => { if (fail) throw new Error('503'); return [tx(1)]; } },
    });
    handle.open();
    await settle();
    expect(q(host, '.nq-cc-recent .nq-cc-tx-note')!.textContent).toContain('Could not load transactions');
    expect(q(host, '.nq-cc-balance-nim')!.textContent).toBe('30.00 NIM');
    fail = false;
    q(host, '.nq-cc-tx-retry')!.click();
    await settle();
    expect(qa(host, '.nq-cc-recent .nq-cc-tx')).toHaveLength(1);
  });

  test('history: false is off, and so are testnet and Nimiq Pay', async () => {
    rpcReply = () => page([rawIn(1)]);
    for (const [opts, mode] of [
      [{ history: false }, 'hub'], [{ network: 'test' as const }, 'hub'], [{}, 'miniapp'],
    ] as const) {
      const { host, handle } = mount(opts as Partial<CornerControlOptions>, mode);
      handle.open();
      await settle();
      expect(q(host, '.nq-cc-recent')).toBeNull();
      expect(q(host, '.nq-cc-view-history')).toBeNull();
    }
    expect(methods).not.toContain('getTransactionsByAddress');
  });

  test('a host fetch replaces the built-in read, which then makes no request', async () => {
    const asked: unknown[] = [];
    const { host, handle } = mount({
      balance: false,
      history: { fetch: async (address, opts) => { asked.push([address, opts]); return [tx(1)]; } },
    });
    handle.open();
    await settle();
    expect(asked).toEqual([[ME, { max: 20, startAt: null }]]);
    expect(methods).toEqual([]);
    expect(qa(host, '.nq-cc-recent .nq-cc-tx')).toHaveLength(1);
  });

  test('a saved contact is named; a stranger is a shortened address in Fira Mono', async () => {
    const { host, handle } = mount({
      balance: false,
      contacts: { list: () => [{ label: 'Mum', address: MUM }] },
      history: { fetch: async () => [tx(1, { counterparty: MUM }), tx(2)] },
    });
    handle.open();
    await settle();
    const labels = qa(host, '.nq-cc-recent .nq-cc-tx-label');
    expect(labels[0]!.textContent).toBe('Mum');
    expect(labels[0]!.classList.contains('nq-cc-mono')).toBe(false);
    expect(labels[1]!.textContent).toBe('NQ60 \u2026 BC4L');
    expect(labels[1]!.classList.contains('nq-cc-mono')).toBe(true);
  });

  test('chain text is TEXT: a message carrying markup renders as characters', async () => {
    const evil = '<img src=x onerror="alert(1)">';
    const { host, handle } = mount({
      balance: false,
      contacts: { list: () => [{ label: '<b>Mum</b>', address: MUM }] },
      history: { fetch: async () => [tx(1, { counterparty: MUM, message: evil })] },
    });
    handle.open();
    await settle();
    expect(q(host, '.nq-cc-recent img')).toBeNull();
    expect(q(host, '.nq-cc-recent b')).toBeNull();
    expect(q(host, '.nq-cc-tx-sub')!.textContent).toContain(evil);
    q(host, '.nq-cc-recent .nq-cc-tx')!.click();
    expect(q(host, '.nq-cc-view-txdetail img')).toBeNull();
    expect(qa(host, '.nq-cc-txd-fact dd').pop()!.textContent).toBe(evil);
  });

  test('in green with +, out with the real minus; pending is quiet', async () => {
    const { host, handle } = mount({
      balance: false,
      history: { fetch: async () => [tx(1, { pending: true, timestamp: null }), tx(2, { direction: 'out', counterparty: MUM })] },
    });
    handle.open();
    await settle();
    const rows = qa(host, '.nq-cc-recent .nq-cc-tx');
    expect(rows[0]!.dataset.dir).toBe('in');
    expect(rows[0]!.hasAttribute('data-pending')).toBe(true);
    expect(rows[0]!.querySelector('.nq-cc-tx-sub')!.textContent).toBe('Pending');
    expect(rows[1]!.querySelector('.nq-cc-tx-value')!.textContent).toStartWith('\u2212');
  });

  test('All transactions groups by month and loads the next page from the last hash', async () => {
    const calls: (string | null | undefined)[] = [];
    const first = Array.from({ length: 20 }, (_, i) => tx(i + 1));
    const { host, handle } = mount({
      balance: false,
      history: {
        fetch: async (_a, opts) => {
          calls.push(opts.startAt);
          return opts.startAt ? [tx(21, { timestamp: Date.UTC(2025, 0, 5) })] : first;
        },
      },
    });
    handle.open();
    await settle();
    q(host, '.nq-cc-tx-all')!.click();
    expect(handle.el.classList.contains('nq-cc-show-history')).toBe(true);
    expect(qa(host, '.nq-cc-view-history .nq-cc-tx')).toHaveLength(20);
    expect(qa(host, '.nq-cc-tx-month').length).toBeGreaterThan(0);
    q(host, '.nq-cc-tx-more')!.click();
    await settle();
    expect(calls).toEqual([null, HASH(20)]);
    expect(qa(host, '.nq-cc-view-history .nq-cc-tx')).toHaveLength(21);
    // a short page means the end: no more button
    expect(q(host, '.nq-cc-tx-more')).toBeNull();
    const months = qa(host, '.nq-cc-tx-month').map((m) => m.textContent);
    expect(months[months.length - 1]).toContain('2025');
  });

  test('a row opens its detail: full address plate, fee, message, explorer link', async () => {
    const { host, handle } = mount({
      balance: false,
      history: { fetch: async () => [tx(1, { direction: 'out', counterparty: MUM, feeLuna: 300, message: 'Rent' })] },
    });
    handle.open();
    await settle();
    q(host, '.nq-cc-recent .nq-cc-tx')!.click();
    expect(handle.el.classList.contains('nq-cc-show-txdetail')).toBe(true);
    const cells = qa(host, '.nq-cc-view-txdetail .nq-cc-address span').map((s) => s.textContent);
    expect(cells.join(' ')).toBe(MUM);
    const facts = qa(host, '.nq-cc-txd-fact dt').map((d) => d.textContent);
    expect(facts).toEqual(['Date', 'Fee', 'Message']);
    const a = q(host, '.nq-cc-tx-explorer') as HTMLAnchorElement;
    expect(a.href).toBe(`https://nimiq.watch/#${HASH(1)}`);
    expect(a.rel).toContain('noopener');
    handle.close();
    expect(handle.el.classList.contains('nq-cc-show-txdetail')).toBe(false);
  });
});
