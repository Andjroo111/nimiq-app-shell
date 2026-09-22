// Wallet outcomes — one shape for "it worked", one shape for "it didn't", and
// the classifier that turns whatever a wallet threw into that second shape.
//
// Every wallet in the fleet rejects differently. Nimiq Pay throws a string, the
// Hub throws an object with a `message`, an injected provider throws
// `{ code: 4001, message: 'User rejected…' }`, and some hosts throw an envelope
// whose real error sits two or three keys down (`{ error: { data: { reason:
// '…' } } }`). Apps that did `String(e)` on those printed "[object Object]" at
// the user; apps that did `e.message` on a cancel showed a red failure banner
// to someone who simply changed their mind.
//
// So: `describeWalletError` digs the wallet's own words out of whatever it was
// handed, and sorts the result into four kinds an app can branch on, because
// the right UI answer differs for each:
//
//   cancelled   — the user said no. Say nothing, or say it softly. Not a bug.
//   unavailable — there is no wallet to talk to. Offer install / connect.
//   pending     — the transaction is REAL and still propagating. Keep polling;
//                 never re-send (a re-send here is a double-send in the field).
//   failed      — everything else. Show the message, keep `raw` for the report.
//
// Types and pure functions only: no DOM, no SDK, no I/O.

/** Why a wallet call did not produce a value. */
export type WalletErrorKind = 'cancelled' | 'unavailable' | 'failed' | 'pending';

export interface WalletError {
  kind: WalletErrorKind;
  /** The wallet's own words where it gave any. Never '[object Object]'. */
  message: string;
  /** The untouched original, kept for bug reports. */
  raw: unknown;
}

/** A wallet call's result: a value, or a classified error. Never both. */
export type WalletOutcome<T> =
  | { ok: true; value: T }
  | { ok: false; error: WalletError };

// The keys an untyped envelope hides its real error behind, in the order we
// dig. `message` is read at every level first, so the OUTERMOST wallet-supplied
// sentence wins over a deeper transport detail.
const UNWRAP_KEYS = ['error', 'data', 'cause', 'reason'] as const;

/** Substrings that mean "the user said no", matched case-insensitively. `4001`
 *  is the EIP-1193 user-rejected code, which some hosts stringify. */
const CANCEL_MARKERS = [
  'cancel',
  'abort',
  'denied',
  'deny',
  'reject',
  'dismiss',
  'closed',
  'declin',
  'action_rejected',
  '4001',
];

/** Substrings that mean "there is no provider to talk to". */
const UNAVAILABLE_MARKERS = [
  'no provider',
  'not installed',
  'unavailable',
  'timeout',
  'timed out',
];

/** The cross-lane protocol marker: the transaction is real, still propagating,
 *  and the caller should keep polling rather than re-sending. */
const PENDING_PREFIX = 'PENDING:';

/**
 * Walk an unknown rejection looking for the wallet's own words.
 *
 * `seen` makes this cycle-safe: a provider that throws `err` where
 * `err.cause === err` (seen in the wild behind a retry wrapper) would otherwise
 * spin forever. Hitting a cycle just ends that branch — whatever was already
 * found still comes back.
 */
function findMessage(input: unknown, seen: Set<object>): string | null {
  if (typeof input === 'string') return input.trim() || null;
  // A bare code counts as a message on purpose: `4001` alone is a cancel.
  if (typeof input === 'number' || typeof input === 'bigint') return String(input);
  if (input === null || typeof input !== 'object') return null;
  if (seen.has(input)) return null;
  seen.add(input);

  const obj = input as Record<string, unknown>;

  // A non-string `message` is ignored rather than stringified — stringifying it
  // is exactly how '[object Object]' reached users.
  const own = obj.message;
  if (typeof own === 'string' && own.trim()) return own.trim();

  for (const key of UNWRAP_KEYS) {
    const found = findMessage(obj[key], seen);
    if (found) return found;
  }
  return null;
}

/** A short literal standing in for a message the wallet never gave. */
function shapeLiteral(raw: unknown): string {
  if (raw === undefined) return 'wallet returned nothing';
  if (raw === null) return 'wallet returned null';
  if (Array.isArray(raw)) return 'wallet returned a list with no message';
  if (typeof raw === 'object') return 'wallet returned no message';
  return `wallet returned a ${typeof raw}`;
}

function classifyMessage(message: string): WalletErrorKind {
  // PENDING beats everything: a propagating transaction whose text happens to
  // mention a cancelled retry must NOT read as "the user said no", or the
  // caller re-sends a transaction that is already on its way.
  if (message.startsWith(PENDING_PREFIX)) return 'pending';

  const lower = message.toLowerCase();
  for (const marker of CANCEL_MARKERS) {
    if (lower.includes(marker)) return 'cancelled';
  }
  for (const marker of UNAVAILABLE_MARKERS) {
    if (lower.includes(marker)) return 'unavailable';
  }
  return 'failed';
}

/**
 * Turn any thrown or rejected value into a classified WalletError.
 *
 * Never throws, never hangs (cyclic envelopes included), and never produces the
 * string '[object Object]'.
 */
export function describeWalletError(raw: unknown): WalletError {
  const found = findMessage(raw, new Set<object>());
  const message = found ?? shapeLiteral(raw);
  return { kind: classifyMessage(message), message, raw };
}
