import { describe, expect, test } from 'bun:test';
import { classifySendResult } from './send-handle';

const HASH = 'a'.repeat(63) + '7';                 // 64 hex chars
const HASH_UPPER = HASH.toUpperCase();
const SERIALIZED = '0' + 'f'.repeat(199);          // 200 hex chars, even length

// ---- strings ---------------------------------------------------------------

describe('classifySendResult: strings', () => {
  test('exactly 64 hex chars is a hash, lowercased', () => {
    expect(classifySendResult(HASH)).toEqual({ kind: 'hash', hash: HASH });
    expect(classifySendResult(HASH_UPPER)).toEqual({ kind: 'hash', hash: HASH });
  });

  test('even-length hex longer than 64 is a serialized transaction, lowercased', () => {
    expect(classifySendResult(SERIALIZED.toUpperCase()))
      .toEqual({ kind: 'serialized', serializedTx: SERIALIZED });
  });

  test('odd-length hex is not a serialized transaction — it is opaque', () => {
    const odd = 'f'.repeat(65);
    expect(classifySendResult(odd)).toEqual({ kind: 'opaque', raw: odd });
  });

  test('a 0x-prefixed hash is opaque, not silently unprefixed', () => {
    const prefixed = `0x${HASH}`;
    expect(classifySendResult(prefixed)).toEqual({ kind: 'opaque', raw: prefixed });
  });

  test('any other non-empty string is opaque and kept verbatim', () => {
    // Not lowercased: an opaque handle is the server's to interpret, and case
    // may be part of what it means (a base64 or base58 id, a signed receipt).
    expect(classifySendResult('Tx-Receipt/AbC123'))
      .toEqual({ kind: 'opaque', raw: 'Tx-Receipt/AbC123' });
  });

  test('63 hex chars is not a hash', () => {
    expect(classifySendResult('b'.repeat(63))).toEqual({ kind: 'opaque', raw: 'b'.repeat(63) });
  });
});

// ---- objects ---------------------------------------------------------------

describe('classifySendResult: objects', () => {
  test.each([
    'hash',
    'txHash',
    'transactionHash',
    'tx',
    'result',
    'value',
  ])('reads the handle off %p', (key) => {
    expect(classifySendResult({ [key]: HASH })).toEqual({ kind: 'hash', hash: HASH });
  });

  test('serializedTx is read too, and stays serialized', () => {
    expect(classifySendResult({ serializedTx: SERIALIZED }))
      .toEqual({ kind: 'serialized', serializedTx: SERIALIZED });
  });

  test('keys are tried in order — hash beats txHash', () => {
    const other = 'c'.repeat(64);
    expect(classifySendResult({ txHash: other, hash: HASH })).toEqual({ kind: 'hash', hash: HASH });
  });

  test('a key holding nothing usable falls through to the next', () => {
    expect(classifySendResult({ hash: null, txHash: '', transactionHash: HASH }))
      .toEqual({ kind: 'hash', hash: HASH });
  });

  test('one level of nesting is unwrapped', () => {
    expect(classifySendResult({ result: { hash: HASH } })).toEqual({ kind: 'hash', hash: HASH });
  });

  test('deeper than one level is not guessed at', () => {
    expect(classifySendResult({ tx: { result: { hash: HASH } } })).toBeNull();
  });

  test('a self-referencing object terminates', () => {
    const loop: Record<string, unknown> = {};
    loop.result = loop;
    expect(classifySendResult(loop)).toBeNull();
  });
});

// ---- nothing usable --------------------------------------------------------

describe('classifySendResult: null cases', () => {
  // The field bug this module exists for: a caller that treats any of these as
  // a handle reports a send that did not happen, or re-sends one that did.
  test.each([
    null,
    undefined,
    '',
    '   ',
    0,
    42,
    true,
    false,
  ])('%p yields null rather than a guess', (raw) => {
    expect(classifySendResult(raw)).toBeNull();
  });

  test('an object with none of the keys yields null', () => {
    expect(classifySendResult({ status: 'ok', receipt: HASH })).toBeNull();
  });

  test('an object whose keys hold non-strings yields null', () => {
    expect(classifySendResult({ hash: 12345, value: false })).toBeNull();
  });

  test('an empty array yields null', () => {
    expect(classifySendResult([])).toBeNull();
  });
});
