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

import type { Account, SendArgs, SendResult, SignMessageResult } from './types';
import { type WalletBackend, dataToBytes, bytesToHex } from './backend';

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
  checkout(
    req: {
      appName: string;
      sender?: string;
      forceSender?: boolean;
      recipient: string;
      value: number;
      fee?: number;
      extraData?: Uint8Array;
    },
    behavior?: unknown,
  ): Promise<{ serializedTx: string; hash: string }>;
  signMessage(
    req: { appName: string; signer?: string; message: string | Uint8Array },
    behavior?: unknown,
  ): Promise<{ signer: string; signerPublicKey: Uint8Array; signature: Uint8Array }>;
  on?(...args: unknown[]): void;
  checkRedirectResponse?(): Promise<void>;
}

// A local isMobileUA() lived here to seed the unread `mobile` field; it went
// with it. hub-api owns the popup-vs-redirect decision (see `isMobile` below).

export interface HubBackendOptions {
  appName?: string;
  hubEndpoint?: string;
  /** Pre-built client (a HubApi, or a test fake). */
  client?: HubClient;
  /** Lazy client builder; defaults to constructing @nimiq/hub-api. */
  getClient?: () => Promise<HubClient>;
  /** Override mobile detection (mainly for tests).
   *
   *  CURRENTLY INERT, and deliberately kept in the signature. The backend used
   *  to store this and never read it, which read like the popup-vs-redirect
   *  choice described at the top of this file was ours to make. It is not:
   *  @nimiq/hub-api's default RequestBehavior already picks the popup on
   *  desktop and the full-page redirect on mobile, so a second detector here
   *  only had the power to disagree with the one actually in charge.
   *
   *  It stays accepted because callers and tests pass it, and dropping it would
   *  break them for no gain. Wire it only if the shell ever needs to FORCE a
   *  behavior (passing an explicit RequestBehavior to the hub calls) rather
   *  than detect one. */
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
  private getBlockHeight?: () => Promise<number>;
  private onChange: ((account: Account | null) => void) | null = null;
  private current: Account | null = null;

  constructor(opts: HubBackendOptions = {}) {
    this.appName = opts.appName ?? 'Nimiq App';
    this.endpoint = opts.hubEndpoint ?? DEFAULT_HUB_ENDPOINT;
    this.client = opts.client ?? null;
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

  /** The full wallet-UI payment flow: the Hub CHECKOUT popup signs AND
   *  broadcasts (its transmission step calls the network itself — verified in
   *  hub src CheckoutTransmission.vue), so callers need no chain access. The
   *  connected account is pinned as the forced sender. Mobile uses the Hub's
   *  redirect flow: this resolves with the result on the return trip. */
  async pay(args: SendArgs): Promise<SendResult> {
    const client = await this.resolveClient();
    if (!this.current) {
      throw new Error('Hub: connect a wallet before paying');
    }
    const result = await client.checkout({
      appName: this.appName,
      sender: this.current.address,
      forceSender: true,
      recipient: args.recipient,
      value: args.valueLuna,
      fee: args.feeLuna ?? 0,
      extraData: dataToBytes(args.data),
    });
    return { txHash: result.hash, serializedTx: result.serializedTx };
  }

  async signMessage(message: string): Promise<SignMessageResult> {
    const client = await this.resolveClient();
    if (!this.current) {
      throw new Error('Hub: connect a wallet before signing');
    }
    // Hub/Keyguard applies the Nimiq signed-message prefix to the STRING
    // message before hashing+signing, and returns the pubkey/signature as raw
    // bytes — hex-encode them into the proof shape a verifier deserialises.
    const result = await client.signMessage({
      appName: this.appName,
      signer: this.current.address,
      message,
    });
    return {
      address: this.current.address,
      message,
      publicKeyHex: bytesToHex(result.signerPublicKey),
      signatureHex: bytesToHex(result.signature),
    };
  }

  disconnect(): void {
    this.current = null;
    this.onChange?.(null);
  }
}
