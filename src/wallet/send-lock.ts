// One write in flight per wallet, across reloads and tabs (recon W-261009-100).
//
// Pattern from Validator Swipe (index.html, vs:pending; MIT, Copyright (c)
// 2026 Julien CURTO; see THIRD_PARTY.md), rewritten as a store:
//   - the lock is written BEFORE the wallet is asked to send, so a WebView
//     reload mid-send still finds it. localStorage is the shared truth,
//     sessionStorage backs it up, memory is the last resort.
//   - every record names the page instance that took it. Only that page lifts
//     it on its own; anyone else needs `force`, which is the chain, the server,
//     or the user's explicit "Not sent? Unlock".
//   - nothing lifts a lock on a timer. A record with no handle is `ambiguous`
//     once its page is gone: the wallet may have sent. Never send again from
//     that state without a lookup or the user's word.
//   - other tabs see changes through the storage event (subscribe).
// Records expire after ttlMs (24 h): a Nimiq tx that has not landed by then
// is past its validity window and never will.

import type { StorageLike } from './pending-tx';

export interface SendLockRecord {
  v: 1;
  intent: string;
  /** Compact uppercase address of the wallet that is sending. */
  owner: string;
  /** The page instance that holds the lock. */
  id: string;
  startedAt: number;
  /** What the wallet returned, once it did. */
  handle?: string;
  handleAt?: number;
}

export type SendLockState =
  | 'idle'
  /** This page asked the wallet to send and has no answer yet. */
  | 'sending'
  /** A send was asked for by a page that is not this one (reloaded, or another
   *  tab) and no handle was saved. The payment may or may not exist. */
  | 'ambiguous'
  /** The wallet returned a handle; confirm it, never send again. */
  | 'confirming';

export interface SendLockStatus {
  state: SendLockState;
  record: SendLockRecord | null;
  /** True when this page holds the record. */
  mine: boolean;
  ageMs: number;
  /** ageMs >= slowMs, for a "taking longer than usual" line. */
  slow: boolean;
}

export interface SendLock {
  readonly instanceId: string;
  /** Take the lock before calling the wallet. False when any record exists for this wallet. */
  begin(intent: string, owner: string): { ok: true; record: SendLockRecord } | { ok: false; held: SendLockStatus };
  /** Save the wallet's handle on the record. Only the holder, or `adopt`, and only once. */
  attachHandle(owner: string, handle: string, o?: { intent?: string; adopt?: boolean }): boolean;
  status(owner: string): SendLockStatus;
  /** The holder may release; anyone else needs force. Returns true if a record was removed. */
  release(owner: string, o?: { force?: boolean }): boolean;
  /** Called when another tab changes a lock. Returns an unsubscribe. */
  subscribe(cb: () => void): () => void;
}

type StorageListener = (e: { key: string | null }) => void;
export interface StorageEventSource {
  addEventListener(t: 'storage', f: StorageListener): void;
  removeEventListener(t: 'storage', f: StorageListener): void;
}

const compact = (a: string) => a.replace(/\s+/g, '').toUpperCase();
const DAY = 24 * 3600_000;

function pick(name: 'localStorage' | 'sessionStorage'): StorageLike | null {
  try {
    return (globalThis as Record<string, unknown>)[name] as StorageLike | null ?? null;
  } catch {
    return null;
  }
}

function newId(): string {
  try {
    return globalThis.crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

export function createSendLock(
  o: {
    storage?: StorageLike | null;
    session?: StorageLike | null;
    prefix?: string;
    ttlMs?: number;
    slowMs?: number;
    now?: () => number;
    instanceId?: string;
    /** Where storage events arrive. Defaults to window; tests pass their own. */
    events?: StorageEventSource | null;
  } = {},
): SendLock {
  const prefix = o.prefix ?? 'nq-shell:send-lock:';
  const ttl = o.ttlMs ?? DAY;
  const slowMs = o.slowMs ?? 15_000;
  if (!Number.isFinite(ttl) || ttl <= 0 || !Number.isFinite(slowMs) || slowMs < 0) {
    throw new RangeError('createSendLock: ttlMs must be finite > 0 and slowMs finite >= 0');
  }
  const now = o.now ?? Date.now;
  const id = o.instanceId ?? newId();
  const local = o.storage !== undefined ? o.storage : pick('localStorage');
  const session = o.session !== undefined ? o.session : pick('sessionStorage');
  const mem = new Map<string, string>();
  const key = (owner: string) => prefix + compact(owner);

  const read = (k: string): SendLockRecord | null => {
    let raw: string | null = null;
    let localOk = false;
    if (local) {
      try {
        raw = local.getItem(k);
        localOk = true;
      } catch {
        /* fall through */
      }
    }
    if (!localOk && session) {
      try {
        raw = session.getItem(k);
      } catch {
        /* fall through */
      }
    }
    // Memory only answers when no storage could: another tab's release must win.
    if (raw === null && !localOk) raw = mem.get(k) ?? null;
    if (!raw) return null;
    try {
      const r = JSON.parse(raw) as SendLockRecord;
      if (r?.v !== 1 || typeof r.intent !== 'string' || typeof r.owner !== 'string' || typeof r.id !== 'string' || typeof r.startedAt !== 'number') return null;
      if (r.handle !== undefined && (typeof r.handle !== 'string' || !r.handle)) return null;
      return r;
    } catch {
      return null;
    }
  };
  const write = (k: string, r: SendLockRecord) => {
    const s = JSON.stringify(r);
    mem.set(k, s);
    for (const st of [session, local]) {
      try {
        st?.setItem(k, s);
      } catch {
        /* the next one, or memory, holds it */
      }
    }
  };
  const del = (k: string) => {
    mem.delete(k);
    for (const st of [session, local]) {
      try {
        st?.removeItem(k);
      } catch {
        /* ignore */
      }
    }
  };
  const live = (owner: string): SendLockRecord | null => {
    const k = key(owner);
    const r = read(k);
    if (!r) return null;
    if (r.owner !== compact(owner)) return null;
    if (now() - r.startedAt > ttl) {
      del(k);
      return null;
    }
    return r;
  };

  const status = (owner: string): SendLockStatus => {
    const r = live(owner);
    if (!r) return { state: 'idle', record: null, mine: false, ageMs: 0, slow: false };
    const mine = r.id === id;
    const ageMs = Math.max(0, now() - r.startedAt);
    const state: SendLockState = r.handle ? 'confirming' : mine ? 'sending' : 'ambiguous';
    return { state, record: r, mine, ageMs, slow: ageMs >= slowMs };
  };

  return {
    instanceId: id,
    begin(intent, owner) {
      if (!intent || !owner) throw new TypeError('SendLock.begin: intent and owner are required');
      const held = status(owner);
      if (held.state !== 'idle') return { ok: false, held };
      const record: SendLockRecord = { v: 1, intent, owner: compact(owner), id, startedAt: now() };
      write(key(owner), record);
      return { ok: true, record };
    },
    attachHandle(owner, handle, a = {}) {
      if (typeof handle !== 'string' || !handle) return false;
      const r = live(owner);
      if (!r || r.handle) return false;
      if (a.intent !== undefined && a.intent !== r.intent) return false;
      if (r.id !== id && !a.adopt) return false;
      write(key(owner), { ...r, id, handle, handleAt: now() });
      return true;
    },
    status,
    release(owner, a = {}) {
      const r = live(owner);
      if (!r) return false;
      if (r.id !== id && !a.force) return false;
      del(key(owner));
      return true;
    },
    subscribe(cb) {
      const target = o.events !== undefined ? o.events : ((globalThis as { window?: StorageEventSource }).window ?? null);
      if (!target) return () => {};
      const f: StorageListener = (e) => {
        // key null = storage.clear() in another tab, which also drops locks.
        if (e.key === null || e.key.startsWith(prefix)) cb();
      };
      target.addEventListener('storage', f);
      return () => target.removeEventListener('storage', f);
    },
  };
}
