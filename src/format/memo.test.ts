import { describe, expect, test } from 'bun:test';
import {
  MAX_TX_DATA_BYTES,
  MEMO_ID_RE,
  MEMO_SEP,
  MEMO_TAG_RE,
  MemoTooLongError,
  buildMemo,
  memoByteLength,
} from './memo';

const REPLACEMENT = '�'; // what a split UTF-8 character decodes to

// ---- shape -----------------------------------------------------------------

describe('buildMemo: shape', () => {
  test('tag alone', () => {
    expect(buildMemo({ tag: 'gdkc' })).toBe('gdkc');
  });

  test('tag:id', () => {
    expect(buildMemo({ tag: 'pay', id: 'order-42' })).toBe('pay:order-42');
  });

  test('tag:id:text', () => {
    expect(buildMemo({ tag: 'pay', id: 'order-42', text: 'thanks' })).toBe('pay:order-42:thanks');
  });

  test('tag::text — the empty segment keeps "no id" readable as no id', () => {
    expect(buildMemo({ tag: 'tip', text: 'thanks' })).toBe('tip::thanks');
  });

  test('an empty text is no text, not a trailing separator', () => {
    expect(buildMemo({ tag: 'tip', text: '' })).toBe('tip');
    expect(buildMemo({ tag: 'tip', id: 'a1', text: '' })).toBe('tip:a1');
  });

  test('the separator constant is what is actually used', () => {
    expect(buildMemo({ tag: 'pay', id: 'x' })).toBe(`pay${MEMO_SEP}x`);
  });
});

// ---- validation ------------------------------------------------------------

describe('buildMemo: validation', () => {
  test.each([
    '',
    '1pay',            // must start with a letter
    'pay-app',         // no punctuation
    'pay app',
    'a'.repeat(17),    // 16 chars max
  ])('a tag of %p is rejected by name', (tag) => {
    expect(() => buildMemo({ tag })).toThrow(/MEMO_TAG_RE/);
  });

  test.each([
    '',
    'has space',
    'id:with:separator',
    'a'.repeat(33),    // 32 chars max
  ])('an id of %p is rejected by name', (id) => {
    expect(() => buildMemo({ tag: 'pay', id })).toThrow(/MEMO_ID_RE/);
  });

  test('the exported regexes are the ones documented', () => {
    expect(MEMO_TAG_RE.test('a'.repeat(16))).toBe(true);
    expect(MEMO_TAG_RE.test('a'.repeat(17))).toBe(false);
    expect(MEMO_ID_RE.test('A_b-9')).toBe(true);
    expect(MEMO_ID_RE.test('a'.repeat(32))).toBe(true);
    expect(MEMO_ID_RE.test('a'.repeat(33))).toBe(false);
  });

  test('a rejected tag throws a plain Error, not MemoTooLongError', () => {
    expect(() => buildMemo({ tag: '' })).not.toThrow(MemoTooLongError);
  });
});

// ---- bytes, not characters -------------------------------------------------

describe('memoByteLength', () => {
  test('counts UTF-8 bytes', () => {
    expect(memoByteLength('abcde')).toBe(5);
    expect(memoByteLength('é')).toBe(2);
    expect(memoByteLength('日')).toBe(3);
    expect(memoByteLength('🙂')).toBe(4);
    expect(memoByteLength('')).toBe(0);
  });

  // The whole reason this module exists: 64 characters can be 67 bytes, and the
  // chain counts bytes. Nimiq Pay's answer to that is "Transaction invalidated
  // during transaction", which names neither the field nor the length.
  test('64 characters is not 64 bytes once one of them is accented', () => {
    const sixtyFour = 'a'.repeat(63) + 'é';
    expect(sixtyFour.length).toBe(64);
    expect(memoByteLength(sixtyFour)).toBe(65);
  });
});

// ---- truncation ------------------------------------------------------------

describe('buildMemo: truncation', () => {
  test('a text that fits is untouched, right up to the last byte', () => {
    // 'tip::' is 5 bytes, so the text budget is 59. 57 ASCII + é = 59 bytes.
    const text = 'a'.repeat(57) + 'é';
    const memo = buildMemo({ tag: 'tip', text });
    expect(memo).toBe(`tip::${text}`);
    expect(memoByteLength(memo)).toBe(MAX_TX_DATA_BYTES);
  });

  test('a two-byte character straddling the boundary is dropped whole', () => {
    // 58 ASCII + é = 60 bytes against a 59-byte budget: the cut lands on é's
    // continuation byte, so the walk-back drops the character rather than
    // decoding half of it.
    const memo = buildMemo({ tag: 'tip', text: 'a'.repeat(58) + 'é' });
    expect(memo).toBe(`tip::${'a'.repeat(58)}`);
    expect(memo).not.toContain('é');
    expect(memo).not.toContain(REPLACEMENT);
    expect(memoByteLength(memo)).toBe(63);
  });

  test('a four-byte emoji straddling the boundary is dropped whole', () => {
    // 'x::' is 3 bytes → 61-byte budget. 58 ASCII + 🙂 = 62 bytes.
    const memo = buildMemo({ tag: 'x', text: 'a'.repeat(58) + '🙂' });
    expect(memo).toBe(`x::${'a'.repeat(58)}`);
    expect(memo).not.toContain(REPLACEMENT);
    expect(memoByteLength(memo)).toBe(61);
  });

  test('ASCII text is cut exactly at the budget', () => {
    const memo = buildMemo({ tag: 'pay', id: 'order-42', text: 'z'.repeat(100) });
    expect(memo).toBe(`pay:order-42:${'z'.repeat(MAX_TX_DATA_BYTES - 13)}`);
    expect(memoByteLength(memo)).toBe(MAX_TX_DATA_BYTES);
  });

  test('the result is never over the cap, whatever the text is', () => {
    const texts = [
      '🙂'.repeat(40),
      '日本語のメモ'.repeat(20),
      'é'.repeat(70),
      'a'.repeat(500),
      'mixed 🙂 日本 é text '.repeat(10),
    ];
    for (const text of texts) {
      for (const id of [undefined, 'order-42', 'a'.repeat(32)]) {
        const memo = buildMemo({ tag: 'a'.repeat(16), id, text });
        expect(memoByteLength(memo)).toBeLessThanOrEqual(MAX_TX_DATA_BYTES);
        expect(memo).not.toContain(REPLACEMENT);
      }
    }
  });

  test('the tag and the id are never truncated', () => {
    const memo = buildMemo({ tag: 'a'.repeat(16), id: 'b'.repeat(32), text: 'c'.repeat(100) });
    expect(memo.startsWith(`${'a'.repeat(16)}:${'b'.repeat(32)}:`)).toBe(true);
    expect(memoByteLength(memo)).toBe(MAX_TX_DATA_BYTES);
  });
});

// ---- the loud case ---------------------------------------------------------

describe('MemoTooLongError', () => {
  // Under the current MEMO_TAG_RE (16) and MEMO_ID_RE (32) the longest possible
  // prefix is 16 + 1 + 32 + 1 = 50 bytes, so buildMemo cannot reach its own
  // guard today. The guard and this test exist so that widening either regex
  // fails loudly here instead of silently minting an oversized transaction.
  test('carries the tag and the measured byte count', () => {
    const err = new MemoTooLongError('checkout', 71);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(MemoTooLongError);
    expect(err.name).toBe('MemoTooLongError');
    expect(err.tag).toBe('checkout');
    expect(err.bytes).toBe(71);
    expect(err.message).toContain('checkout');
    expect(err.message).toContain('71');
    expect(err.message).toContain(String(MAX_TX_DATA_BYTES));
  });

  test('the prefix a valid tag and id can build still fits the cap', () => {
    const longest = `${'a'.repeat(16)}${MEMO_SEP}${'b'.repeat(32)}${MEMO_SEP}`;
    expect(memoByteLength(longest)).toBeLessThanOrEqual(MAX_TX_DATA_BYTES);
  });
});

// ---- the walk-back under real caps -----------------------------------------

describe('buildMemo: multi-byte truncation at the maximum tag and id', () => {
  // Elsewhere the walk-back is exercised with a short tag, where the budget is
  // wide. At the caps the two regexes actually allow, 16 + 1 + 32 + 1 = 50
  // bytes of prefix leave 14, and one emoji is over a fifth of that. This is
  // the narrowest the budget can legally get, so it is the case where a
  // character-counting truncation would ship an oversized transaction.
  const TAG = 'A'.repeat(16);
  const ID = 'B'.repeat(32);
  const budget = MAX_TX_DATA_BYTES - memoByteLength(`${TAG}${MEMO_SEP}${ID}${MEMO_SEP}`);

  const build = (text: string) => buildMemo({ tag: TAG, id: ID, text });
  const textOf = (memo: string) => memo.slice(`${TAG}${MEMO_SEP}${ID}${MEMO_SEP}`.length);

  test('the budget at the caps is 14 bytes', () => {
    expect(budget).toBe(14);
  });

  test.each([
    ['ascii fills the budget exactly', 'x'.repeat(20), 'x'.repeat(14)],
    ['a trailing emoji is dropped whole', `${'a'.repeat(12)}\u{1F389}`, 'a'.repeat(12)],
    ['four 4-byte emoji become three', '\u{1F389}'.repeat(4), '\u{1F389}'.repeat(3)],
    ['fourteen 2-byte accents become seven', 'é'.repeat(14), 'é'.repeat(7)],
  ])('%s', (_label, input, expected) => {
    const memo = build(input);
    expect(textOf(memo)).toBe(expected);
    expect(memoByteLength(memo)).toBeLessThanOrEqual(MAX_TX_DATA_BYTES);
    expect(memo).not.toContain(REPLACEMENT);
  });
});
