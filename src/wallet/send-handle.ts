// Send handles — what a wallet actually hands back when a transaction goes out,
// classified rather than guessed.
//
// The Nimiq Pay SDK's sendBasicTransaction / sendBasicTransactionWithData does
// not reliably return a hash. Observed in the field: a 64-char hex hash, a much
// longer hex string that is the SERIALIZED transaction, a nested object with
// the useful part one key down, and plain null. Code that assumed "whatever
// comes back is the hash" then failed its receipt lookup, decided the send had
// not happened, and sent again. Double-sends are the reason this module exists.
//
// So the rule is: say what it IS, or say nothing. `classifySendResult` returns
// null rather than a guess, and an unrecognised string comes back verbatim as
// `opaque` for the server to resolve.
//
// Deriving a hash from a serialized transaction is explicitly NOT this module's
// job — that needs @nimiq/core, which this package will not take on. Another
// lane owns it.

export type SendHandle =
  | { kind: 'hash'; hash: string }                  // exactly 64 lowercase hex chars
  | { kind: 'serialized'; serializedTx: string }    // hex, length > 64, even length
  | { kind: 'opaque'; raw: string };                // kept verbatim; the server decides

/** Exactly 64 hex chars, either case — a Nimiq transaction hash. */
const HASH_RE = /^[0-9a-fA-F]{64}$/;

/** Hex of any length, either case. */
const HEX_RE = /^[0-9a-fA-F]+$/;

/** The keys a handle hides behind, in the order we try them. */
const HANDLE_KEYS = [
  'hash',
  'txHash',
  'transactionHash',
  'serializedTx',
  'tx',
  'result',
  'value',
] as const;

/** One level of nesting past the object we were handed, and no further. */
const MAX_DEPTH = 2;

function classifyString(raw: string): SendHandle | null {
  if (!raw.trim()) return null;
  if (HASH_RE.test(raw)) return { kind: 'hash', hash: raw.toLowerCase() };
  if (raw.length > 64 && raw.length % 2 === 0 && HEX_RE.test(raw)) {
    return { kind: 'serialized', serializedTx: raw.toLowerCase() };
  }
  // Not hex, odd-length hex, a 0x-prefixed hash: all kept exactly as given.
  // Lowercasing an opaque handle could change what it means to the server.
  return { kind: 'opaque', raw };
}

function classifyAt(raw: unknown, depth: number): SendHandle | null {
  if (typeof raw === 'string') return classifyString(raw);
  // A number or a boolean is never a handle, and neither is null/undefined.
  if (raw === null || typeof raw !== 'object') return null;
  if (depth >= MAX_DEPTH) return null;

  const obj = raw as Record<string, unknown>;
  for (const key of HANDLE_KEYS) {
    const found = classifyAt(obj[key], depth + 1);
    if (found) return found;
  }
  return null;
}

/** Returns null when nothing usable was found. Never throws. */
export function classifySendResult(raw: unknown): SendHandle | null {
  return classifyAt(raw, 0);
}
