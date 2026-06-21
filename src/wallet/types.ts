// Shared wallet types for the dual-mode wallet.
//
// One unified surface (createWallet) that auto-detects the runtime and routes
// each call to the right backend:
//   - MINI-APP mode: running inside Nimiq Pay → the official @nimiq/mini-app-sdk
//     (window.nimiq / window.nimiqPay).
//   - HUB mode (standalone web): the @nimiq/hub-api popup/redirect flow, the
//     same pattern Hashmark ships.

/** The selected account, normalised across both backends. */
export interface Account {
  /** User-friendly Nimiq address, e.g. "NQ07 0000 0000 …". */
  address: string;
  /** Wallet-supplied label, or a derived/empty string when none is available. */
  label: string;
}

/** Which backend a wallet instance is bound to. */
export type WalletMode = 'miniapp' | 'hub';

/** Arguments for a basic NIM transfer (value in Luna; 1 NIM = 1e5 Luna). */
export interface SendArgs {
  recipient: string;
  /** Amount in Luna (integer). */
  valueLuna: number;
  /** Optional fee in Luna. Defaults to 0. */
  feeLuna?: number;
  /**
   * Optional transaction data. A UTF-8 string or raw bytes. Apps that mint
   * cashlinks pass their own offline-encoded payload here — there is no
   * cashlink method on this shell by design.
   */
  data?: string | Uint8Array;
  /** Optional explicit validity-start height. Auto-filled when omitted. */
  validityStartHeight?: number;
}

/** Result of signAndSend. */
export interface SendResult {
  /**
   * Transaction hash when the backend returns one (Hub). In mini-app mode the
   * SDK returns the serialized transaction rather than a hash; `txHash` then
   * carries that serialized form so callers always get a non-empty handle, and
   * `serializedTx` is set too. Check `serializedTx` if you need to distinguish.
   */
  txHash: string;
  /** Serialized transaction hex, when the backend returns one. */
  serializedTx?: string;
}

/** Listener invoked whenever the connected account changes (or clears). */
export type AccountChangeListener = (account: Account | null) => void;

/** The unified wallet handle returned by createWallet. */
export interface Wallet {
  /** The detected runtime backend. */
  readonly mode: WalletMode;
  /** The currently connected account, or null when not connected. */
  account: Account | null;
  /** Open the wallet's connect/choose-address flow. Resolves the account, or
   *  null on mobile Hub redirect (the onAccountChange listener fires on return). */
  connect(): Promise<Account | null>;
  /** Sign and broadcast a basic transaction. Routes to the active backend. */
  signAndSend(args: SendArgs): Promise<SendResult>;
  /** Subscribe to account changes. Returns an unsubscribe function. */
  onAccountChange(cb: AccountChangeListener): () => void;
  /** Forget the connected account (local only — does not revoke the wallet). */
  disconnect(): void;
}

/** Options for createWallet. */
export interface CreateWalletOptions {
  /** App name shown in the Hub popup/redirect. Default "Nimiq App". */
  appName?: string;
  /**
   * Force a backend instead of auto-detecting. Useful for tests and for apps
   * that know their context. Default: auto-detect.
   */
  mode?: WalletMode | 'auto';
  /** Hub endpoint. Default "https://hub.nimiq.com". */
  hubEndpoint?: string;
  /**
   * init() timeout (ms) for the mini-app SDK when auto-detecting. The SDK polls
   * for window.nimiq and times out standalone. Default 1500ms — long enough for
   * a real Nimiq Pay host to inject, short enough not to stall standalone boot.
   * Only used when window.nimiqPay is absent but we still probe.
   */
  miniAppInitTimeout?: number;
}
