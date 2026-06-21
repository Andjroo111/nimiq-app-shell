// Mini-app backend — wraps the official @nimiq/mini-app-sdk provider
// (window.nimiq) injected by Nimiq Pay.
//
// Method shapes are taken verbatim from @nimiq/mini-app-sdk@0.1.0:
//   listAccounts(): Promise<string[] | ErrorResponse>
//   sendBasicTransaction({recipient, value, fee?, validityStartHeight?})
//       : Promise<string | ErrorResponse>   // value/fee in Luna
//   sendBasicTransactionWithData({recipient, value, data, fee?, ...})
//       : Promise<string | ErrorResponse>
// The send methods return the SERIALIZED transaction (hex), not a hash.

import type { Account, SendArgs, SendResult } from './types';
import { type WalletBackend, dataToHex } from './backend';

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
  connect?(): Promise<void>;
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

function unwrap<T>(v: T | { error: { type: string; message: string } }): T {
  if (isErrorResponse(v)) {
    throw new Error(`Nimiq Pay: ${v.error.message ?? v.error.type ?? 'request failed'}`);
  }
  return v;
}

export interface MiniAppBackendOptions {
  /** Pre-resolved provider (window.nimiq, or a test fake). When omitted the
   *  backend resolves it lazily via getProvider(). */
  provider?: MiniAppProvider;
  /** Resolve the provider lazily — defaults to reading window.nimiq, and if
   *  absent, calling the SDK's init() (which polls Nimiq Pay). */
  getProvider?: () => Promise<MiniAppProvider>;
}

async function defaultGetProvider(): Promise<MiniAppProvider> {
  if (typeof window !== 'undefined' && window.nimiq) {
    return window.nimiq as unknown as MiniAppProvider;
  }
  // Lazy-load the real SDK only when we actually need to bootstrap it; keeps it
  // out of the standalone (Hub) code path.
  const sdk = await import('@nimiq/mini-app-sdk');
  const provider = await sdk.init();
  return provider as unknown as MiniAppProvider;
}

export class MiniAppBackend implements WalletBackend {
  readonly mode = 'miniapp' as const;
  private provider: MiniAppProvider | null;
  private getProviderFn: () => Promise<MiniAppProvider>;
  private onChange: ((account: Account | null) => void) | null = null;
  private current: Account | null = null;

  constructor(opts: MiniAppBackendOptions = {}) {
    this.provider = opts.provider ?? null;
    this.getProviderFn = opts.getProvider ?? defaultGetProvider;
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
    const accounts = unwrap(await provider.listAccounts());
    const address = accounts[0];
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
    const dataHex = dataToHex(args.data);
    let serialized: string;
    if (dataHex !== undefined) {
      serialized = unwrap(
        await provider.sendBasicTransactionWithData({
          recipient: args.recipient,
          value: args.valueLuna,
          data: dataHex,
          fee,
          validityStartHeight: args.validityStartHeight,
        }),
      );
    } else {
      serialized = unwrap(
        await provider.sendBasicTransaction({
          recipient: args.recipient,
          value: args.valueLuna,
          fee,
          validityStartHeight: args.validityStartHeight,
        }),
      );
    }
    // The SDK returns the serialized tx, not a hash. Surface it as both so
    // callers always get a non-empty handle.
    return { txHash: serialized, serializedTx: serialized };
  }

  disconnect(): void {
    this.current = null;
    this.onChange?.(null);
  }
}
