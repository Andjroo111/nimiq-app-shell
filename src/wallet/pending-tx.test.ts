import { describe, expect, test } from 'bun:test';
import { classifyVerifyMessage, createPendingTxStore, verifyWithRetry, type StorageLike, type VerifyAnswer } from './pending-tx';

const A = 'NQ45 78MF K2AA NREJ B39U YLRH C8B3 7S1X MH44';
const mem = (): StorageLike => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};

describe('createPendingTxStore', () => {
  test('saved per (intent, wallet), any spelling, survives a new store on the same storage', () => {
    let t = 0;
    const storage = mem();
    createPendingTxStore({ storage, now: () => t }).save('cup-7', A, 'abc');
    const reloaded = createPendingTxStore({ storage, now: () => t });
    expect(reloaded.load('cup-7', A.replace(/ /g, '').toLowerCase())?.handle).toBe('abc');
    expect(reloaded.load('cup-8', A)).toBe(null);
  });
  test('expires after 24 h and clear removes it', () => {
    let t = 0;
    const s = createPendingTxStore({ storage: mem(), now: () => t });
    s.save('i', A, 'h');
    t = 24 * 3600_000;
    expect(s.load('i', A)?.handle).toBe('h');
    t += 1;
    expect(s.load('i', A)).toBe(null);
    s.save('j', A, 'h2');
    s.clear('j', A);
    expect(s.load('j', A)).toBe(null);
  });
  test('throwing storage keeps it in memory', () => {
    const bad: StorageLike = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); }, removeItem: () => { throw new Error('x'); } };
    const s = createPendingTxStore({ storage: bad });
    s.save('i', A, 'h');
    expect(s.load('i', A)?.handle).toBe('h');
  });
});

describe('classifyVerifyMessage', () => {
  test('already-consumed is success, confirmation counts are progress, unknown is pending', () => {
    expect(classifyVerifyMessage('Transaction already consumed')).toEqual({ kind: 'done' });
    expect(classifyVerifyMessage('tx has 2 confirmations, 10 required')).toEqual({ kind: 'pending', progress: '2 of 10 confirmations' });
    expect(classifyVerifyMessage('Wrong amount for this entry').kind).toBe('rejected');
    expect(classifyVerifyMessage('node timeout').kind).toBe('pending');
  });
});

describe('verifyWithRetry', () => {
  const run = (answers: (VerifyAnswer | Error)[], o: { maxMs?: number } = {}) => {
    let t = 0;
    let i = 0;
    const progress: string[] = [];
    const p = verifyWithRetry(
      async () => {
        const a = answers[Math.min(i++, answers.length - 1)]!;
        if (a instanceof Error) throw a;
        return a;
      },
      { intervalMs: 4000, maxMs: o.maxMs ?? 120_000, sleep: async (ms) => void (t += ms), now: () => t, onProgress: (x) => void progress.push(x) },
    );
    return p.then((r) => ({ r, calls: i, progress }));
  };

  test('pending, then done', async () => {
    const { r, calls, progress } = await run([{ kind: 'pending', progress: '1 of 10 confirmations' }, new Error('net'), { kind: 'done' }]);
    expect(r).toEqual({ state: 'done' });
    expect(calls).toBe(3);
    expect(progress).toEqual(['1 of 10 confirmations']);
  });
  test('rejected stops at once', async () => {
    expect((await run([{ kind: 'rejected', reason: 'wrong amount' }])).r).toEqual({ state: 'rejected', reason: 'wrong amount' });
  });
  test('gives up waiting after maxMs as still-pending (never as failed)', async () => {
    const { r, calls } = await run([{ kind: 'pending', progress: '2 of 10 confirmations' }], { maxMs: 12_000 });
    expect(r).toEqual({ state: 'still-pending', lastProgress: '2 of 10 confirmations' });
    expect(calls).toBe(4); // at 0, 4, 8 and 12 s
  });
});

describe('review findings', () => {
  test('mixed or hostile text is never done; negated mismatch text is never rejected', () => {
    for (const m of [
      'transaction already used for another order',
      'Rejected: wrong amount (already consumed)',
      'payment not yet credited; wallet already verified a different tx',
    ]) expect(classifyVerifyMessage(m).kind).not.toBe('done');
    for (const m of ['Payment verified OK, no mismatch value', 'no invalid amount detected, confirmed']) {
      expect(classifyVerifyMessage(m).kind).not.toBe('rejected');
    }
    expect(classifyVerifyMessage('Transaction already consumed.')).toEqual({ kind: 'done' });
    expect(classifyVerifyMessage(undefined)).toEqual({ kind: 'pending' });
  });

  test('intent and owner cannot collide through a separator', () => {
    const s = createPendingTxStore({ storage: mem() });
    s.save('a:B', 'X', 'H');
    expect(s.load('a', 'B:X')).toBe(null);
  });

  test('NaN options throw; a verify that never answers yields still-pending by maxMs', async () => {
    expect(() => createPendingTxStore({ storage: mem(), ttlMs: NaN })).toThrow();
    await expect(verifyWithRetry(async () => ({ kind: 'pending' }), { intervalMs: NaN })).rejects.toThrow();
    const r = await verifyWithRetry(() => new Promise<VerifyAnswer>(() => {}), { intervalMs: 5, maxMs: 30 });
    expect(r.state).toBe('still-pending');
  });
});
