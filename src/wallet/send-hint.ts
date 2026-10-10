// What to tell a user whose send failed, beyond "it failed" (recon W-261009-97).
//
// Nimiq Pay answers "Transaction value exceeds balance" when the balance is
// there but not yet spendable: an incoming payment is still confirming. Shown
// raw it reads as "you are broke", and the user writes to support. Two more
// failures have a known, harmless cause the user can act on: a wallet still
// syncing, and a validity window that closed before the send. In all three
// nothing left the wallet.
//
// Pure: no DOM, no I/O. The hint is an i18n key, so every app shows it in the
// user's language; `detail` is the wallet's own words for a bug report or an
// admin alert, capped so it fits one.

import { describeWalletError, type WalletErrorKind } from './outcome';
import { isValidityWindowError } from './validity';

export type SendFailureReason = 'unconfirmed-balance' | 'syncing' | 'validity-window';

export interface SendFailure {
  kind: WalletErrorKind;
  /** Null for a cancel: closing the sheet is not a failure to explain. */
  reason: SendFailureReason | null;
  /** Shell i18n key for the one-line hint, or null when there is none. */
  hintKey: string | null;
  /** The wallet's own words, whitespace collapsed, at most 240 chars. */
  detail: string;
}

/** The hint each known reason maps to. */
export const SEND_HINT_KEYS: Record<SendFailureReason, string> = {
  'unconfirmed-balance': 'shell.hintUnconfirmed',
  syncing: 'shell.hintSyncing',
  'validity-window': 'shell.hintExpired',
};

const UNCONFIRMED_RE = /value exceeds balance|insufficient (spendable|available)|balance (is )?(still )?(pending|unconfirmed)/i;
const SYNCING_RE = /still syncing|syncing your account|no consensus|consensus not established/i;

export const SEND_DETAIL_MAX = 240;

export function describeSendFailure(err: unknown): SendFailure {
  const { kind, message } = describeWalletError(err);
  const detail = message.replace(/\s+/g, ' ').trim().slice(0, SEND_DETAIL_MAX);
  let reason: SendFailureReason | null = null;
  // A cancel or a propagating tx gets no hint: one is a choice, the other worked.
  if (kind !== 'cancelled' && kind !== 'pending') {
    if (UNCONFIRMED_RE.test(message)) reason = 'unconfirmed-balance';
    else if (SYNCING_RE.test(message)) reason = 'syncing';
    else if (isValidityWindowError(err)) reason = 'validity-window';
  }
  return { kind, reason, hintKey: reason ? SEND_HINT_KEYS[reason] : null, detail };
}
