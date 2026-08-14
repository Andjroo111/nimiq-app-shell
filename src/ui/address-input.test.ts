// The formatting is pure so the caret arithmetic can be tested without a DOM,
// which is the same reason menuShift is a function. The caret is the part that
// decides whether a formatted field is usable: rewriting the value on every
// keystroke sends the caret to the end, so typing into the middle of an address
// throws you out of it on every character.
import { describe, expect, test } from 'bun:test';
import {
  caretForSignificant,
  formatAddressBlocks,
  significantBefore,
  significantChars,
} from './address-input';

const ADDR = 'NQ488CKHBA242VR3N249N8MNJ5XX74DB5XJ8';
const FORMATTED = 'NQ48 8CKH BA24\n2VR3 N249 N8MN\nJ5XX 74DB 5XJ8';

describe('significantChars', () => {
  test('keeps the address and drops the punctuation people paste with it', () => {
    expect(significantChars('nq48 8ckh ba24 2vr3 n249 n8mn j5xx 74db 5xj8')).toBe(ADDR);
    expect(significantChars('NQ48-8CKH-BA24-2VR3-N249-N8MN-J5XX-74DB-5XJ8')).toBe(ADDR);
  });

  test('strips a nimiq: URI prefix, which is what a scanned QR hands over', () => {
    expect(significantChars(`nimiq:${ADDR}`)).toBe(ADDR);
  });

  test('caps at an address, so a paste with a trailing amount cannot overflow', () => {
    expect(significantChars(`${ADDR}EXTRA`)).toBe(ADDR);
    expect(significantChars(ADDR).length).toBe(36);
  });
});

describe('formatAddressBlocks', () => {
  test('a full address is three rows of three blocks', () => {
    expect(formatAddressBlocks(ADDR)).toBe(FORMATTED);
  });

  test('the grid builds as you type rather than snapping in at the end', () => {
    expect(formatAddressBlocks('NQ4')).toBe('NQ4');
    expect(formatAddressBlocks('NQ488CK')).toBe('NQ48 8CK');
    expect(formatAddressBlocks('NQ488CKHBA242')).toBe('NQ48 8CKH BA24\n2');
  });

  test('formatting is idempotent, since it runs on its own output every keystroke', () => {
    expect(formatAddressBlocks(FORMATTED)).toBe(FORMATTED);
  });

  test('empty in, empty out, so a cleared field does not grow a stray space', () => {
    expect(formatAddressBlocks('')).toBe('');
  });
});

describe('caret mapping', () => {
  test('the caret lands after the same character it was after', () => {
    // after "NQ48" (4 significant) the caret sits at index 4, before the space
    expect(caretForSignificant(FORMATTED, 4)).toBe(4);
    // after "NQ488" (5) it has crossed the space into block 2
    expect(caretForSignificant(FORMATTED, 5)).toBe(6);
    // after the 12th it is at the end of row 1, before the newline
    expect(caretForSignificant(FORMATTED, 12)).toBe(14);
    // after the 13th it has crossed the newline into row 2
    expect(caretForSignificant(FORMATTED, 13)).toBe(16);
  });

  test('the start and the end are reachable', () => {
    expect(caretForSignificant(FORMATTED, 0)).toBe(0);
    expect(caretForSignificant(FORMATTED, 36)).toBe(FORMATTED.length);
    expect(caretForSignificant(FORMATTED, 99)).toBe(FORMATTED.length);
  });

  test('a separator under the caret does not count as a character', () => {
    expect(significantBefore(FORMATTED, 5)).toBe(4); // the space after NQ48
    expect(significantBefore(FORMATTED, 15)).toBe(12); // the newline
  });

  // The round trip is the property that matters: type a character into the
  // middle, reformat, and the caret is still after that character.
  test('typing into the middle keeps the caret after the typed character', () => {
    const before = 'NQ48 8CKH BA24\n2VR3';
    const caret = 7; // inside block 2, after "8C"
    const typed = `${before.slice(0, caret)}X${before.slice(caret)}`;
    const n = significantBefore(typed, caret + 1);
    const next = formatAddressBlocks(typed);
    const at = caretForSignificant(next, n);
    expect(next.slice(0, at).at(-1)).toBe('X');
    expect(significantChars(next.slice(0, at)).length).toBe(n);
  });
});
