import { describe, expect, test } from 'bun:test';
import { nimiqRequestLink, DEFAULT_REQUEST_BASE } from './request-link';

const ADDRESS = 'NQ34 248H 8MB8 8QK2 5RVK EM8Q QJ8N 2Q5R 3XRK';
const COMPACT = 'NQ34248H8MB88QK25RVKEM8QQJ8N2Q5R3XRK';

describe('nimiqRequestLink', () => {
  test('no amount is a bare recipient, with no empty segment after it', () => {
    expect(nimiqRequestLink(ADDRESS))
      .toBe(`${DEFAULT_REQUEST_BASE}/#_request/${COMPACT}_`);
  });

  // Upstream's rule, and not cosmetic: a link carrying an empty amount segment
  // parses differently from one carrying none.
  test('an amount is in NIM, not luna', () => {
    expect(nimiqRequestLink(ADDRESS, { amountLuna: 12_550_000n }))
      .toBe(`${DEFAULT_REQUEST_BASE}/#_request/${COMPACT}/125.5_`);
  });

  test('a message forces an amount segment, empty when there is no amount', () => {
    expect(nimiqRequestLink(ADDRESS, { message: 'coffee' }))
      .toBe(`${DEFAULT_REQUEST_BASE}/#_request/${COMPACT}//coffee_`);
  });

  test('amount and message together', () => {
    expect(nimiqRequestLink(ADDRESS, { amountLuna: 100_000n, message: 'two coffees' }))
      .toBe(`${DEFAULT_REQUEST_BASE}/#_request/${COMPACT}/1/two%20coffees_`);
  });

  // The thing that made this a port rather than an import: upstream defaults
  // the base to window.location.host, which from a fleet app mints a link to
  // that app's own domain, and nothing there can open it.
  test('the base defaults to the wallet, never the current page', () => {
    expect(nimiqRequestLink(ADDRESS)).toStartWith('https://wallet.nimiq.com/');
  });

  test('a host base is honoured, with or without its trailing slash', () => {
    expect(nimiqRequestLink(ADDRESS, { basePath: 'https://pay.example/' }))
      .toBe(`https://pay.example/#_request/${COMPACT}_`);
    expect(nimiqRequestLink(ADDRESS, { basePath: 'https://pay.example' }))
      .toBe(`https://pay.example/#_request/${COMPACT}_`);
  });

  test('the address is normalised, spaces out and uppercased', () => {
    expect(nimiqRequestLink('nq34 248h 8mb8 8qk2 5rvk em8q qj8n 2q5r 3xrk'))
      .toContain(COMPACT);
  });

  test('a zero amount is treated as no amount', () => {
    expect(nimiqRequestLink(ADDRESS, { amountLuna: 0 }))
      .toBe(`${DEFAULT_REQUEST_BASE}/#_request/${COMPACT}_`);
  });
});
