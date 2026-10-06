import { describe, expect, test } from 'bun:test';
import { waitForSendReady } from './send-ready';

function clock() {
  let t = 0;
  const slept: number[] = [];
  return { now: () => t, sleep: async (ms: number) => void (slept.push(ms), (t += ms)), slept };
}

describe('waitForSendReady', () => {
  test('consensus already there: one grace sleep, then ready', async () => {
    const c = clock();
    const r = await waitForSendReady({ isConsensusEstablished: async () => true }, c);
    expect(r).toEqual({ ready: true, waitedMs: 1500 });
    expect(c.slept).toEqual([1500]);
  });

  test('polls until consensus, then grace', async () => {
    const c = clock();
    let n = 0;
    const r = await waitForSendReady({ isConsensusEstablished: async () => ++n >= 3 }, c);
    expect(r.ready).toBe(true);
    expect(c.slept).toEqual([1000, 1000, 1500]);
  });

  test('no consensus within the budget says so and never sends', async () => {
    const c = clock();
    const r = await waitForSendReady({ isConsensusEstablished: async () => false }, { ...c, timeoutMs: 5000 });
    expect(r).toMatchObject({ ready: false, reason: 'no-consensus' });
    expect(c.slept.every((ms) => ms === 1000)).toBe(true);
  });

  test('an error envelope or a throw is not consensus', async () => {
    const c = clock();
    const r1 = await waitForSendReady({ isConsensusEstablished: async () => ({ error: { message: 'x' } }) }, { ...c, timeoutMs: 2000 });
    expect(r1.ready).toBe(false);
    const r2 = await waitForSendReady({ isConsensusEstablished: async () => { throw new Error('boom'); } }, { ...c, timeoutMs: 2000 });
    expect(r2.ready).toBe(false);
  });

  test('a provider without the probe proceeds at once (Hub)', async () => {
    expect(await waitForSendReady({}, clock())).toEqual({ ready: true, waitedMs: 0, unprobed: true });
    expect(await waitForSendReady(null, clock())).toEqual({ ready: true, waitedMs: 0, unprobed: true });
  });

  test('NaN options throw', async () => {
    await expect(waitForSendReady({}, { timeoutMs: NaN })).rejects.toThrow();
  });

  test('a probe that never answers is cut off by the budget', async () => {
    const r = await waitForSendReady({ isConsensusEstablished: () => new Promise(() => {}) }, { timeoutMs: 50, pollMs: 50 });
    expect(r.ready).toBe(false);
  });

  test('a frozen clock with instant sleep still ends', async () => {
    const r = await waitForSendReady({ isConsensusEstablished: async () => false }, { now: () => 0, sleep: async () => {}, timeoutMs: 5000 });
    expect(r.ready).toBe(false);
  });
});
