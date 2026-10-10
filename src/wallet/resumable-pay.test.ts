import { describe, expect, test } from 'bun:test';
import { resumablePay } from './resumable-pay';
import { createSendLock } from './send-lock';
import type { StorageLike } from './pending-tx';
import type { ConfirmAttempt } from './pay-then-confirm';

const A = 'NQ45 78MF K2AA NREJ B39U YLRH C8B3 7S1X MH44';
const H = 'a'.repeat(64);
const mem = (): StorageLike => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};
const page = (storage: StorageLike, id: string) => createSendLock({ storage, session: null, instanceId: id });
const sleep = async () => {};
const answers = (...a: ConfirmAttempt[]) => {
  let i = 0;
  return async (): Promise<ConfirmAttempt> => a[Math.min(i++, a.length - 1)]!;
};

describe('resumablePay', () => {
  test('happy path: lock before send, handle saved, released on paid', async () => {
    const storage = mem();
    const lock = page(storage, 'p');
    let stateAtSend = '';
    const r = await resumablePay({
      lock,
      intent: 'o1',
      owner: A,
      send: async () => {
        stateAtSend = lock.status(A).state;
        return H;
      },
      confirm: answers({ status: 'ok' }),
      sleep,
    });
    expect(stateAtSend).toBe('sending');
    expect(r).toEqual({ state: 'paid', handle: H, resumed: false });
    expect(lock.status(A).state).toBe('idle');
  });

  test('reload after the wallet answered: resumes on the saved hash, never sends', async () => {
    const storage = mem();
    const r1 = await resumablePay({ lock: page(storage, 'before'), intent: 'o1', owner: A, send: async () => H, confirm: answers({ status: 'pending' }), attempts: 2, sleep });
    expect(r1).toMatchObject({ state: 'pending', handle: H, resumed: false });

    let sends = 0;
    const seen: string[] = [];
    const r2 = await resumablePay({
      lock: page(storage, 'after'),
      intent: 'o1',
      owner: A,
      send: async () => {
        sends++;
        return 'b'.repeat(64);
      },
      confirm: async (h) => {
        seen.push(h);
        return { status: 'ok' };
      },
      sleep,
    });
    expect(sends).toBe(0);
    expect(seen).toEqual([H]);
    expect(r2).toEqual({ state: 'paid', handle: H, resumed: true });
    expect(page(storage, 'x').status(A).state).toBe('idle');
  });

  test('reload while the wallet was open: ambiguous, no send, lock kept', async () => {
    const storage = mem();
    page(storage, 'dead').begin('o1', A);
    let sends = 0;
    const r = await resumablePay({ lock: page(storage, 'now'), intent: 'o1', owner: A, send: async () => (sends++, H), confirm: answers({ status: 'ok' }), sleep });
    expect(sends).toBe(0);
    expect(r.state).toBe('ambiguous');
    expect(page(storage, 'y').status(A).state).toBe('ambiguous');
  });

  test('ambiguous plus a lookup that finds the tx: adopts it and confirms, no send', async () => {
    const storage = mem();
    page(storage, 'dead').begin('o1', A);
    let sends = 0;
    const r = await resumablePay({
      lock: page(storage, 'now'),
      intent: 'o1',
      owner: A,
      send: async () => (sends++, H),
      lookup: async () => H,
      confirm: answers({ status: 'ok' }),
      sleep,
    });
    expect(sends).toBe(0);
    expect(r).toEqual({ state: 'paid', handle: H, resumed: true });
  });

  test('a lookup that finds nothing or throws stays ambiguous', async () => {
    for (const lookup of [async () => null, async () => '', async () => { throw new Error('down'); }]) {
      const storage = mem();
      page(storage, 'dead').begin('o1', A);
      const r = await resumablePay({ lock: page(storage, 'now'), intent: 'o1', owner: A, send: async () => H, lookup, confirm: answers({ status: 'ok' }), sleep });
      expect(r.state).toBe('ambiguous');
    }
  });

  test('wallet approved but returned no hash: ambiguous, not failed, lock kept', async () => {
    const storage = mem();
    const r = await resumablePay({ lock: page(storage, 'p'), intent: 'o1', owner: A, send: async () => '', confirm: answers({ status: 'ok' }), sleep });
    expect(r.state).toBe('ambiguous');
    expect(page(storage, 'reloaded').status(A).state).toBe('ambiguous');
  });

  test('a send error after the broadcast could have happened is ambiguous', async () => {
    const storage = mem();
    const r = await resumablePay({ lock: page(storage, 'p'), intent: 'o1', owner: A, send: async () => { throw new Error('WebView closed'); }, confirm: answers({ status: 'ok' }), sleep });
    expect(r.state).toBe('ambiguous');
  });

  test('cancel and pre-sign refusal release the lock', async () => {
    const storage = mem();
    const lock = page(storage, 'p');
    expect((await resumablePay({ lock, intent: 'o1', owner: A, send: async () => { throw { code: 4001, message: 'User rejected' }; }, confirm: answers({ status: 'ok' }), sleep })).state).toBe('cancelled');
    expect(lock.status(A).state).toBe('idle');
    expect((await resumablePay({ lock, intent: 'o1', owner: A, send: async () => { throw new Error('Insufficient balance'); }, confirm: answers({ status: 'ok' }), sleep })).state).toBe('failed');
    expect(lock.status(A).state).toBe('idle');
  });

  test('a rejected confirmation releases the lock', async () => {
    const lock = page(mem(), 'p');
    const r = await resumablePay({ lock, intent: 'o1', owner: A, send: async () => H, confirm: answers({ status: 'fail', error: 'wrong amount' }), sleep });
    expect(r).toEqual({ state: 'rejected', handle: H, error: 'wrong amount' });
    expect(lock.status(A).state).toBe('idle');
  });

  test('another intent in flight for this wallet: locked, no send', async () => {
    const storage = mem();
    page(storage, 'other-tab').begin('o1', A);
    let sends = 0;
    const r = await resumablePay({ lock: page(storage, 'p'), intent: 'o2', owner: A, send: async () => (sends++, H), confirm: answers({ status: 'ok' }), sleep });
    expect(sends).toBe(0);
    expect(r.state).toBe('locked');
  });

  test('a throwing onStatus does not change the outcome', async () => {
    const r = await resumablePay({
      lock: page(mem(), 'p'),
      intent: 'o1',
      owner: A,
      send: async () => H,
      confirm: answers({ status: 'ok' }),
      onStatus: () => {
        throw new Error('ui');
      },
      sleep,
    });
    expect(r.state).toBe('paid');
  });
});
