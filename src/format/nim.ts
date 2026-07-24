// nim-format — the fleet-canonical luna/NIM formatter.
//
// The luna→NIM display conversion is the single most re-implemented snippet in
// the fleet (17 apps at last count, most of them float-based `luna / 1e5` with
// ad-hoc rounding). This module is the one shared implementation, and it follows
// the registry `amount` component's semantics EXACTLY (which in turn mini-ports
// FormattableNumber from @nimiq/utils):
//
//   - string-based digit math — no floating-point precision loss, bigint-safe
//   - half-up rounding at maxDecimals (default 5 — luna resolution)
//   - trailing zeros trimmed, then padded back up to minDecimals (default 2)
//   - integer digit grouping in threes with U+202F narrow no-break space,
//     applied only when there are MORE than 4 integer digits (registry rule)
//
// So: fmtNim(1234567890) → '12 345.6789'  (that separator is U+202F, not a space)
//     fmtNim(500000)     → '5.00'
//
// One deliberate deviation: an amount that rounds to zero renders '0.00', never
// '-0.00' (upstream FormattableNumber keeps the sign there; we drop it).
//
// Ships in the same app-shell bundle as everything else: apps that follow the
// scaffold's `build:shell` pattern (esbuild → public/vendor/app-shell.js) get it
// via  import { fmtNim } from './vendor/app-shell.js'  — otherwise import from
// 'nimiq-app-shell' directly (Bun consumes the TS source).

/** Luna per NIM: 1 NIM = 100 000 luna (5 decimals). */
export const LUNA_PER_NIM = 100_000;

/** Decimals of NIM's smallest unit (luna). */
export const NIM_DECIMALS = 5;

export interface FmtNimOptions {
  /** Maximum decimals to show (rounds half-up past this). Default 5. */
  maxDecimals?: number;
  /** Minimum decimals to show (pads with zeros). Default 2. */
  minDecimals?: number;
  /** Group integer digits in threes with U+202F when there are more than 4. Default true. */
  grouping?: boolean;
  /** Prefix positive amounts with '+' (tx-feed style signed display). Default false. */
  signed?: boolean;
}

const GROUP_SEPARATOR = ' '; // narrow no-break space — the Nimiq grouping char
const NUMBER_REGEX = /^(-?)(\d*)\.?(\d*)(e(-?\d+))?$/;

// --- string-based digit engine (mini-port of @nimiq/utils FormattableNumber,
// --- same code path as the registry amount component) ------------------------

interface Digits {
  sign: string;
  digits: string;
  /** index into `digits` where the decimal separator sits */
  sep: number;
}

function toDigits(value: number | bigint | string): Digits {
  const str = typeof value === 'string' ? value.trim() : value.toString();
  const m = str.match(NUMBER_REGEX);
  if (!m) throw new Error(`${str} is not a valid number`);
  const [, sign = '', ints = '', fracs = '', , exp = ''] = m;
  const d: Digits = { sign, digits: `${ints}${fracs}`, sep: ints.length };
  if (!d.digits) throw new Error(`${str} is not a valid number`);
  const exponent = Number.parseInt(exp, 10);
  if (exponent) moveSep(d, exponent); // remove scientific notation (1e-7 etc.)
  return d;
}

function moveSep(d: Digits, moveBy: number): void {
  d.sep += moveBy;
  if (d.sep > d.digits.length) {
    d.digits = d.digits.padEnd(d.sep, '0');
  } else if (d.sep < 0) {
    d.digits = d.digits.padStart(d.digits.length - d.sep, '0');
    d.sep = 0;
  }
}

/** Half-up rounding in place, exactly like FormattableNumber.round(). */
function roundDigits(d: Digits, decimals: number): void {
  if (d.digits.length - d.sep <= decimals) return;
  const firstCutOff = d.sep + decimals;
  const kept = d.digits.substring(0, firstCutOff).padEnd(d.sep, '0');
  if (Number.parseInt(d.digits.charAt(firstCutOff), 10) < 5) {
    d.digits = kept;
    return;
  }
  // round up with carry
  const digits = `0${kept}`.split(''); // leading 0 simplifies carry handling
  for (let i = firstCutOff; i >= 0; --i) {
    const next = Number.parseInt(digits[i] ?? '0', 10) + 1;
    if (next < 10) {
      digits[i] = next.toString();
      break;
    }
    digits[i] = '0'; // carry continues
  }
  d.digits = digits.join('');
  d.sep += 1; // account for the added leading 0
}

function renderDigits(
  d: Digits,
  { maxDecimals, minDecimals, grouping }: Required<Omit<FmtNimOptions, 'signed'>>,
): string {
  const min = Math.min(minDecimals, maxDecimals);
  roundDigits(d, maxDecimals);
  let integers = d.digits.slice(0, d.sep).replace(/^0+/, '');
  let decimals = d.digits.slice(d.sep).replace(/0+$/, '');
  if (min > decimals.length) decimals = decimals.padEnd(min, '0');
  // grouping only when there are MORE than 4 integer digits (registry rule)
  if (grouping && integers.length > 4) {
    integers = integers.replace(/(\d)(?=(\d{3})+$)/g, `$1${GROUP_SEPARATOR}`);
  }
  const body = `${integers || '0'}${decimals ? `.${decimals}` : ''}`;
  // a value that rounded to plain zero carries no sign
  return /[1-9]/.test(body) ? `${d.sign}${body}` : body;
}

// --- public API ---------------------------------------------------------------

/**
 * Format an amount of luna as a human-readable NIM string:
 * `fmtNim(1234567890)` → `'12 345.6789'` (U+202F grouping, trailing zeros
 * trimmed, padded to minDecimals). Precision-loss-free for number and bigint.
 */
export function fmtNim(luna: number | bigint, options: FmtNimOptions = {}): string {
  const { maxDecimals = NIM_DECIMALS, minDecimals = 2, grouping = true, signed = false } = options;
  if (!Number.isInteger(maxDecimals) || maxDecimals < 0
    || !Number.isInteger(minDecimals) || minDecimals < 0) {
    throw new Error('fmtNim: minDecimals/maxDecimals must be non-negative integers');
  }
  const d = toDigits(luna);
  moveSep(d, -NIM_DECIMALS); // luna → NIM
  const out = renderDigits(d, { maxDecimals, minDecimals, grouping });
  return signed && !out.startsWith('-') && /[1-9]/.test(out) ? `+${out}` : out;
}

/**
 * Format a fiat value (whole currency units, e.g. 12.5 for $12.50) with the
 * platform's Intl rules: correct symbol, the currency's own decimal count
 * (USD 2, JPY 0, ...), narrow symbol where available ('$', not 'US$').
 *
 * Small values get EXTRA decimals until the shown number is within 10% of the
 * true value — the wallet FiatAmount's maxRelativeDeviation rule. With NIM at
 * sub-cent prices a small balance would otherwise floor to "$0.00", which
 * reads as a wrong price, not a rounding (Andjroo's phone review, round 4).
 */
export function fmtFiat(value: number, currency: string, locale?: string): string {
  if (!Number.isFinite(value)) throw new Error(`fmtFiat: ${value} is not a finite number`);
  const base: Intl.NumberFormatOptions = { style: 'currency', currency };
  const fmt = (options: Intl.NumberFormatOptions): string => {
    try {
      return new Intl.NumberFormat(locale, { ...options, currencyDisplay: 'narrowSymbol' }).format(value);
    } catch {
      // older engines without narrowSymbol support
      return new Intl.NumberFormat(locale, options).format(value);
    }
  };
  if (value === 0) return fmt(base);
  // Add fraction digits until the rounded value deviates <10% from the true
  // value (FiatAmount semantics; 20 is Intl's maximumFractionDigits ceiling).
  // The check is arithmetic (value.toFixed), never parsed back from the
  // formatted string — locale decimal separators would corrupt a parse.
  const defaultDigits = new Intl.NumberFormat(locale, base).resolvedOptions().maximumFractionDigits ?? 2;
  let digits = defaultDigits;
  while (Math.abs((value - Number(value.toFixed(digits))) / value) > 0.1 && digits < 20) digits += 1;
  if (digits === defaultDigits) return fmt(base);
  return fmt({ ...base, minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Luna → whole NIM as a number. Display/math convenience; fine for any real
 *  balance (max supply 21e14 luna is well inside Number.MAX_SAFE_INTEGER). */
export function lunaToNim(luna: number | bigint): number {
  return Number(luna) / LUNA_PER_NIM;
}

/** Whole NIM → integer luna (rounded to the nearest luna). */
export function nimToLuna(nim: number): number {
  if (!Number.isFinite(nim)) throw new Error(`nimToLuna: ${nim} is not a finite number`);
  return Math.round(nim * LUNA_PER_NIM);
}

/**
 * Parse a user-entered NIM amount string into integer luna, validating as it
 * goes. Accepts the shapes fmtNim produces plus common user input:
 * optional sign, U+202F / regular-space / comma group separators, '.' decimal
 * point, up to 5 decimals. Throws on anything else (empty, letters, more than
 * 5 decimals, multiple points).
 */
export function parseNim(input: string): number {
  if (typeof input !== 'string') throw new Error('parseNim: expected a string');
  // strip group separators: U+202F (ours), NBSP, regular spaces, commas-as-grouping
  const cleaned = input.trim().replace(/[\u202F\u00A0\s]/g, '').replace(/,(?=\d{3}(\D|$))/g, '');
  const m = cleaned.match(/^([+-]?)(\d+)(?:\.(\d+))?$/);
  if (!m) throw new Error(`parseNim: "${input}" is not a valid NIM amount`);
  const [, sign, whole, frac = ''] = m;
  if (frac.length > NIM_DECIMALS) {
    throw new Error(`parseNim: "${input}" has more than ${NIM_DECIMALS} decimals (sub-luna)`);
  }
  const luna = Number.parseInt(whole + frac.padEnd(NIM_DECIMALS, '0'), 10);
  if (!Number.isSafeInteger(luna)) {
    throw new Error(`parseNim: "${input}" is out of safe integer range`);
  }
  return sign === '-' ? -luna : luna;
}
