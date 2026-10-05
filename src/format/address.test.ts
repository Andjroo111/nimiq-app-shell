import { describe, expect, test } from 'bun:test';
import {
  compactNimAddress,
  isValidNimAddress,
  nimAddressCheckDigits,
  normalizeNimAddress,
} from './address';

// Fixtures checked against @nimiq/utils ValidationUtils.isValidAddress
// (20,000-address differential run, 0 mismatches, 2026-10-04).
const VALID: [string, string, string, string] = [
  'NQ07 0000 0000 0000 0000 0000 0000 0000 0000',
  'NQ55 8TPP T9X0 0B98 YC4J SP8B 7HRP 04A2 H82J',
  'NQ33 LGM3 1VCM 27XT 32YU 2995 GBRD FFMC 9XHC',
  'NQ25 5V9Q FXLQ TFMS RNQ7 PQL4 U6DQ BLC3 6P90',
];

describe('isValidNimAddress', () => {
  test('accepts real addresses in any spacing or case', () => {
    for (const a of VALID) {
      expect(isValidNimAddress(a)).toBe(true);
      expect(isValidNimAddress(a.replace(/ /g, ''))).toBe(true);
      expect(isValidNimAddress(a.toLowerCase())).toBe(true);
      expect(isValidNimAddress(`nimiq:${a.replace(/ /g, '-')}`)).toBe(true);
    }
  });

  test('a single changed character fails the checksum', () => {
    const a = VALID[1].replace(/ /g, '');
    for (let i = 4; i < a.length; i++) {
      const c = a.charAt(i) === '0' ? '1' : '0';
      expect(isValidNimAddress(a.slice(0, i) + c + a.slice(i + 1))).toBe(false);
    }
  });

  test('swapped adjacent characters fail', () => {
    const a = VALID[2].replace(/ /g, '');
    const swapped = a.slice(0, 10) + a.charAt(11) + a.charAt(10) + a.slice(12);
    expect(swapped).not.toBe(a);
    expect(isValidNimAddress(swapped)).toBe(false);
  });

  test('wrong check digits fail', () => {
    expect(isValidNimAddress('NQ08 0000 0000 0000 0000 0000 0000 0000 0000')).toBe(false);
  });

  test('rejects characters outside the Nimiq alphabet even when the checksum would pass', () => {
    // I, O, W, Z are not base32 here. Build a body with one, give it IBAN digits.
    const body = 'I'.padEnd(32, '0');
    const n = body + 'NQ00';
    let rem = 0;
    for (const c of n) {
      const v = /[0-9]/.test(c) ? +c : c.charCodeAt(0) - 55;
      rem = (rem * (v >= 10 ? 100 : 10) + v) % 97;
    }
    const cd = String(98 - rem).padStart(2, '0');
    expect(isValidNimAddress(`NQ${cd}${body}`)).toBe(false);
  });

  test('rejects wrong length, wrong prefix and non-strings', () => {
    expect(isValidNimAddress('NQ07 0000 0000 0000 0000 0000 0000 0000 000')).toBe(false);
    expect(isValidNimAddress('NQ07 0000 0000 0000 0000 0000 0000 0000 00000')).toBe(false);
    expect(isValidNimAddress('DE07 0000 0000 0000 0000 0000 0000 0000 0000')).toBe(false);
    expect(isValidNimAddress('')).toBe(false);
    expect(isValidNimAddress(null)).toBe(false);
    expect(isValidNimAddress(42)).toBe(false);
  });
});

describe('nimAddressCheckDigits', () => {
  test('reproduces the digits of every fixture', () => {
    for (const a of VALID) {
      const c = compactNimAddress(a);
      expect(nimAddressCheckDigits(c.slice(4))).toBe(c.slice(2, 4));
    }
  });

  test('throws on a malformed body', () => {
    expect(() => nimAddressCheckDigits('0'.repeat(31))).toThrow();
    expect(() => nimAddressCheckDigits('O'.repeat(32))).toThrow();
  });
});

describe('normalizeNimAddress', () => {
  test('nine blocks of four, upper case', () => {
    expect(normalizeNimAddress(' nq558tppt9x00b98yc4jsp8b7hrp04a2h82j ')).toBe(VALID[1]);
    expect(normalizeNimAddress('nimiq:NQ07-0000-0000-0000-0000-0000-0000-0000-0000')).toBe(VALID[0]);
  });
});
