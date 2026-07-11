import { describe, expect, test } from 'bun:test';
import {
  LUNA_PER_NIM,
  NIM_DECIMALS,
  fmtNim,
  fmtFiat,
  lunaToNim,
  nimToLuna,
  parseNim,
} from './nim';

const NNBSP = ' '; // the Nimiq group separator (narrow no-break space)

// ---- fmtNim — registry amount component semantics ---------------------------

describe('fmtNim', () => {
  test('registry sample state: 1234567890 luna → 12 345.6789 (U+202F)', () => {
    // the amount component's verified sample: minDecimals 2, maxDecimals 5
    expect(fmtNim(1234567890)).toBe(`12${NNBSP}345.6789`);
  });

  test('pads to minDecimals (default 2)', () => {
    expect(fmtNim(500000)).toBe('5.00');
    expect(fmtNim(0)).toBe('0.00');
    expect(fmtNim(123450000)).toBe('1234.50');
  });

  test('trims trailing zeros above minDecimals', () => {
    expect(fmtNim(510000)).toBe('5.10');
    expect(fmtNim(512300)).toBe('5.123');
  });

  test('grouping only above 4 integer digits', () => {
    expect(fmtNim(123456789)).toBe('1234.56789'); // 4 integer digits — no grouping
    expect(fmtNim(1234567891)).toBe(`12${NNBSP}345.67891`); // 5 digits — grouped
    expect(fmtNim(123456789012345n)).toBe(`1${NNBSP}234${NNBSP}567${NNBSP}890.12345`);
  });

  test('grouping: false disables the separator', () => {
    expect(fmtNim(1234567890, { grouping: false })).toBe('12345.6789');
  });

  test('rounds half-up at maxDecimals', () => {
    expect(fmtNim(123456, { maxDecimals: 2 })).toBe('1.23'); // 1.23456 → down
    expect(fmtNim(123500, { maxDecimals: 2 })).toBe('1.24'); // 1.235   → half up
    expect(fmtNim(999995, { maxDecimals: 4 })).toBe('10.00'); // carry across the point
  });

  test('decimals clamp: minDecimals capped at maxDecimals', () => {
    expect(fmtNim(100000, { minDecimals: 4, maxDecimals: 2 })).toBe('1.00');
  });

  test('bigint is precision-loss-free beyond 2^53', () => {
    expect(fmtNim(123456789012345678901n, { grouping: false })).toBe('1234567890123456.78901');
  });

  test('negative amounts keep the minus, zero never shows -0', () => {
    expect(fmtNim(-1234567890)).toBe(`-12${NNBSP}345.6789`);
    expect(fmtNim(-400, { maxDecimals: 2 })).toBe('0.00'); // -0.004 rounds to zero
  });

  test('signed: true prefixes + on positive, not on zero or negative', () => {
    expect(fmtNim(500000, { signed: true })).toBe('+5.00');
    expect(fmtNim(-500000, { signed: true })).toBe('-5.00');
    expect(fmtNim(0, { signed: true })).toBe('0.00');
  });

  test('rejects nonsense decimals options', () => {
    expect(() => fmtNim(1, { maxDecimals: -1 })).toThrow();
    expect(() => fmtNim(1, { minDecimals: 1.5 })).toThrow();
  });
});

// ---- fmtFiat -----------------------------------------------------------------

describe('fmtFiat', () => {
  test('USD in en-US uses the narrow symbol and 2 decimals', () => {
    expect(fmtFiat(12.5, 'USD', 'en-US')).toBe('$12.50');
  });

  test('decimal-less currencies render without decimals', () => {
    expect(fmtFiat(1234, 'JPY', 'en-US')).toBe(`¥1,234`);
  });

  test('rejects non-finite values', () => {
    expect(() => fmtFiat(Number.NaN, 'USD')).toThrow();
    expect(() => fmtFiat(Number.POSITIVE_INFINITY, 'EUR')).toThrow();
  });
});

// ---- conversions ---------------------------------------------------------------

describe('lunaToNim / nimToLuna', () => {
  test('constants', () => {
    expect(LUNA_PER_NIM).toBe(100_000);
    expect(NIM_DECIMALS).toBe(5);
  });

  test('round-trips', () => {
    expect(lunaToNim(100000)).toBe(1);
    expect(lunaToNim(12345678n)).toBe(123.45678);
    expect(nimToLuna(1)).toBe(100000);
    expect(nimToLuna(123.45678)).toBe(12345678);
    expect(nimToLuna(lunaToNim(98765))).toBe(98765);
  });

  test('nimToLuna rounds to the nearest luna and validates', () => {
    expect(nimToLuna(0.000004)).toBe(0);
    expect(nimToLuna(0.000006)).toBe(1);
    expect(() => nimToLuna(Number.NaN)).toThrow();
  });
});

// ---- parseNim ------------------------------------------------------------------

describe('parseNim', () => {
  test('parses plain and decimal amounts to integer luna', () => {
    expect(parseNim('1')).toBe(100000);
    expect(parseNim('12.5')).toBe(1250000);
    expect(parseNim('0.00001')).toBe(1);
    expect(parseNim('-2.5')).toBe(-250000);
    expect(parseNim('+2.5')).toBe(250000);
  });

  test('accepts fmtNim output (U+202F grouping) — full round-trip', () => {
    expect(parseNim(fmtNim(1234567890))).toBe(1234567890);
    expect(parseNim(`12${NNBSP}345.6789`)).toBe(1234567890);
  });

  test('accepts space and comma grouping from user input', () => {
    expect(parseNim('12 345.6789')).toBe(1234567890);
    expect(parseNim('12,345.6789')).toBe(1234567890);
  });

  test('rejects invalid input', () => {
    expect(() => parseNim('')).toThrow();
    expect(() => parseNim('abc')).toThrow();
    expect(() => parseNim('1.2.3')).toThrow();
    expect(() => parseNim('1.234567')).toThrow(/decimals/); // sub-luna
    expect(() => parseNim('12,34')).toThrow(); // malformed grouping
    expect(() => parseNim('NQ07 0000')).toThrow();
  });

  test('rejects amounts beyond the safe integer range', () => {
    expect(() => parseNim('99999999999999999999')).toThrow(/range/);
  });
});
