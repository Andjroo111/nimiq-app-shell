// validityStartHeight from the freshest height we can see (recon C2-246).
//
// An Albatross tx is only valid for a window after its validityStartHeight.
// A half-synced Nimiq Pay light client fills in a stale height and the send
// fails with a "validity end" error. Pass the max of the wallet's height and
// an independent RPC head explicitly; either may be missing.

import { describeWalletError } from './outcome';

const ok = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n > 0;

/** The larger of the two heights, or undefined to let the wallet fill it in. */
export function pickValidityStartHeight(
  walletHeight: number | null | undefined,
  rpcHeight: number | null | undefined,
): number | undefined {
  const a = ok(walletHeight) ? walletHeight : undefined;
  const b = ok(rpcHeight) ? rpcHeight : undefined;
  if (a === undefined) return b;
  if (b === undefined) return a;
  return Math.max(a, b);
}

const VALIDITY_RE = /validity[\s_-]*(window|end|start)|transaction (has )?expired|invalid for (this|the current) (height|block)/i;

/** True when a send failed because its validity window had already closed.
 *  Nothing was sent; the user can safely pay again with a fresh height. */
export function isValidityWindowError(err: unknown): boolean {
  const { kind, message } = describeWalletError(err);
  return kind !== 'pending' && VALIDITY_RE.test(message);
}
