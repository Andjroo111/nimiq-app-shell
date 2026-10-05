import { describe, expect, test } from 'bun:test';
import { createDeviceHistory, type StorageLike } from './device';

const A = 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000';
const B = 'NQ45 78MF K2AA NREJ B39U YLRH C8B3 7S1X MH44';
const mem = (): StorageLike => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};
const e = (ref: string, t = 1) => ({ ref, kind: 'invoice', createdAt: t });

describe('createDeviceHistory', () => {
  test('scoped by wallet, any spelling of it; empty with none connected', () => {
    const h = createDeviceHistory({ storage: mem() });
    h.remember(A, e('a1'));
    h.remember(B, e('b1'));
    expect(h.list(A.replace(/ /g, '').toLowerCase()).map((x) => x.ref)).toEqual(['a1']);
    expect(h.list(B).map((x) => x.ref)).toEqual(['b1']);
    expect(h.list(null)).toEqual([]);
    h.remember(null, e('orphan'));
    expect(h.list(A)).toHaveLength(1);
  });

  test('newest first, a re-remembered ref moves to the top, no duplicates', () => {
    const h = createDeviceHistory({ storage: mem() });
    h.remember(A, e('1'));
    h.remember(A, e('2'));
    h.remember(A, e('1', 9));
    expect(h.list(A).map((x) => `${x.ref}@${x.createdAt}`)).toEqual(['1@9', '2@1']);
  });

  test('capped per wallet, other wallets untouched', () => {
    const h = createDeviceHistory({ storage: mem(), cap: 3 });
    h.remember(B, e('b'));
    for (let i = 0; i < 5; i++) h.remember(A, e(`a${i}`));
    expect(h.list(A).map((x) => x.ref)).toEqual(['a4', 'a3', 'a2']);
    expect(h.list(B).map((x) => x.ref)).toEqual(['b']);
  });

  test('forget removes one row', () => {
    const h = createDeviceHistory({ storage: mem() });
    h.remember(A, e('x'));
    h.remember(A, e('y'));
    h.forget(A, 'x');
    expect(h.list(A).map((x) => x.ref)).toEqual(['y']);
  });

  test('a storage that throws never breaks the caller (private mode)', () => {
    const throwing: StorageLike = {
      getItem: () => { throw new Error('SecurityError'); },
      setItem: () => { throw new Error('QuotaExceeded'); },
    };
    const h = createDeviceHistory({ storage: throwing });
    h.remember(A, e('kept-in-memory'));
    expect(h.list(A).map((x) => x.ref)).toEqual(['kept-in-memory']);
  });

  test('corrupt stored JSON reads as empty', () => {
    const s = mem();
    s.setItem('nq-shell:history:v1', '{nope');
    expect(createDeviceHistory({ storage: s }).list(A)).toEqual([]);
  });

  test('only the identifying shell is stored', () => {
    const s = mem();
    const h = createDeviceHistory({ storage: s });
    h.remember(A, { ...e('r'), label: 'Coffee', amount: 5 } as never);
    expect(JSON.parse(s.getItem('nq-shell:history:v1')!)[0]).toEqual({ owner: A.replace(/ /g, ''), ref: 'r', kind: 'invoice', createdAt: 1, label: 'Coffee' });
  });
});
