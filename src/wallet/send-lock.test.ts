import { describe, expect, test } from 'bun:test';
import { createSendLock, type StorageEventSource } from './send-lock';
import type { StorageLike } from './pending-tx';

const A = 'NQ45 78MF K2AA NREJ B39U YLRH C8B3 7S1X MH44';
const B = 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000';
const mem = (): StorageLike & { m: Map<string, string> } => {
  const m = new Map<string, string>();
  return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};
const broken: StorageLike = {
  getItem() {
    throw new Error('denied');
  },
  setItem() {
    throw new Error('denied');
  },
  removeItem() {
    throw new Error('denied');
  },
};

describe('createSendLock', () => {
  test('one write per wallet: begin blocks a second begin, any intent, until released', () => {
    const lock = createSendLock({ storage: mem(), session: mem(), instanceId: 'p1' });
    expect(lock.begin('order-1', A).ok).toBe(true);
    const again = lock.begin('order-2', A);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.held.state).toBe('sending');
    expect(lock.begin('order-9', B).ok).toBe(true);
    expect(lock.release(A)).toBe(true);
    expect(lock.begin('order-2', A).ok).toBe(true);
  });

  test('a reload finds the lock: no handle reads as ambiguous, never idle', () => {
    const storage = mem();
    const before = createSendLock({ storage, session: null, instanceId: 'before' });
    before.begin('order-1', A);
    const after = createSendLock({ storage, session: null, instanceId: 'after' });
    const s = after.status(A.replace(/ /g, '').toLowerCase());
    expect(s.state).toBe('ambiguous');
    expect(s.mine).toBe(false);
    expect(after.begin('order-1', A).ok).toBe(false);
  });

  test('a saved handle reads as confirming in every tab', () => {
    const storage = mem();
    const tab1 = createSendLock({ storage, session: null, instanceId: 't1' });
    const tab2 = createSendLock({ storage, session: null, instanceId: 't2' });
    tab1.begin('order-1', A);
    expect(tab1.attachHandle(A, 'abc')).toBe(true);
    expect(tab2.status(A).state).toBe('confirming');
    expect(tab2.status(A).record?.handle).toBe('abc');
  });

  test('only the holder lifts it; anyone else needs force', () => {
    const storage = mem();
    const tab1 = createSendLock({ storage, session: null, instanceId: 't1' });
    const tab2 = createSendLock({ storage, session: null, instanceId: 't2' });
    tab1.begin('order-1', A);
    expect(tab2.release(A)).toBe(false);
    expect(tab2.status(A).state).toBe('ambiguous');
    expect(tab2.release(A, { force: true })).toBe(true);
    expect(tab1.status(A).state).toBe('idle');
  });

  test('attachHandle: holder only unless adopt, once, matching intent', () => {
    const storage = mem();
    const dead = createSendLock({ storage, session: null, instanceId: 'dead' });
    const now = createSendLock({ storage, session: null, instanceId: 'now' });
    dead.begin('order-1', A);
    expect(now.attachHandle(A, 'h1')).toBe(false);
    expect(now.attachHandle(A, 'h1', { adopt: true, intent: 'order-2' })).toBe(false);
    expect(now.attachHandle(A, '', { adopt: true })).toBe(false);
    expect(now.attachHandle(A, 'h1', { adopt: true, intent: 'order-1' })).toBe(true);
    expect(now.status(A)).toMatchObject({ state: 'confirming', mine: true });
    expect(now.attachHandle(A, 'h2')).toBe(false);
    expect(now.status(A).record?.handle).toBe('h1');
  });

  test('nothing lifts it on a timer before ttl; slow flips at slowMs; ttl drops it', () => {
    let t = 1000;
    const lock = createSendLock({ storage: mem(), session: null, now: () => t, slowMs: 15_000, ttlMs: 60_000, instanceId: 'p' });
    lock.begin('order-1', A);
    t += 14_999;
    expect(lock.status(A).slow).toBe(false);
    t += 1;
    expect(lock.status(A)).toMatchObject({ state: 'sending', slow: true, ageMs: 15_000 });
    t = 1000 + 60_000;
    expect(lock.status(A).state).toBe('sending');
    t += 1;
    expect(lock.status(A).state).toBe('idle');
  });

  test('localStorage throws: sessionStorage carries it across a reload', () => {
    const session = mem();
    createSendLock({ storage: broken, session, instanceId: 'a' }).begin('order-1', A);
    expect(createSendLock({ storage: broken, session, instanceId: 'b' }).status(A).state).toBe('ambiguous');
  });

  test('no storage at all: memory still locks this page', () => {
    const lock = createSendLock({ storage: broken, session: null, instanceId: 'a' });
    lock.begin('order-1', A);
    expect(lock.begin('order-2', A).ok).toBe(false);
  });

  test('another tab releasing wins over this tab\'s memory copy', () => {
    const storage = mem();
    const tab1 = createSendLock({ storage, session: null, instanceId: 't1' });
    tab1.begin('order-1', A);
    createSendLock({ storage, session: null, instanceId: 't2' }).release(A, { force: true });
    expect(tab1.status(A).state).toBe('idle');
  });

  test('corrupt or foreign records are ignored', () => {
    const storage = mem();
    const lock = createSendLock({ storage, session: null, instanceId: 'p' });
    const k = 'nq-shell:send-lock:' + A.replace(/ /g, '');
    for (const junk of ['{', 'null', '{"v":2}', JSON.stringify({ v: 1, intent: 'x', owner: 'NQ00', id: 'q', startedAt: 1 })]) {
      storage.m.set(k, junk);
      expect(lock.status(A).state).toBe('idle');
    }
  });

  test('subscribe fires for this prefix and for a cleared storage, not for other keys', () => {
    const fs = new Set<(e: { key: string | null }) => void>();
    const events: StorageEventSource = { addEventListener: (_t, f) => void fs.add(f), removeEventListener: (_t, f) => void fs.delete(f) };
    const lock = createSendLock({ storage: mem(), session: null, events });
    let n = 0;
    const off = lock.subscribe(() => n++);
    const fire = (key: string | null) => fs.forEach((f) => f({ key }));
    fire('nq-shell:send-lock:X');
    fire('something-else');
    fire(null);
    expect(n).toBe(2);
    off();
    fire('nq-shell:send-lock:X');
    expect(n).toBe(2);
  });

  test('bad options throw', () => {
    expect(() => createSendLock({ ttlMs: 0 })).toThrow(RangeError);
    expect(() => createSendLock({ slowMs: Number.NaN })).toThrow(RangeError);
  });
});
