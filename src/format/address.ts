// NQ address checksum, zero dependencies (recon C2-229, C2-082).
//
// A user-friendly address is an IBAN: `NQ` + 2 check digits + 32 chars of
// Nimiq's base32 alphabet (no I, O, W, Z). Move the first four to the end, map
// letters to 10..35, and the number mod 97 is 1. Same rule as
// `@nimiq/utils` ValidationUtils.isValidAddress, without pulling it in, so a
// Worker or a send form can reject a typo before the wallet dialog opens.

/** Nimiq's base32 alphabet, the only characters allowed after `NQ`. */
export const NIMIQ_ALPHABET = '0123456789ABCDEFGHJKLMNPQRSTUVXY';

const SHAPE = /^NQ[0-9]{2}[0-9A-HJ-NP-VXY]{32}$/;

/** Upper-case, drop spaces, dashes, `%20`, and a leading `nimiq:` scheme.
 *  Does not validate; pair with `isValidNimAddress`. */
export function compactNimAddress(raw: string): string {
  return raw
    .trim()
    .replace(/^nimiq:/i, '')
    .replace(/%20|[\s+-]/g, '')
    .toUpperCase();
}

/** The canonical display form: nine blocks of four, single spaces. */
export function normalizeNimAddress(raw: string): string {
  return compactNimAddress(raw).replace(/(.{4})(?=.)/g, '$1 ');
}

/** mod 97 of the IBAN digit string, streamed so no number exceeds 2^53. */
function ibanMod97(rearranged: string): number {
  let rem = 0;
  for (const c of rearranged) {
    const code = c.charCodeAt(0);
    const v = code >= 48 && code <= 57 ? code - 48 : code - 55;
    rem = (rem * (v >= 10 ? 100 : 10) + v) % 97;
  }
  return rem;
}

/** The two check digits for a 32-char base32 body. */
export function nimAddressCheckDigits(body: string): string {
  const b = body.toUpperCase();
  if (!/^[0-9A-HJ-NP-VXY]{32}$/.test(b)) throw new Error('address body is 32 base32 chars');
  return String(98 - ibanMod97(b + 'NQ00')).padStart(2, '0');
}

/** True only for a well-formed address whose check digits match. Accepts any
 *  spacing and case; `nimiq:` prefixes are tolerated. */
export function isValidNimAddress(raw: unknown): boolean {
  if (typeof raw !== 'string' || !raw) return false;
  const a = compactNimAddress(raw);
  if (!SHAPE.test(a)) return false;
  return ibanMod97(a.slice(4) + a.slice(0, 4)) === 1;
}
