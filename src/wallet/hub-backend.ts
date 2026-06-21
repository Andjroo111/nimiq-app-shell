// Hub backend — standalone web wallet via @nimiq/hub-api, the same pattern
// Hashmark ships (app/src/client/hub.ts).
//
//   - chooseAddress: popup on desktop (resolves {address,label}); full-page
//     redirect on mobile (resolves null, result returns via hub.on()).
//   - signTransaction: a basic NIM transfer (recipientType=0, flags=0). HTLC /
//     contract-creation is intentionally NOT exposed here — apps that need it
//     drop to @nimiq/hub-api directly (see Hashmark signHtlcCreation).
//
// Hub auto-detect only recognises *.nimiq.com hosts; on any other origin it
// falls back to a dead localhost endpoint. So we pin hub.nimiq.com explicitly.

import type { Account, SendArgs, SendResult } from './types';
import { type WalletBackend, dataToBytes } from './backend';

const DEFAULT_HUB_ENDPOINT = 'https://hub.nimiq.com';

/** The slice of @nimiq/hub-api this backend uses. The real HubApi instance
 *  satisfies it; tests inject a fake of the same shape. */
export interface HubClient {
  chooseAddress(
    req: { appName: string },
    behavior?: unknown,
  ): Promise<{ address: string; label: string }>;
  signTransaction(
    req: {
      appName: string;
      sender: string;
      recipient: string;
      recipientType: number;
      value: number;
      fee: number;
      flags: number;
      extraData?: Uint8Array;
      validityStartHeight: number;
    },
    behavior?: unknown,
  ): Promise<{ serializedTx: string; hash: string }>;
  on?(...args: unknown[]): void;
  checkRedirectResponse?(): Promise<void>;
}

function isMobileUA(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  );
}

export interface HubBackendOptions {
  appName?: string;
  hubEndpoint?: string;
  /** Pre-built client (a HubApi, or a test fake). */
  client?: HubClient;
  /** Lazy client builder; defaults to constructing @nimiq/hub-api. */
  getClient?: () => Promise<HubClient>;
  /** Override mobile detection (mainly for tests). */
  isMobile?: boolean;
  /** A current block height supplier for validityStartHeight when the caller
   *  doesn't pass one. Optional — when absent we pass 0 and let Keyguard fill. */
  getBlockHeight?: () => Promise<number>;
}

export class HubBackend implements WalletBackend {
  readonly mode = 'hub' as const;
  private appName: string;
  private endpoint: string;
  private client: HubClient | null;
  private getClientFn: () => Promise<HubClient>;
  private mobile: boolean;
  private getBlockHeight?: () => Promise<number>;
  private onChange: ((account: Account | null) => void) | null = null;
  private current: Account | null = null;

  constructor(opts: HubBackendOptions = {}) {
    this.appName = opts.appName ?? 'Nimiq App';
    this.endpoint = opts.hubEndpoint ?? DEFAULT_HUB_ENDPOINT;
    this.client = opts.client ?? null;
    this.mobile = opts.isMobile ?? isMobileUA();
    this.getBlockHeight = opts.getBlockHeight;
    this.getClientFn =
      opts.getClient ??
      (async () => {
        const mod = await import('@nimiq/hub-api');
        const HubApi = (mod as { default: new (endpoint: string) => HubClient }).default;
        return new HubApi(this.endpoint);
      });
  }

  private async resolveClient(): Promise<HubClient> {
    if (!this.client) this.client = await this.getClientFn();
    return this.client;
  }

  setAccountChange(cb: (account: Account | null) => void): void {
    this.onChange = cb;
  }

  async connect(): Promise<Account | null> {
    const client = await this.resolveClient();
    // Desktop popup resolves directly; the mobile redirect path resolves null
    // and the consumer wires hub.on(CHOOSE_ADDRESS) for the return trip.
    const result = await client.chooseAddress({ appName: this.appName });
    if (!result) {
      return null;
    }
    this.current = { address: result.address, label: result.label ?? '' };
    this.onChange?.(this.current);
    return this.current;
  }

  async signAndSend(args: SendArgs): Promise<SendResult> {
    const client = await this.resolveClient();
    if (!this.current) {
      throw new Error('Hub: connect a wallet before sending');
    }
    let height = args.validityStartHeight ?? 0;
    if (args.validityStartHeight == null && this.getBlockHeight) {
      height = await this.getBlockHeight();
    }
    const result = await client.signTransaction({
      appName: this.appName,
      sender: this.current.address,
      recipient: args.recipient,
      recipientType: 0, // AccountType.Basic
      value: args.valueLuna,
      fee: args.feeLuna ?? 0,
      flags: 0, // TransactionFlag.None
      extraData: dataToBytes(args.data),
      validityStartHeight: height,
    });
    return { txHash: result.hash, serializedTx: result.serializedTx };
  }

  disconnect(): void {
    this.current = null;
    this.onChange?.(null);
  }
}
