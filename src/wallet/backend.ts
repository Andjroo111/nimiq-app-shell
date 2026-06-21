// The backend seam: both the mini-app and Hub implementations satisfy this,
// and createWallet routes the unified API to whichever one the runtime selected.

import type { Account, SendArgs, SendResult } from './types';

export interface WalletBackend {
  readonly mode: 'miniapp' | 'hub';
  /** Open the connect flow. Resolves an account, or null on a mobile Hub
   *  redirect (the account arrives via the change callback on return). */
  connect(): Promise<Account | null>;
  /** Sign + broadcast a basic transaction on the active backend. */
  signAndSend(args: SendArgs): Promise<SendResult>;
  /** Register the callback createWallet uses to keep its `account` in sync and
   *  fan out to onAccountChange subscribers. */
  setAccountChange(cb: (account: Account | null) => void): void;
  /** Local disconnect. */
  disconnect(): void;
}

/** Encode SendArgs.data to the hex string the mini-app SDK expects, or to the
 *  Uint8Array the Hub expects. Centralised so both backends agree. */
export function dataToHex(data: string | Uint8Array | undefined): string | undefined {
  if (data == null) return undefined;
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  if (bytes.length === 0) return undefined;
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex;
}

/** Encode SendArgs.data to the Uint8Array the Hub extraData field expects. */
export function dataToBytes(data: string | Uint8Array | undefined): Uint8Array | undefined {
  if (data == null) return undefined;
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  return bytes.length === 0 ? undefined : bytes;
}
