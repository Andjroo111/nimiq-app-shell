import { describe, expect, test } from 'bun:test';
import { isValidityWindowError, pickValidityStartHeight } from './validity';

describe('pickValidityStartHeight', () => {
  test('the larger height wins', () => {
    expect(pickValidityStartHeight(100, 130)).toBe(130);
    expect(pickValidityStartHeight(130, 100)).toBe(130);
  });
  test('either side may be missing or junk', () => {
    expect(pickValidityStartHeight(null, 130)).toBe(130);
    expect(pickValidityStartHeight(100, undefined)).toBe(100);
    expect(pickValidityStartHeight(0, -5)).toBe(undefined);
    expect(pickValidityStartHeight(NaN, 1.5)).toBe(undefined);
  });
});

describe('isValidityWindowError', () => {
  test('recognises the wallet strings in any envelope', () => {
    expect(isValidityWindowError('Transaction validity end reached')).toBe(true);
    expect(isValidityWindowError({ error: { type: 'x', message: 'validity_window exceeded' } })).toBe(true);
    expect(isValidityWindowError(new Error('transaction expired'))).toBe(true);
  });
  test('other failures and PENDING: are not it', () => {
    expect(isValidityWindowError('insufficient funds')).toBe(false);
    expect(isValidityWindowError('PENDING: transaction validity end not yet known')).toBe(false);
    expect(isValidityWindowError(undefined)).toBe(false);
  });
});
