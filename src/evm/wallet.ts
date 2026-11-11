// The EVM wallet handle: the browser-wallet counterpart of createWallet().
//
// ADDITIVE, and a different object on purpose. The Nimiq `Wallet` is a frozen
// contract (Account, SendArgs, signAndSend, pay, signMessage) that every fleet
// app pins, and none of it means anything for a Polygon account: there is no
// luna, no Hub and, in this first cut, no sending at all. So this is its own
// small handle that the mini wallet takes through its `evm` option.
//
// SCOPE: connect, the address, ERC-20 balances, and receive (which is just the
// address). Sending from the EVM account stays with each app.
//
// CONNECTORS, NOT METAMASK. Every wallet goes through the same list: the ones
// announced over EIP-6963, a bare `window.ethereum`, and the ones that are
// planned but not built (WalletConnect, Ledger). A new connector kind is a new
// entry in that list and one branch in `providerFor`, not a second code path.

import { EVM_CHAINS, EVM_TOKENS, type EvmChain, type EvmNetwork, type EvmToken } from './chains';
import {
  createEvmDiscovery,
  type Eip1193Provider,
  type EvmDiscovery,
} from './discovery';
import { decodeUint256, encodeBalanceOf, isEvmAddress } from './erc20';

/** The connected EVM account. */
export interface EvmAccount {
  /** 0x address, as the wallet returned it. */
  address: string;
  /** The id of the connector it came through. */
  connector: string;
}

/** `announced`: a wallet that spoke EIP-6963. `injected`: a bare
 *  `window.ethereum` with no announcement. `install`: no wallet in this browser
 *  at all, so the row can only say how to get one. `planned`: not built yet. */
export type EvmConnectorKind = 'announced' | 'injected' | 'install' | 'planned';

export interface EvmConnector {
  /** Stable id: the wallet's rdns, 'injected', 'install', or a planned id. */
  id: string;
  /** The wallet's own name. Null for an unnamed injected provider. */
  name: string | null;
  /** The wallet's own icon as a data: URI (EIP-6963), or null. */
  icon: string | null;
  kind: EvmConnectorKind;
  /** Whether connect() can run against it right now. */
  ready: boolean;
}

/** A connector shown as coming, with nothing behind it yet. */
export interface EvmPlannedConnector {
  id: string;
  name: string;
}

/** The two that are planned. Pass `planned: []` to show neither. */
export const EVM_PLANNED_CONNECTORS: readonly EvmPlannedConnector[] = [
  { id: 'walletconnect', name: 'WalletConnect' },
  { id: 'ledger', name: 'Ledger' },
];

/** Why a call failed, for callers that branch on it.
 *  `cancelled` is the user closing the wallet prompt (EIP-1193 code 4001),
 *  which is a normal outcome and not an error to report. */
export type EvmFailure = 'cancelled' | 'no-provider' | 'no-account' | 'wrong-chain' | 'failed';

export class EvmWalletError extends Error {
  readonly kind: EvmFailure;
  constructor(kind: EvmFailure, message: string) {
    super(message);
    this.name = 'EvmWalletError';
    this.kind = kind;
  }
}

/** Classify anything connect() or a balance read can throw. */
export function evmFailure(err: unknown): EvmFailure {
  if (err instanceof EvmWalletError) return err.kind;
  return (err as { code?: unknown } | null | undefined)?.code === 4001 ? 'cancelled' : 'failed';
}

export type EvmAccountListener = (account: EvmAccount | null) => void;

export interface EvmWallet {
  readonly network: EvmNetwork;
  /** The chain this wallet connects to and reads from. */
  readonly chain: EvmChain;
  /** The ERC-20 tokens listed on that chain. */
  readonly tokens: readonly EvmToken[];
  /** The connected account, or null. */
  readonly account: EvmAccount | null;
  /** Every way to connect, in display order. Changes as wallets announce. */
  readonly connectors: readonly EvmConnector[];
  /** Ask a wallet for an account and put it on the chain. Prompts the user.
   *  Without an id it takes the first ready connector (MetaMask when present).
   *  Rejects with the wallet's own error; see {@link evmFailure}. */
  connect(connectorId?: string): Promise<EvmAccount>;
  /** Pick up a connection the user already granted, with NO prompt. Resolves
   *  null when there is none, or after a local disconnect(). */
  restore(): Promise<EvmAccount | null>;
  /** Subscribe to account changes. Returns an unsubscribe function. */
  onAccountChange(cb: EvmAccountListener): () => void;
  /** Subscribe to the connector list changing. Returns an unsubscribe function. */
  onConnectorsChange(cb: () => void): () => void;
  /** Forget the account (local only: the wallet's own grant is not revoked). */
  disconnect(): void;
  /** ERC-20 `balanceOf` in the token's smallest unit. `owner` defaults to the
   *  connected account. Rejects rather than answer for another chain. */
  balanceOf(token: string, owner?: string): Promise<bigint>;
  /** The connected account's EIP-1193 provider, or null. For the app's own
   *  transactions, which this package does not build. */
  provider(): Eip1193Provider | null;
  /** Remove every listener this wallet registered. */
  destroy(): void;
}

export interface CreateEvmWalletOptions {
  /** 'main' is Polygon, 'test' is Polygon Amoy. Default 'main'. */
  network?: EvmNetwork;
  /** Connectors shown as coming. Default {@link EVM_PLANNED_CONNECTORS}. */
  planned?: readonly EvmPlannedConnector[];
  /** Read balances from this JSON-RPC endpoint instead of through the wallet.
   *
   *  A wallet answers `eth_call` for whatever chain it is on, so without this a
   *  wallet the user moved to another network cannot be read, and its rows
   *  show a dash. With it they keep reading. Never used for anything but
   *  `eth_call`. */
  rpcUrl?: string;
  /** Remember a local disconnect() (and which wallet was connected) in
   *  localStorage, so a reload does not silently reconnect. Default true. */
  persist?: boolean;
  /** The window to discover wallets on. Default: the global one. For tests. */
  win?: Window;
}

const OFF_KEY = 'nq-shell:evm:off';
const CONNECTOR_KEY = 'nq-shell:evm:connector';

/** Create the EVM wallet handle. Starts wallet discovery immediately; makes no
 *  wallet call until connect() or restore(). */
export function createEvmWallet(options: CreateEvmWalletOptions = {}): EvmWallet {
  const network: EvmNetwork = options.network ?? 'main';
  const chain = EVM_CHAINS[network];
  const tokens = EVM_TOKENS[network];
  const planned = options.planned ?? EVM_PLANNED_CONNECTORS;
  const persist = options.persist !== false;
  const win = options.win ?? (typeof window === 'undefined' ? undefined : window);
  const discovery: EvmDiscovery = createEvmDiscovery(win);

  const store = {
    get(key: string): string | null {
      if (!persist) return null;
      try { return win?.localStorage?.getItem(key) ?? null; } catch { return null; }
    },
    set(key: string, value: string | null): void {
      if (!persist) return;
      try {
        if (value === null) win?.localStorage?.removeItem(key);
        else win?.localStorage?.setItem(key, value);
      } catch { /* storage unavailable */ }
    },
  };

  let account: EvmAccount | null = null;
  const accountListeners = new Set<EvmAccountListener>();
  const connectorListeners = new Set<() => void>();
  /** The provider the account came from, and the listener bound to it. */
  let bound: { provider: Eip1193Provider; onAccounts: (accounts: string[]) => void } | null = null;
  /** restore() ran and found no wallet yet: retry when one announces. */
  let awaitingWallet = false;

  function setAccount(next: EvmAccount | null): void {
    if (next?.address === account?.address && next?.connector === account?.connector) return;
    account = next;
    for (const cb of [...accountListeners]) cb(account);
  }

  function connectors(): EvmConnector[] {
    const out: EvmConnector[] = discovery.list().map((a) => ({
      id: a.info.rdns,
      name: a.info.name,
      icon: typeof a.info.icon === 'string' && a.info.icon.startsWith('data:image/') ? a.info.icon : null,
      kind: 'announced' as const,
      ready: true,
    }));
    if (out.length === 0) {
      const injected = discovery.injected();
      out.push(injected
        ? { id: 'injected', name: injected.isMetaMask ? 'MetaMask' : null, icon: null, kind: 'injected', ready: true }
        // No wallet in this browser. The row still shows, as MetaMask, because
        // that is the wallet the install line and the mobile deep link name.
        : { id: 'install', name: 'MetaMask', icon: null, kind: 'install', ready: false });
    }
    for (const p of planned) out.push({ id: p.id, name: p.name, icon: null, kind: 'planned', ready: false });
    return out;
  }

  function providerFor(connectorId: string): Eip1193Provider | null {
    if (connectorId === 'injected') return discovery.injected();
    return discovery.list().find((a) => a.info.rdns === connectorId)?.provider ?? null;
  }

  function bind(provider: Eip1193Provider, connector: string): void {
    if (bound?.provider === provider) return;
    unbind();
    const onAccounts = (accounts: string[]): void => {
      const first = Array.isArray(accounts) ? accounts[0] : undefined;
      // An empty list is the user revoking this site inside the wallet.
      setAccount(typeof first === 'string' && isEvmAddress(first) ? { address: first, connector } : null);
    };
    provider.on?.('accountsChanged', onAccounts);
    bound = { provider, onAccounts };
  }
  function unbind(): void {
    if (!bound) return;
    bound.provider.removeListener?.('accountsChanged', bound.onAccounts);
    bound = null;
  }

  /** Put the wallet on our chain, adding the chain first if it has never
   *  heard of it (error 4902). */
  async function ensureChain(provider: Eip1193Provider): Promise<void> {
    const have = String(await provider.request({ method: 'eth_chainId' })).toLowerCase();
    if (have === chain.hexId) return;
    try {
      await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chain.hexId }] });
    } catch (err) {
      if ((err as { code?: unknown } | null)?.code !== 4902) throw err;
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: chain.hexId,
          chainName: chain.name,
          nativeCurrency: chain.nativeCurrency,
          rpcUrls: chain.rpcUrls,
          blockExplorerUrls: chain.blockExplorerUrls,
        }],
      });
    }
  }

  async function connect(connectorId?: string): Promise<EvmAccount> {
    const id = connectorId ?? connectors().find((c) => c.ready)?.id;
    const provider = id ? providerFor(id) : null;
    if (!id || !provider) throw new EvmWalletError('no-provider', 'No browser wallet found');
    awaitingWallet = false;
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    const first = Array.isArray(accounts) ? accounts[0] : undefined;
    if (typeof first !== 'string' || !isEvmAddress(first)) {
      throw new EvmWalletError('no-account', 'The wallet shared no account');
    }
    await ensureChain(provider);
    bind(provider, id);
    store.set(OFF_KEY, null);
    store.set(CONNECTOR_KEY, id);
    setAccount({ address: first, connector: id });
    return account!;
  }

  async function restore(): Promise<EvmAccount | null> {
    if (account) return account;
    if (store.get(OFF_KEY) === '1') return null;
    // The wallet used last time, when it is here; else the usual pick.
    const remembered = store.get(CONNECTOR_KEY);
    const id = (remembered && providerFor(remembered) ? remembered : null)
      ?? connectors().find((c) => c.ready)?.id;
    const provider = id ? providerFor(id) : null;
    if (!id || !provider) {
      awaitingWallet = true;
      return null;
    }
    awaitingWallet = false;
    try {
      const accounts = await provider.request({ method: 'eth_accounts' });
      const first = Array.isArray(accounts) ? accounts[0] : undefined;
      if (typeof first !== 'string' || !isEvmAddress(first)) return null;
      bind(provider, id);
      setAccount({ address: first, connector: id });
      return account;
    } catch {
      return null;
    }
  }

  async function rpcCall(to: string, data: string): Promise<unknown> {
    const res = await fetch(options.rpcUrl!, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to, data }, 'latest'] }),
    });
    if (!res.ok) throw new EvmWalletError('failed', `RPC answered ${res.status}`);
    const body = await res.json() as { result?: unknown; error?: unknown };
    if (body.error || body.result === undefined) throw new EvmWalletError('failed', 'RPC returned an error');
    return body.result;
  }

  async function balanceOf(token: string, owner?: string): Promise<bigint> {
    const who = owner ?? account?.address;
    if (!who) throw new EvmWalletError('no-account', 'No EVM account connected');
    if (!isEvmAddress(token)) throw new EvmWalletError('failed', 'Not a token address');
    const data = encodeBalanceOf(who);
    if (options.rpcUrl) return decodeUint256(await rpcCall(token, data));

    const provider = bound?.provider;
    if (!provider) throw new EvmWalletError('no-provider', 'No browser wallet connected');
    // Checked before AND after, as nimiq.markets does: a wallet answers for
    // whatever chain it is on, the same token address can exist on another
    // chain, and the user can switch between the two requests.
    const onChain = async (): Promise<void> => {
      const have = String(await provider.request({ method: 'eth_chainId' })).toLowerCase();
      if (have !== chain.hexId) {
        throw new EvmWalletError('wrong-chain', `The wallet is on chain ${have}, not ${chain.hexId}`);
      }
    };
    await onChain();
    const result = await provider.request({ method: 'eth_call', params: [{ to: token, data }, 'latest'] });
    await onChain();
    return decodeUint256(result);
  }

  const unsubDiscovery = discovery.onChange(() => {
    for (const cb of [...connectorListeners]) cb();
    // A wallet that announced after restore() gave up is the wallet restore()
    // was waiting for.
    if (awaitingWallet && !account) void restore();
  });

  return {
    network,
    chain,
    tokens,
    get account() { return account; },
    get connectors() { return connectors(); },
    connect,
    restore,
    onAccountChange(cb) {
      accountListeners.add(cb);
      return () => { accountListeners.delete(cb); };
    },
    onConnectorsChange(cb) {
      connectorListeners.add(cb);
      return () => { connectorListeners.delete(cb); };
    },
    disconnect() {
      awaitingWallet = false;
      unbind();
      store.set(OFF_KEY, '1');
      setAccount(null);
    },
    balanceOf,
    provider: () => bound?.provider ?? null,
    destroy() {
      unsubDiscovery();
      unbind();
      discovery.destroy();
      accountListeners.clear();
      connectorListeners.clear();
    },
  };
}

