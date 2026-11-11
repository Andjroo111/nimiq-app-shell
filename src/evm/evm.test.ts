// The EVM connector: which wallet, connect and restore, the chain switch, and
// the one hand-encoded read.
import { describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import {
  BALANCE_OF_SELECTOR,
  createEvmDiscovery,
  createEvmWallet,
  decodeUint256,
  encodeBalanceOf,
  evmFailure,
  EVM_CHAINS,
  EVM_TOKENS,
  isMobileBrowser,
  metaMaskAppLink,
  METAMASK_RDNS,
  orderProviders,
  pickProvider,
  shortEvmAddress,
  type AnnouncedProvider,
  type Eip1193Provider,
} from './index';

const ADDR = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
const ADDR_B = '0x000000000000000000000000000000000000dEaD';
const POLYGON = '0x89';

interface MockProvider extends Eip1193Provider {
  calls: Array<{ method: string; params?: unknown }>;
  emit(event: string, ...args: unknown[]): void;
  listenerCount(event: string): number;
}

/** A scriptable EIP-1193 provider. `handlers` answer by method; a handler that
 *  throws is the wallet rejecting. */
function mockProvider(handlers: Record<string, (params?: unknown) => unknown> = {}): MockProvider {
  const listeners = new Map<string, Set<(...args: any[]) => void>>();
  const calls: MockProvider['calls'] = [];
  return {
    calls,
    async request({ method, params }) {
      calls.push({ method, params });
      const handler = handlers[method];
      if (!handler) throw Object.assign(new Error(`unhandled ${method}`), { code: -32601 });
      return handler(params);
    },
    on(event, cb) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(cb);
    },
    removeListener(event, cb) { listeners.get(event)?.delete(cb); },
    emit(event, ...args) { for (const cb of [...(listeners.get(event) ?? [])]) cb(...args); },
    listenerCount: (event) => listeners.get(event)?.size ?? 0,
  };
}

/** A wallet on Polygon holding one account. */
const happy = (address = ADDR, chain = POLYGON) => mockProvider({
  eth_requestAccounts: () => [address],
  eth_accounts: () => [address],
  eth_chainId: () => chain,
});

function announce(win: Window, rdns: string, name: string, provider: Eip1193Provider, icon?: string): void {
  win.dispatchEvent(new win.CustomEvent('eip6963:announceProvider', {
    detail: { info: { rdns, name, icon, uuid: rdns }, provider },
  }) as never);
}

const asWin = (w: Window) => w as unknown as globalThis.Window;
const rejects = async (p: Promise<unknown>): Promise<unknown> => {
  try { await p; } catch (err) { return err; }
  throw new Error('expected a rejection');
};

describe('which wallet', () => {
  const a = (rdns: string): AnnouncedProvider => ({ info: { rdns, name: rdns }, provider: mockProvider() });

  test('MetaMask goes first whatever order the wallets announced in', () => {
    const list = [a('com.brave.wallet'), a('io.rabby'), a(METAMASK_RDNS)];
    expect(orderProviders(list).map((x) => x.info.rdns))
      .toEqual([METAMASK_RDNS, 'com.brave.wallet', 'io.rabby']);
    expect(pickProvider(list, null)).toBe(list[2]!.provider);
  });

  test('without MetaMask the first announced wallet is picked', () => {
    const list = [a('com.brave.wallet'), a('io.rabby')];
    expect(pickProvider(list, mockProvider())).toBe(list[0]!.provider);
  });

  test('with nothing announced, window.ethereum is picked, and null when there is none', () => {
    const injected = mockProvider();
    expect(pickProvider([], injected)).toBe(injected);
    expect(pickProvider([], null)).toBeNull();
  });

  test('discovery asks wallets to announce, dedupes them, and reports late arrivals', () => {
    const win = new Window();
    const early = mockProvider();
    // A wallet already on the page answers the request inside the dispatch.
    win.addEventListener('eip6963:requestProvider', () => announce(win, 'io.rabby', 'Rabby', early));
    const discovery = createEvmDiscovery(asWin(win));
    expect(discovery.list().map((x) => x.info.rdns)).toEqual(['io.rabby']);

    let changes = 0;
    discovery.onChange(() => { changes += 1; });
    announce(win, 'io.rabby', 'Rabby', early); // a re-announcement is not a new wallet
    expect(changes).toBe(0);
    announce(win, METAMASK_RDNS, 'MetaMask', mockProvider());
    expect(changes).toBe(1);
    expect(discovery.list().map((x) => x.info.rdns)).toEqual([METAMASK_RDNS, 'io.rabby']);

    // Malformed announcements are ignored rather than listed as nameless rows.
    win.dispatchEvent(new win.CustomEvent('eip6963:announceProvider', { detail: { info: {} } }) as never);
    expect(discovery.list()).toHaveLength(2);
    discovery.destroy();
  });

  test('the connector list: announced wallets with their own icon, then the planned ones', () => {
    const win = new Window();
    const evm = createEvmWallet({ win: asWin(win) });
    announce(win, 'io.rabby', 'Rabby', mockProvider(), 'data:image/svg+xml,<svg/>');
    // An icon that is not a data: image is dropped, never loaded.
    announce(win, METAMASK_RDNS, 'MetaMask', mockProvider(), 'https://example.com/fox.png');
    expect(evm.connectors).toEqual([
      { id: METAMASK_RDNS, name: 'MetaMask', icon: null, kind: 'announced', ready: true },
      { id: 'io.rabby', name: 'Rabby', icon: 'data:image/svg+xml,<svg/>', kind: 'announced', ready: true },
      { id: 'walletconnect', name: 'WalletConnect', icon: null, kind: 'planned', ready: false },
      { id: 'ledger', name: 'Ledger', icon: null, kind: 'planned', ready: false },
    ]);
  });

  test('the connector list falls back to window.ethereum, then to an install row', () => {
    const win = new Window();
    const evm = createEvmWallet({ win: asWin(win), planned: [] });
    expect(evm.connectors).toEqual([
      { id: 'install', name: 'MetaMask', icon: null, kind: 'install', ready: false },
    ]);
    (win as unknown as { ethereum: Eip1193Provider }).ethereum = mockProvider();
    expect(evm.connectors).toEqual([
      { id: 'injected', name: null, icon: null, kind: 'injected', ready: true },
    ]);
    (win as unknown as { ethereum: Eip1193Provider }).ethereum = Object.assign(mockProvider(), { isMetaMask: true });
    expect(evm.connectors[0]!.name).toBe('MetaMask');
  });

  test('the MetaMask app link reopens this page, and phones are told apart by user agent', () => {
    expect(metaMaskAppLink({ host: 'nimiq.markets', pathname: '/swap', search: '?pair=nim' }))
      .toBe('https://metamask.app.link/dapp/nimiq.markets/swap?pair=nim');
    expect(isMobileBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(true);
    expect(isMobileBrowser('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe(false);
  });
});

describe('connect, restore, account changes, disconnect', () => {
  test('connect asks for an account, lands on Polygon and reports it', async () => {
    const win = new Window();
    const provider = happy();
    const evm = createEvmWallet({ win: asWin(win) });
    announce(win, METAMASK_RDNS, 'MetaMask', provider);
    const seen: Array<string | null> = [];
    evm.onAccountChange((a) => seen.push(a?.address ?? null));

    const account = await evm.connect();
    expect(account).toEqual({ address: ADDR, connector: METAMASK_RDNS });
    expect(evm.account).toEqual(account);
    expect(seen).toEqual([ADDR]);
    expect(provider.calls.map((c) => c.method)).toEqual(['eth_requestAccounts', 'eth_chainId']);
    expect(evm.provider()).toBe(provider);
  });

  test('connect with no wallet rejects as no-provider and makes no account', async () => {
    const evm = createEvmWallet({ win: asWin(new Window()) });
    const err = await rejects(evm.connect());
    expect(evmFailure(err)).toBe('no-provider');
    expect(evm.account).toBeNull();
  });

  test('connect(id) goes to THAT wallet, not the preferred one', async () => {
    const win = new Window();
    const metamask = happy();
    const rabby = happy(ADDR_B);
    const evm = createEvmWallet({ win: asWin(win) });
    announce(win, METAMASK_RDNS, 'MetaMask', metamask);
    announce(win, 'io.rabby', 'Rabby', rabby);
    expect((await evm.connect('io.rabby')).address).toBe(ADDR_B);
    expect(metamask.calls).toHaveLength(0);
  });

  // Closing the wallet prompt is a normal thing to do.
  test('a user rejection (4001) stays quiet: no account, no event, classified as cancelled', async () => {
    const win = new Window();
    const provider = mockProvider({
      eth_requestAccounts: () => { throw Object.assign(new Error('User rejected the request.'), { code: 4001 }); },
    });
    const evm = createEvmWallet({ win: asWin(win) });
    announce(win, METAMASK_RDNS, 'MetaMask', provider);
    let events = 0;
    evm.onAccountChange(() => { events += 1; });

    const err = await rejects(evm.connect());
    expect(evmFailure(err)).toBe('cancelled');
    expect(evm.account).toBeNull();
    expect(events).toBe(0);
    expect(provider.listenerCount('accountsChanged')).toBe(0);
    expect(evmFailure(new Error('boom'))).toBe('failed');
  });

  test('restore picks up a granted account with eth_accounts and never prompts', async () => {
    const win = new Window();
    const provider = happy();
    const evm = createEvmWallet({ win: asWin(win) });
    announce(win, METAMASK_RDNS, 'MetaMask', provider);
    expect(await evm.restore()).toEqual({ address: ADDR, connector: METAMASK_RDNS });
    expect(provider.calls.map((c) => c.method)).toEqual(['eth_accounts']);
  });

  test('restore with nothing granted resolves null', async () => {
    const win = new Window();
    const evm = createEvmWallet({ win: asWin(win) });
    announce(win, METAMASK_RDNS, 'MetaMask', mockProvider({ eth_accounts: () => [] }));
    expect(await evm.restore()).toBeNull();
    expect(evm.account).toBeNull();
  });

  // A wallet whose eth_accounts answer is held until the test releases it.
  const slow = () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    const provider = mockProvider({ eth_accounts: async () => { await gate; return [ADDR]; } });
    return { provider, release };
  };

  test('a disconnect during a restore is not undone when the wallet answers', async () => {
    const win = new Window();
    const { provider, release } = slow();
    const evm = createEvmWallet({ win: asWin(win) });
    announce(win, METAMASK_RDNS, 'MetaMask', provider);
    const pending = evm.restore();
    evm.disconnect();
    release();
    expect(await pending).toBeNull();
    expect(evm.account).toBeNull();
    expect(provider.listenerCount('accountsChanged')).toBe(0);
  });

  test('a destroy during a restore leaves no listener on the provider', async () => {
    const win = new Window();
    const { provider, release } = slow();
    const evm = createEvmWallet({ win: asWin(win) });
    announce(win, METAMASK_RDNS, 'MetaMask', provider);
    const pending = evm.restore();
    evm.destroy();
    release();
    await pending;
    expect(evm.account).toBeNull();
    expect(provider.listenerCount('accountsChanged')).toBe(0);
  });

  test('restore that ran before any wallet announced completes when one does', async () => {
    const win = new Window();
    const evm = createEvmWallet({ win: asWin(win) });
    expect(await evm.restore()).toBeNull();
    announce(win, METAMASK_RDNS, 'MetaMask', happy());
    await new Promise((r) => setTimeout(r, 5));
    expect(evm.account?.address).toBe(ADDR);
  });

  test('accountsChanged follows the wallet, and an empty list signs out', async () => {
    const win = new Window();
    const provider = happy();
    const evm = createEvmWallet({ win: asWin(win) });
    announce(win, METAMASK_RDNS, 'MetaMask', provider);
    await evm.connect();
    const seen: Array<string | null> = [];
    const off = evm.onAccountChange((a) => seen.push(a?.address ?? null));

    provider.emit('accountsChanged', [ADDR_B]);
    expect(evm.account?.address).toBe(ADDR_B);
    provider.emit('accountsChanged', [ADDR_B]); // the same account is not a change
    provider.emit('accountsChanged', []);
    expect(evm.account).toBeNull();
    expect(seen).toEqual([ADDR_B, null]);

    off();
    provider.emit('accountsChanged', [ADDR]);
    expect(seen).toEqual([ADDR_B, null]);
  });

  test('disconnect forgets the account, stops listening, and a reload does not reconnect', async () => {
    const win = new Window();
    const provider = happy();
    const evm = createEvmWallet({ win: asWin(win) });
    announce(win, METAMASK_RDNS, 'MetaMask', provider);
    await evm.connect();
    const seen: Array<string | null> = [];
    evm.onAccountChange((a) => seen.push(a?.address ?? null));

    evm.disconnect();
    expect(evm.account).toBeNull();
    expect(seen).toEqual([null]);
    expect(provider.listenerCount('accountsChanged')).toBe(0);
    expect(evm.provider()).toBeNull();

    // "Reload": a new handle on the same window, where the wallet still grants.
    const again = createEvmWallet({ win: asWin(win) });
    announce(win, METAMASK_RDNS, 'MetaMask', provider);
    expect(await again.restore()).toBeNull();
    // An explicit connect is the user changing their mind, and undoes it.
    await again.connect();
    const third = createEvmWallet({ win: asWin(win) });
    announce(win, METAMASK_RDNS, 'MetaMask', provider);
    expect((await third.restore())?.address).toBe(ADDR);
  });

  test('restore prefers the wallet that was connected last time', async () => {
    const win = new Window();
    const metamask = happy();
    const rabby = happy(ADDR_B);
    const first = createEvmWallet({ win: asWin(win) });
    announce(win, METAMASK_RDNS, 'MetaMask', metamask);
    announce(win, 'io.rabby', 'Rabby', rabby);
    await first.connect('io.rabby');

    const second = createEvmWallet({ win: asWin(win) });
    announce(win, METAMASK_RDNS, 'MetaMask', metamask);
    announce(win, 'io.rabby', 'Rabby', rabby);
    expect(await second.restore()).toEqual({ address: ADDR_B, connector: 'io.rabby' });
  });
});

describe('the chain', () => {
  const methods = (p: MockProvider) => p.calls.map((c) => c.method);

  test('a wallet on another chain is switched to Polygon', async () => {
    const win = new Window();
    const provider = mockProvider({
      eth_requestAccounts: () => [ADDR],
      eth_chainId: () => '0x1',
      wallet_switchEthereumChain: () => null,
    });
    const evm = createEvmWallet({ win: asWin(win) });
    announce(win, METAMASK_RDNS, 'MetaMask', provider);
    await evm.connect();
    expect(methods(provider)).toEqual(['eth_requestAccounts', 'eth_chainId', 'wallet_switchEthereumChain']);
    expect(provider.calls[2]!.params).toEqual([{ chainId: '0x89' }]);
  });

  test('a wallet that does not know the chain (4902) is offered it', async () => {
    const win = new Window();
    const provider = mockProvider({
      eth_requestAccounts: () => [ADDR],
      eth_chainId: () => '0x1',
      wallet_switchEthereumChain: () => { throw Object.assign(new Error('Unrecognized chain'), { code: 4902 }); },
      wallet_addEthereumChain: () => null,
    });
    const evm = createEvmWallet({ win: asWin(win), network: 'test' });
    announce(win, METAMASK_RDNS, 'MetaMask', provider);
    await evm.connect();
    expect(methods(provider).at(-1)).toBe('wallet_addEthereumChain');
    expect(provider.calls.at(-1)!.params).toEqual([{
      chainId: '0x13882',
      chainName: 'Polygon Amoy',
      nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
      rpcUrls: ['https://rpc-amoy.polygon.technology'],
      blockExplorerUrls: ['https://amoy.polygonscan.com'],
    }]);
    expect(evm.account?.address).toBe(ADDR);
  });

  test('refusing the switch is a cancel, with no account and nothing added', async () => {
    const win = new Window();
    const provider = mockProvider({
      eth_requestAccounts: () => [ADDR],
      eth_chainId: () => '0x1',
      wallet_switchEthereumChain: () => { throw Object.assign(new Error('rejected'), { code: 4001 }); },
    });
    const evm = createEvmWallet({ win: asWin(win) });
    announce(win, METAMASK_RDNS, 'MetaMask', provider);
    expect(evmFailure(await rejects(evm.connect()))).toBe('cancelled');
    expect(evm.account).toBeNull();
    expect(methods(provider)).not.toContain('wallet_addEthereumChain');
  });

  test('the hex ids are the numeric ids, and both networks list USDC and USDT', () => {
    for (const net of ['main', 'test'] as const) {
      expect(EVM_CHAINS[net].hexId).toBe(`0x${EVM_CHAINS[net].id.toString(16)}`);
      expect(EVM_TOKENS[net].map((t) => [t.ticker, t.decimals])).toEqual([['USDC', 6], ['USDT', 6]]);
    }
    // nimiq.markets app/src/shared/evm-chains.ts, POLYGON_MAINNET. Native USDC,
    // not the bridged USDC.e.
    expect(EVM_TOKENS.main.map((t) => t.address)).toEqual([
      '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    ]);
  });
});

describe('balanceOf', () => {
  const USDC = EVM_TOKENS.main[0]!.address;
  const word = (n: bigint): string => `0x${n.toString(16).padStart(64, '0')}`;

  test('the calldata is the selector and the address padded to one word', () => {
    expect(BALANCE_OF_SELECTOR).toBe('0x70a08231');
    expect(encodeBalanceOf(ADDR))
      .toBe('0x70a0823100000000000000000000000071c7656ec7ab88b098defb751b7401b5f6d8976f');
    expect(encodeBalanceOf(ADDR)).toHaveLength(2 + 8 + 64);
    expect(() => encodeBalanceOf('0x1234')).toThrow();
    expect(() => encodeBalanceOf('NQ07 0000 0000 0000 0000 0000 0000 0000 0000')).toThrow();
  });

  test('a returned word decodes exactly, past 2^53 and up to the full 256 bits', () => {
    expect(decodeUint256(word(0n))).toBe(0n);
    expect(decodeUint256(word(402_110_000n))).toBe(402_110_000n);
    const past = 2n ** 53n + 1n; // 9007199254740993, which a Number rounds to ...992
    expect(decodeUint256(word(past))).toBe(past);
    expect(BigInt(Number(past))).not.toBe(past);
    expect(decodeUint256(word(2n ** 256n - 1n))).toBe(2n ** 256n - 1n);
    expect(decodeUint256('0x0')).toBe(0n);
  });

  // '0x' is what a node answers for an address with no contract on it: the
  // wrong chain or the wrong token, not an empty wallet.
  test('an empty or malformed answer throws, it is never read as zero', () => {
    for (const bad of ['0x', '', null, undefined, 12, '0xzz', `0x${'f'.repeat(65)}`]) {
      expect(() => decodeUint256(bad)).toThrow();
    }
  });

  test('reads through the connected wallet with a hand-built eth_call', async () => {
    const win = new Window();
    const big = 2n ** 53n + 1n;
    const provider = mockProvider({
      eth_requestAccounts: () => [ADDR],
      eth_chainId: () => POLYGON,
      eth_call: () => word(big),
    });
    const evm = createEvmWallet({ win: asWin(win) });
    announce(win, METAMASK_RDNS, 'MetaMask', provider);
    await evm.connect();
    expect(await evm.balanceOf(USDC)).toBe(big);
    const call = provider.calls.find((c) => c.method === 'eth_call')!;
    expect(call.params).toEqual([{ to: USDC, data: encodeBalanceOf(ADDR) }, 'latest']);
  });

  test('a wallet on another chain is not read at all', async () => {
    const win = new Window();
    let chain = POLYGON;
    const provider = mockProvider({
      eth_requestAccounts: () => [ADDR],
      eth_chainId: () => chain,
      eth_call: () => word(1n),
    });
    const evm = createEvmWallet({ win: asWin(win) });
    announce(win, METAMASK_RDNS, 'MetaMask', provider);
    await evm.connect();
    chain = '0x1';
    expect(evmFailure(await rejects(evm.balanceOf(USDC)))).toBe('wrong-chain');
    expect(provider.calls.some((c) => c.method === 'eth_call')).toBe(false);
  });

  test('a chain switch between the question and the answer discards the answer', async () => {
    const win = new Window();
    let chain = POLYGON;
    const provider = mockProvider({
      eth_requestAccounts: () => [ADDR],
      eth_chainId: () => chain,
      eth_call: () => { chain = '0x1'; return word(1n); },
    });
    const evm = createEvmWallet({ win: asWin(win) });
    announce(win, METAMASK_RDNS, 'MetaMask', provider);
    await evm.connect();
    expect(evmFailure(await rejects(evm.balanceOf(USDC)))).toBe('wrong-chain');
  });

  test('signed out, a balance read rejects instead of guessing an owner', async () => {
    const evm = createEvmWallet({ win: asWin(new Window()) });
    expect(evmFailure(await rejects(evm.balanceOf(USDC)))).toBe('no-account');
  });

  test('with rpcUrl the read goes to that endpoint and the wallet is not asked', async () => {
    const win = new Window();
    const provider = happy();
    const evm = createEvmWallet({ win: asWin(win), rpcUrl: 'https://rpc.example/polygon' });
    announce(win, METAMASK_RDNS, 'MetaMask', provider);
    await evm.connect();
    const before = provider.calls.length;
    const realFetch = globalThis.fetch;
    const posted: Array<{ url: string; body: any }> = [];
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      posted.push({ url, body: JSON.parse(String(init.body)) });
      return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: word(77n) }), { status: 200 });
    }) as unknown as typeof fetch;
    try {
      expect(await evm.balanceOf(USDC)).toBe(77n);
    } finally {
      globalThis.fetch = realFetch;
    }
    expect(posted).toHaveLength(1);
    expect(posted[0]!.url).toBe('https://rpc.example/polygon');
    expect(posted[0]!.body.method).toBe('eth_call');
    expect(posted[0]!.body.params).toEqual([{ to: USDC, data: encodeBalanceOf(ADDR) }, 'latest']);
    expect(provider.calls.length).toBe(before);
  });

  test('the short form keeps both ends of the address', () => {
    expect(shortEvmAddress(ADDR)).toBe('0x71C7…976F');
  });
});
