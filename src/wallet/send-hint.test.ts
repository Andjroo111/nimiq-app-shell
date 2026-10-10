import { describe, expect, test } from 'bun:test';
import { describeSendFailure, SEND_DETAIL_MAX, SEND_HINT_KEYS } from './send-hint';
import { shellLocales } from '../locales';

const payErr = (type: string, message: string) => Object.assign(new Error(`Nimiq Pay: ${message}`), { type });

describe('describeSendFailure', () => {
  test("Pay's exceeds-balance is an unconfirmed balance, not an empty wallet", () => {
    const f = describeSendFailure(payErr('INVALID_TRANSACTION', 'Transaction value exceeds balance'));
    expect(f).toMatchObject({ kind: 'failed', reason: 'unconfirmed-balance', hintKey: 'shell.hintUnconfirmed' });
  });

  test('a plain insufficient balance gets no confirming hint', () => {
    expect(describeSendFailure({ error: { type: 'INSUFFICIENT_FUNDS', message: 'insufficient balance' } }).reason).toBeNull();
  });

  test("the backend's own consensus refusal reads as syncing", () => {
    const f = describeSendFailure(new Error('Nimiq Pay: still syncing with the network, nothing was sent. Try again in a moment'));
    expect(f.reason).toBe('syncing');
    expect(describeSendFailure('Your wallet is still syncing your account').reason).toBe('syncing');
  });

  test('a closed validity window has its own hint', () => {
    expect(describeSendFailure(new Error('Transaction validity window has ended')).reason).toBe('validity-window');
  });

  test('cancel and pending never get a hint, whatever the text says', () => {
    expect(describeSendFailure(payErr('USER_REJECTED', 'User rejected: value exceeds balance'))).toMatchObject({ kind: 'cancelled', hintKey: null });
    expect(describeSendFailure('PENDING: still syncing').hintKey).toBeNull();
  });

  test('unknown failure: no hint, detail kept and capped', () => {
    const f = describeSendFailure(new Error(`boom\n\n${'x'.repeat(500)}`));
    expect(f.reason).toBeNull();
    expect(f.detail.startsWith('boom x')).toBe(true);
    expect(f.detail.length).toBe(SEND_DETAIL_MAX);
  });

  test('every hint key ships in every locale', () => {
    for (const [loc, msgs] of Object.entries(shellLocales)) {
      for (const key of Object.values(SEND_HINT_KEYS)) expect((msgs as Record<string, string>)[key], `${loc}:${key}`).toBeTruthy();
    }
  });
});
