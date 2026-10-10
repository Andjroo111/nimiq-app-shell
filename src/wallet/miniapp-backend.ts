// Mini-app backend — wraps the official @nimiq/mini-app-sdk provider
// (window.nimiq) injected by Nimiq Pay.
//
// Method shapes are taken from @nimiq/mini-app-sdk@0.2.4:
//   listAccounts(): Promise<string[] | ErrorResponse>
//   sendBasicTransaction({recipient, value, fee?, validityStartHeight?})
//       : Promise<string | ErrorResponse>   // value/fee in Luna
//   sendBasicTransactionWithData({recipient, value, data, fee?, ...})
//       : Promise<string | ErrorResponse>   // data is HEX, never plaintext
// The send methods return the SERIALIZED transaction (hex), not a hash.
//
// Two error shapes reach this file. A raw window.nimiq still RETURNS
// { error } (the 0.1 contract). The provider 0.2's init() hands back is a
// Proxy that THROWS a NimiqProviderError { type, message, code } instead.
// call() folds both into one Error, so a closed sheet reads as a cancel on
// either path (recon W-261009-159).

import type { Account, SendArgs, SendResult, SignMessageResult } from './types';
import { type WalletBackend, dataToHex } from './backend';
import { errorMessage, hasHostHint, recordWalletDiagnostics } from './detect';
import { loadMiniAppSdk } from './sdk-loader';
import { withTimeout } from './timeout';
import { waitForSendReady } from './send-ready';
import { resolveValidityStartHeight } from './validity';
import { createNimAccountReader, type NimAccount } from './account';
import { RPC_ENDPOINTS } from 'nimiq-settlement';

/** The slice of the SDK provider this backend depends on. window.nimiq from
 *  @nimiq/mini-app-sdk satisfies it; tests inject a fake of the same shape. */
export interface MiniAppProvider {
  listAccounts(): Promise<string[] | { error: { type: string; message: string } }>;
  sendBasicTransaction(tx: {
    recipient: string;
    value: number;
    fee?: number;
    validityStartHeight?: number;
  }): Promise<string | { error: { type: string; message: string } }>;
  sendBasicTransactionWithData(tx: {
    recipient: string;
    value: number;
    data: string;
    fee?: number;
    validityStartHeight?: number;
  }): Promise<string | { error: { type: string; message: string } }>;
  sign(
    message: string | { message: string; isHex?: boolean },
  ): Promise<
    { publicKey: string; signature: string } | { error: { type: string; message: string } }
  >;
  connect?(): Promise<void>;
  /** Present on every real Pay provider (0.1 and 0.2); absent on test fakes,
   *  which is why the send prep below is skipped for them. */
  isConsensusEstablished?(): Promise<unknown>;
  getBlockNumber?(): Promise<unknown>;
}

function isErrorResponse(
  v: unknown,
): v is { error: { type: string; message: string } } {
  return (
    typeof v === 'object' &&
    v !== null &&
    'error' in v &&
    typeof (v as { error?: unknown }).error === 'object'
  );
}

// The decline words outcome.ts classifies as a cancel. A NimiqProviderError
// can carry them in `type` alone (PERMISSION_DENIED for code 4001), so a type
// that says decline is appended when the message does not.
const DECLINE_RE = /reject|declin|cancel|denied|abort/i;

/** One Error for both shapes, keeping `type` and the original as `cause`. */
function payError(e: { type?: unknown; message?: unknown }, cause: unknown): Error {
  const type = typeof e.type === 'string' ? e.type : '';
  let text = typeof e.message === 'string' && e.message ? e.message : type || 'request failed';
  if (type && DECLINE_RE.test(type) && !DECLINE_RE.test(text)) text += ` (${type})`;
  const err = new Error(`Nimiq Pay: ${text}`, { cause }) as Error & { type?: string };
  if (type) err.type = type;
  return err;
}

function unwrap<T>(v: T | { error: { type: string; message: string } }): T {
  if (isErrorResponse(v)) throw payError(v.error, v);
  return v;
}

/** Await a provider call under either error contract. */
async function call<T>(p: Promise<T | { error: { type: string; message: string } }>): Promise<T> {
  let v: T | { error: { type: string; message: string } };
  try {
    v = await p;
  } catch (err) {
    // A NimiqProviderError (or its plain-object twin) carries a string type.
    if (err && typeof err === 'object' && typeof (err as { type?: unknown }).type === 'string') {
      throw payError(err as { type?: unknown; message?: unknown }, err);
    }
    throw err;
  }
  return unwrap(v);
}

/** Map window.nimiqPay.network (SDK 0.2.4 hosts) onto settlement's names. */
function hostNetwork(): 'main' | 'test' | undefined {
  const n = typeof window !== 'undefined' ? (window.nimiqPay as { network?: unknown } | undefined)?.network : undefined;
  return n === 'mainnet' ? 'main' : n === 'testnet' ? 'test' : undefined;
}

export interface MiniAppBackendOptions {
  /** Pre-resolved provider (window.nimiq, or a test fake). When omitted the
   *  backend resolves it lazily via getProvider(). */
  provider?: MiniAppProvider;
  /** Resolve the provider lazily — defaults to reading window.nimiq, and if
   *  absent, calling the SDK's init() (which polls Nimiq Pay). */
  getProvider?: () => Promise<MiniAppProvider>;
  /** Budget (ms) passed to the SDK's `init({ timeout })` when the default
   *  provider resolver has to bootstrap it. Default: 8000 with a host hint,
   *  else 1200. createWallet threads `miniAppInitTimeout` into this. */
  initTimeout?: number;
  /** How long a send waits for the wallet's consensus before refusing.
   *  Default 20000 (GatePass, recon W-261009-01). Nothing is sent on a refusal. */
  consensusTimeoutMs?: number;
  /** The independent chain head for validityStartHeight. Default: the public
   *  RPC for the host's declared network. Tests inject a stub. */
  readRpcHead?: () => Promise<number | null>;
  /** Classify a listed address. Default: getAccountByAddress over the public
   *  RPC. Used only when Pay lists more than one address. */
  readAccount?: (address: string) => Promise<NimAccount>;
  /** @internal Tests only: the poll clock handed to waitForSendReady. */
  sendReadyClock?: { sleep?: (ms: number) => Promise<void>; now?: () => number; pollMs?: number; graceMs?: number };
}

/** The outer race sits this far past the init budget (C1-465). */
const INIT_RACE_SLACK_MS = 800;

/** Host-aware init budget: 8000ms when a Nimiq Pay host is hinted (the
 *  same total as the detectMode ladder, which C1-373 measured on slow
 *  Android; the SDK used to wait ~10s here, so a shorter budget would fail
 *  hosts that work today),
 *  else 1200ms, unless the caller set one. */
function initBudgetMs(initTimeout?: number): number {
  if (initTimeout !== undefined) return initTimeout;
  return hasHostHint() ? 8000 : 1200;
}

async function defaultGetProvider(initTimeout?: number): Promise<MiniAppProvider> {
  const start = Date.now();
  const budgetMs = initBudgetMs(initTimeout);
  if (typeof window !== 'undefined' && window.nimiq) {
    recordWalletDiagnostics({
      sdkImported: false,
      resolvedVia: 'window.nimiq',
      initError: null,
      elapsedMs: Date.now() - start,
      budgetMs,
      provider: window.nimiq,
    });
    return window.nimiq as unknown as MiniAppProvider;
  }
  // Lazy-load the real SDK only when we actually need to bootstrap it; keeps it
  // out of the standalone (Hub) code path.
  let sdkImported = false;
  let initError: string | null = null;
  let provider: unknown = null;
  try {
    const sdk = await loadMiniAppSdk();
    sdkImported = true;
    // init is read-only bootstrap, so a timeout is safe here (never on a send).
    // The outer race covers a suspended WebView whose init never settles.
    provider = await withTimeout(
      sdk.init({ timeout: budgetMs }),
      budgetMs + INIT_RACE_SLACK_MS,
      null,
    );
    if (!provider) initError = `init did not settle within ${budgetMs + INIT_RACE_SLACK_MS}ms`;
  } catch (err) {
    initError = errorMessage(err);
  }
  recordWalletDiagnostics({
    sdkImported,
    resolvedVia: provider ? 'sdk-init' : 'fallback',
    initError,
    elapsedMs: Date.now() - start,
    budgetMs,
    provider: provider ?? undefined,
  });
  if (!provider) throw new Error(`Nimiq Pay: ${initError ?? 'provider unavailable'}`);
  return provider as MiniAppProvider;
}

export class MiniAppBackend implements WalletBackend {
  readonly mode = 'miniapp' as const;
  private provider: MiniAppProvider | null;
  private getProviderFn: () => Promise<MiniAppProvider>;
  private onChange: ((account: Account | null) => void) | null = null;
  private current: Account | null = null;
  private opts: MiniAppBackendOptions;

  constructor(opts: MiniAppBackendOptions = {}) {
    this.opts = opts;
    this.provider = opts.provider ?? null;
    this.getProviderFn = opts.getProvider ?? (() => defaultGetProvider(opts.initTimeout));
  }

  /**
   * Pay can list an HTLC next to the user's basic wallet (NimCarry saw it on
   * a live testnet run, recon W-261009-85). An HTLC is a payment rail, not a
   * person, so it must never become the identity. With one address there is
   * nothing to choose; with several, the first one the chain calls `basic`
   * wins. A known non-basic or unknown type is dropped (fail closed). When
   * the RPC cannot be reached at all, Pay's own order stands, because
   * refusing every sign-in during an RPC outage is the worse failure.
   */
  private async pickIdentity(accounts: string[]): Promise<string | undefined> {
    if (accounts.length <= 1) return accounts[0];
    const read = this.opts.readAccount ?? createNimAccountReader({ rpc: hostNetwork() === 'test' ? RPC_ENDPOINTS.test[0] : undefined });
    const kinds = await Promise.all(accounts.map((a) => read(a).then((r) => r.type, () => null)));
    if (kinds.every((k) => k === null)) return accounts[0];
    return accounts.find((_, i) => kinds[i] === 'basic');
  }

  /** Wait for consensus, then pick a fresh validityStartHeight. Runs only
   *  against a provider that exposes the sync probes. */
  private async prepareSend(provider: MiniAppProvider, args: SendArgs): Promise<number | undefined> {
    if (typeof provider.isConsensusEstablished !== 'function') return args.validityStartHeight;
    // Already in sync is the common case: skip waitForSendReady's grace sleep.
    const now = await provider.isConsensusEstablished().then((v) => v === true, () => false);
    if (!now) {
      const r = await waitForSendReady(provider, {
        ...this.opts.sendReadyClock,
        timeoutMs: this.opts.consensusTimeoutMs ?? 20_000,
      });
      if (!r.ready) throw new Error('Nimiq Pay: still syncing with the network, nothing was sent. Try again in a moment');
    }
    if (args.validityStartHeight !== undefined) return args.validityStartHeight;
    // The demo provider promises no chain contact, so it never reads the RPC.
    const demo = (provider as { isDemo?: unknown }).isDemo === true;
    const readRpcHead = this.opts.readRpcHead ?? (demo ? async () => null : undefined);
    return resolveValidityStartHeight(provider, { readRpcHead, network: hostNetwork() });
  }

  private async resolveProvider(): Promise<MiniAppProvider> {
    if (!this.provider) this.provider = await this.getProviderFn();
    return this.provider;
  }

  setAccountChange(cb: (account: Account | null) => void): void {
    this.onChange = cb;
  }

  async connect(): Promise<Account | null> {
    const provider = await this.resolveProvider();
    if (provider.connect) await provider.connect();
    const accounts = await call(provider.listAccounts());
    const address = await this.pickIdentity(accounts);
    if (!address) {
      this.current = null;
      this.onChange?.(null);
      return null;
    }
    // The mini-app SDK exposes addresses only — no label channel. The host
    // language / chrome lives in window.nimiqPay, not per-account labels.
    this.current = { address, label: '' };
    this.onChange?.(this.current);
    return this.current;
  }

  async signAndSend(args: SendArgs): Promise<SendResult> {
    const provider = await this.resolveProvider();
    const fee = args.feeLuna ?? 0;
    // Pay reads `data` as HEX and silently drops anything else, so a
    // plaintext memo arrives as an empty one and every memo-matched watcher
    // misses the payment (recon W-261009-19). dataToHex is the only route in.
    const dataHex = dataToHex(args.data);
    const validityStartHeight = await this.prepareSend(provider, args);
    let serialized: string;
    if (dataHex !== undefined) {
      serialized = await call(
        provider.sendBasicTransactionWithData({
          recipient: args.recipient,
          value: args.valueLuna,
          data: dataHex,
          fee,
          validityStartHeight,
        }),
      );
    } else {
      serialized = await call(
        provider.sendBasicTransaction({
          recipient: args.recipient,
          value: args.valueLuna,
          fee,
          validityStartHeight,
        }),
      );
    }
    // The SDK returns the serialized tx, not a hash. Surface it as both so
    // callers always get a non-empty handle.
    return { txHash: serialized, serializedTx: serialized };
  }

  /** Inside Nimiq Pay the native send IS the full wallet flow (the host
   *  confirms and broadcasts) — pay and signAndSend are the same thing here. */
  pay(args: SendArgs): Promise<SendResult> {
    return this.signAndSend(args);
  }

  async signMessage(message: string): Promise<SignMessageResult> {
    const provider = await this.resolveProvider();
    // The mini-app SignatureResult carries no address, so we return the
    // connected account — require a prior connect().
    if (!this.current) {
      throw new Error('Nimiq Pay: connect a wallet before signing');
    }
    // The SDK already returns publicKey/signature as hex strings — pass them
    // straight through. NOTE: whether Nimiq Pay applies the same Nimiq
    // signed-message prefix Hub/Keyguard does is not provable from the SDK
    // types; the Hub path is the interop-verified one (see PR notes).
    //
    // That is why `prefix` is 'unknown' here and not 'signed-message'. The
    // Keyguard has TWO envelopes (ClientEnums.js: SIGNED_MESSAGE and
    // CONNECT_CHALLENGE), and it signs sign-in challenges under the second one
    // "to avoid blind signing as a regular Nimiq message, which could be used
    // to impersonate the user". Guessing SIGNED_MESSAGE here would hand a
    // verifier exactly that assumption. The caller decides.
    const result = await call(provider.sign(message));
    return {
      address: this.current.address,
      message,
      publicKeyHex: result.publicKey,
      signatureHex: result.signature,
      prefix: 'unknown',
    };
  }

  disconnect(): void {
    this.current = null;
    this.onChange?.(null);
  }
}
