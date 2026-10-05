import { describe, expect, test } from 'bun:test';
import { startLivePoll } from './poll';

function harness(tokens: (string | Error)[]) {
  const timers: { fn: () => void; ms: number }[] = [];
  const listeners = new Map<string, () => void>();
  const doc = {
    visibilityState: 'visible' as DocumentVisibilityState,
    addEventListener: (t: string, f: () => void) => void listeners.set(t, f),
    removeEventListener: (t: string) => void listeners.delete(t),
  };
  const win = {
    addEventListener: (t: string, f: () => void) => void listeners.set(t, f),
    removeEventListener: (t: string) => void listeners.delete(t),
  };
  let reads = 0;
  const changes: string[] = [];
  const poll = startLivePoll({
    fetchToken: async () => {
      const t = tokens[Math.min(reads++, tokens.length - 1)]!;
      if (t instanceof Error) throw t;
      return t;
    },
    onChange: (t) => void changes.push(t),
    doc: doc as never,
    win: win as never,
    setTimer: (fn, ms) => (timers.push({ fn, ms }), timers.length - 1),
    clearTimer: (h) => void (timers[h as number] = { fn: () => {}, ms: -1 }),
  });
  const flush = () => new Promise((r) => setTimeout(r, 0));
  const fire = async () => {
    const t = timers.pop()!;
    t.fn();
    await flush();
    return t.ms;
  };
  return { poll, timers, listeners, doc, changes, flush, fire, reads: () => reads };
}

describe('startLivePoll', () => {
  test('first read fires onChange, then backs off x1.6 while the token is unchanged, capped', async () => {
    const h = harness(['a']);
    await h.flush();
    expect(h.changes).toEqual(['a']);
    const delays: number[] = [];
    for (let i = 0; i < 6; i++) delays.push(await h.fire());
    expect(delays).toEqual([3000, 4800, 7680, 12288, 19661, 20000]);
    expect(h.changes).toEqual(['a']);
  });

  test('a changed token fires onChange and snaps back to fast', async () => {
    const h = harness(['a', 'a', 'a', 'b']);
    await h.flush();
    await h.fire(); // a (3000 -> 4800)
    await h.fire(); // a (4800 -> 7680)
    expect(h.poll.intervalMs()).toBe(7680);
    await h.fire(); // b
    expect(h.changes).toEqual(['a', 'b']);
    expect(h.poll.intervalMs()).toBe(3000);
  });

  test('hidden pauses (no timer), visible polls at once on the fast interval', async () => {
    const h = harness(['a', 'a', 'c']);
    await h.flush();
    await h.fire();
    h.doc.visibilityState = 'hidden';
    h.listeners.get('visibilitychange')!();
    const live = h.timers.filter((t) => t.ms > 0).length;
    await h.fire(); // the pending timer was cancelled; firing it does nothing
    expect(h.reads()).toBe(2);
    h.doc.visibilityState = 'visible';
    h.listeners.get('visibilitychange')!();
    await h.flush();
    expect(h.reads()).toBe(3);
    expect(h.changes).toEqual(['a', 'c']);
    expect(live).toBeGreaterThanOrEqual(0);
  });

  test('a failing read backs off and keeps polling', async () => {
    const errors: unknown[] = [];
    const h = harness([new Error('503'), 'a']);
    await h.flush();
    expect(h.changes).toEqual([]);
    expect(h.poll.intervalMs()).toBe(4800);
    await h.fire();
    expect(h.changes).toEqual(['a']);
    expect(errors).toEqual([]);
  });

  test('stop removes listeners and no further reads happen', async () => {
    const h = harness(['a']);
    await h.flush();
    h.poll.stop();
    expect(h.listeners.size).toBe(0);
    await h.fire();
    expect(h.reads()).toBe(1);
  });

  test('kick polls now at the fast interval', async () => {
    const h = harness(['a', 'a', 'a']);
    await h.flush();
    await h.fire();
    h.poll.kick();
    await h.flush();
    expect(h.reads()).toBe(3);
  });
});
