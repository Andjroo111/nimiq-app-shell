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

/** Which Keyguard envelope produced a signature. The two values match
 *  nimiq-keyguard SignMessagePrefix (ClientEnums.js:53-54). */
export type SignMessagePrefix = 'signed-message' | 'connect-challenge' | 'unknown';

// FROZEN as of 0.29.0, INCLUDING the `prefix` field: out-of-package verifiers
// pin this exact shape and read its fields by name, so renaming, removing or
// retyping one here is a BREAKING change for them, not an internal refactor.
// Add a field if you must; never alter one.
/** Result of signMessage — a wallet-ownership proof, normalised across both
 *  backends to hex strings. The shape matches the `{ address, message,
 *  publicKeyHex, signatureHex }` proof that Nimiq signed-message verifiers
 *  (e.g. @nimiq-captcha/core's verifySignedMessage) consume, so a consumer can
 *  hand `wallet.signMessage` straight into a Sign-in-with-Nimiq flow. */
export interface SignMessageResult {
  /** The connected account that produced the signature. */
  address: string;
  /** The exact message string that was signed, echoed back. */
  message: string;
  /** Signer Ed25519 public key, hex (32 bytes → 64 hex chars). */
  publicKeyHex: string;
  /** Ed25519 signature over the Nimiq-prefixed message hash, hex (64 bytes). */
  signatureHex: string;
  /**
   * Which envelope the signature was produced under. Hub mode is always
   * 'signed-message'. Mini-app mode is 'unknown', because the Pay SDK does not
   * report which envelope it used.
   *
   * A verifier MUST treat 'unknown' as a decision it has to make, never as a
   * default to 'signed-message': the Keyguard signs sign-in challenges under
   * CONNECT_CHALLENGE precisely so they cannot be replayed as ordinary signed
   * messages, and assuming the wrong envelope is the impersonation that
   * separation exists to prevent.
   */
  prefix: SignMessagePrefix;
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
  /** The full wallet-UI payment flow — the user approves in their wallet and
   *  the transaction is BROADCAST before this resolves. Hub mode: the CHECKOUT
   *  popup (the Hub transmits itself; no chain access needed here). Mini-app
   *  mode: the host wallet's native send. This is what a generic "Send" button
   *  should call; signAndSend is the low-level building block for app-specific
   *  flows that broadcast on their own. */
  pay(args: SendArgs): Promise<SendResult>;
  /** Sign a UTF-8 message to prove control of the connected wallet
   *  (Sign-in-with-Nimiq / wallet-proof). Requires a connected account; throws
   *  otherwise. The wallet applies the Nimiq signed-message prefix, so pass the
   *  verifier's canonical message string unmodified. */
  signMessage(message: string): Promise<SignMessageResult>;
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
   * Mini-app mode: the budget (ms) passed to the SDK's `init({ timeout })` when
   * `window.nimiq` is not yet injected at first connect. The SDK polls for the
   * provider; an outer race gives up 800ms past this budget in case the WebView
   * never settles. Default: 8000ms when a Nimiq Pay host is hinted
   * (window.nimiqPay, window.nimiq or a NimiqPay user agent), else 1200ms.
   * Does not affect which mode createWallet picks; that is detectModeSync. For
   * an async mode decision see detectMode().
   */
  miniAppInitTimeout?: number;
  /**
   * Hub mode: remember the connected account (address + label — public data,
   * no keys) in localStorage so a reload doesn't force a reconnect. Default
   * true. Mini-app mode ignores this (the host wallet is the session).
   */
  persist?: boolean;
}
