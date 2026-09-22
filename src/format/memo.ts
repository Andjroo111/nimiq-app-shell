// memo — the transaction data field, built to fit.
//
// The on-chain data field is capped at 64 BYTES, not 64 characters. Nothing in
// a string's `.length` says so, which is why this keeps biting: a memo of 64
// characters containing one accented letter, one emoji or one CJK character is
// over the cap, and Nimiq Pay answers with "Transaction invalidated during
// transaction" — a message that names neither the field nor the length, so the
// app looks broken and the user tries again.
//
// So a memo is assembled here, never concatenated at the call site:
//
//   tag            — an ASCII app or verb tag. Never truncated.
//   tag:id         — plus an ASCII identifier (order id, round id). Never truncated.
//   tag:id:text    — plus free UTF-8, truncated to whatever budget is left.
//   tag::text      — the same with no id; the empty segment keeps the shape fixed.
//
// The tag and the id are routing data: something downstream matches on them, so
// a truncated one is worse than no memo at all. The text is for a human, so it
// is the part that gives way — cut on a CODEPOINT boundary, never mid-character.
//
// Build only. `parseMemo` belongs to another lane and must not appear here.

/** The on-chain transaction data cap, in BYTES. */
export const MAX_TX_DATA_BYTES = 64;

/** The segment separator. */
export const MEMO_SEP = ':';

/** A tag: ASCII letter first, then up to 15 more letters/digits. */
export const MEMO_TAG_RE = /^[A-Za-z][A-Za-z0-9]{0,15}$/;

/** An id: 1-32 ASCII letters, digits, underscore or hyphen. */
export const MEMO_ID_RE = /^[A-Za-z0-9_-]{1,32}$/;

export interface BuildMemoArgs {
  /** ASCII app or verb tag. Never truncated. Must match MEMO_TAG_RE. */
  tag: string;
  /** ASCII identifier. Never truncated. Must match MEMO_ID_RE. */
  id?: string;
  /** Free UTF-8. Truncated on a codepoint boundary to fit the remaining budget. */
  text?: string;
}

/**
 * The tag and id alone did not fit, so there is no memo to shorten.
 *
 * That is a programming error, not user input — a caller invented a routing
 * prefix too long to send — so it is loud and carries what it measured.
 */
export class MemoTooLongError extends Error {
  readonly tag: string;
  readonly bytes: number;

  constructor(tag: string, bytes: number) {
    super(
      `memo prefix for tag "${tag}" is ${bytes} bytes, over the ${MAX_TX_DATA_BYTES}-byte cap`,
    );
    this.name = 'MemoTooLongError';
    this.tag = tag;
    this.bytes = bytes;
  }
}

/** The length of `value` in the unit the chain actually counts: UTF-8 bytes. */
export function memoByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

/**
 * Assemble a memo that is guaranteed to fit the 64-byte data field.
 *
 * Throws a plain Error on a malformed tag or id, and MemoTooLongError when the
 * routing prefix alone is over the cap.
 */
export function buildMemo(args: BuildMemoArgs): string {
  const { tag, id, text } = args;

  if (!MEMO_TAG_RE.test(tag)) {
    throw new Error(`memo tag ${JSON.stringify(tag)} does not match MEMO_TAG_RE`);
  }
  if (id !== undefined && !MEMO_ID_RE.test(id)) {
    throw new Error(`memo id ${JSON.stringify(id)} does not match MEMO_ID_RE`);
  }

  const hasText = text !== undefined && text !== '';

  // With text, the id segment is always present in the shape, empty or not —
  // that is what keeps `tag::text` readable as "no id" rather than "no text".
  const prefix = hasText
    ? `${tag}${MEMO_SEP}${id ?? ''}${MEMO_SEP}`
    : id !== undefined
      ? `${tag}${MEMO_SEP}${id}`
      : tag;

  const prefixBytes = memoByteLength(prefix);
  if (prefixBytes > MAX_TX_DATA_BYTES) throw new MemoTooLongError(tag, prefixBytes);

  if (!hasText) return prefix;

  const budget = MAX_TX_DATA_BYTES - prefixBytes;
  const bytes = new TextEncoder().encode(text);
  if (bytes.length <= budget) return prefix + text;

  // Cut at the budget, then walk BACK over UTF-8 continuation bytes (0b10xxxxxx)
  // so the cut never lands inside a multi-byte character. Decoding a split
  // character yields U+FFFD, which is both ugly and, at 3 bytes, sometimes
  // longer than the character it replaced — i.e. it can push the memo back over.
  let cut = Math.max(0, budget);
  while (cut > 0 && ((bytes[cut] ?? 0) & 0xc0) === 0x80) cut--;

  return prefix + new TextDecoder().decode(bytes.subarray(0, cut));
}
