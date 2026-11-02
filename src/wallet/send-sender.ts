// Did the payment leave from the account this session signed in with?
// (recon C2-441, from Nimiqgram's TipModal getTransactionSender; MIT)
//
// Nimiq Pay holds several accounts and can send from a different one than the
// wallet the app's session is bound to. The server then sees a payment from a
// stranger, refuses it, and the user has paid for nothing. When the wallet hands
// back the SERIALIZED tx, its sender can be read before anything is posted, and
// the user told plainly what happened.
//
// Decoding a serialized tx needs @nimiq/core, which this package will not take
// on (see send-handle.ts), so the decoder is injected: the fleet deriver
// (Andjroo111/nimiq-edge) or the app's own. A hash-only or opaque handle has no
// sender to read: that is "unknown", and the server's own sender check decides.

import type { SendHandle } from './send-handle';

/** Reads the sender's user-friendly address out of a serialized tx, or null if it cannot. */
export type SenderDecoder = (serializedTx: string) => string | null;

export type SenderCheck =
  | { state: 'match' }
  | { state: 'mismatch'; sender: string; expected: string; message: string }
  | { state: 'unknown'; why: 'no-serialized-tx' | 'no-decoder' | 'undecodable' };

/** The words a user sees when Nimiq Pay sent from another of their accounts. */
export const DIFFERENT_ACCOUNT_MESSAGE =
  'This payment was sent from a different Nimiq Pay account than the one you signed in with.';

const addr = (a: string) => a.replace(/\s+/g, '').toUpperCase();

export function checkSendSender(
  handle: SendHandle | null,
  sessionAddress: string,
  decode?: SenderDecoder,
): SenderCheck {
  if (handle?.kind !== 'serialized') return { state: 'unknown', why: 'no-serialized-tx' };
  if (!decode) return { state: 'unknown', why: 'no-decoder' };
  let sender: string | null = null;
  try {
    sender = decode(handle.serializedTx);
  } catch {
    sender = null;
  }
  if (typeof sender !== 'string' || addr(sender) === '') return { state: 'unknown', why: 'undecodable' };
  if (addr(sender) === addr(sessionAddress)) return { state: 'match' };
  return { state: 'mismatch', sender, expected: sessionAddress, message: DIFFERENT_ACCOUNT_MESSAGE };
}
