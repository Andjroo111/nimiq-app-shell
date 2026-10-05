// Remember a sent payment before anyone verifies it (recon C2-280).
//
// The moment a wallet returns a hash (or a serialized tx), save it keyed by
// (intent, wallet) in localStorage, 24 h, BEFORE the server is asked to
// verify. sessionStorage lost payments on a browser restart. On reload the
// app finds the entry and resumes verifying the same hash instead of asking
// the user to pay again. Then verifyWithRetry re-submits that same hash on a
// fixed cadence, classifying each server answer.

export interface PendingTx {
  intent: string;
  owner: string;
  /** What the wallet returned: a hash or a serialized tx. Never re-derived here. */
  handle: string;
  savedAt: number;
}

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

const compact = (a: string) => a.replace(/\s+/g, '').toUpperCase();
const DAY = 24 * 3600_000;

export function createPendingTxStore(o: { storage?: StorageLike | null; prefix?: string; ttlMs?: number; now?: () => number } = {}) {
  const prefix = o.prefix ?? 'nq-shell:pending-tx:';
  const ttl = o.ttlMs ?? DAY;
  const now = o.now ?? Date.now;
  const mem = new Map<string, string>();
  let s: StorageLike | null = null;
  if (o.storage !== undefined) s = o.storage;
  else {
    try {
      s = (globalThis as { localStorage?: StorageLike }).localStorage ?? null;
    } catch {
      s = null;
    }
  }
  const k = (intent: string, owner: string) => `${prefix}${intent}:${compact(owner)}`;
  const get = (key: string) => {
    try {
      return s ? s.getItem(key) : (mem.get(key) ?? null);
    } catch {
      return mem.get(key) ?? null;
    }
  };
  const set = (key: string, v: string) => {
    mem.set(key, v);
    try {
      s?.setItem(key, v);
    } catch {
      /* memory copy holds it */
    }
  };
  const del = (key: string) => {
    mem.delete(key);
    try {
      s?.removeItem(key);
    } catch {
      /* ignore */
    }
  };

  return {
    /** Call the instant the wallet returns, before any verification. */
    save(intent: string, owner: string, handle: string): void {
      if (!intent || !owner || !handle) return;
      set(k(intent, owner), JSON.stringify({ intent, owner: compact(owner), handle, savedAt: now() }));
    },
    /** The saved entry for this (intent, wallet), or null if none or expired. */
    load(intent: string, owner: string): PendingTx | null {
      const key = k(intent, owner);
      const raw = get(key);
      if (!raw) return null;
      try {
        const v = JSON.parse(raw) as PendingTx;
        if (typeof v.handle !== 'string' || typeof v.savedAt !== 'number') return null;
        if (now() - v.savedAt > ttl) {
          del(key);
          return null;
        }
        return v;
      } catch {
        return null;
      }
    },
    /** Only after a verified-final or a terminal answer. */
    clear(intent: string, owner: string): void {
      del(k(intent, owner));
    },
  };
}

export type VerifyAnswer =
  /** Server accepted it, or had already consumed this exact tx. */
  | { kind: 'done' }
  /** Not settled yet; `progress` is optional copy like "2 of 10 confirmations". */
  | { kind: 'pending'; progress?: string }
  /** The tx is wrong for this intent (amount, recipient, failed on chain). */
  | { kind: 'rejected'; reason: string };

export type VerifyOutcome =
  | { state: 'done' }
  | { state: 'rejected'; reason: string }
  /** Gave up WAITING, not on the payment: keep the saved entry and resume later. */
  | { state: 'still-pending'; lastProgress?: string };

/** Map a server message onto a VerifyAnswer. Unknown text is pending, never rejected. */
export function classifyVerifyMessage(msg: string): VerifyAnswer {
  const m = msg.toLowerCase();
  if (/already[\s-]?(consumed|used|redeemed|credited|verified)/.test(m)) return { kind: 'done' };
  const conf = m.match(/has (\d+) confirmations?,? (\d+) required/);
  if (conf) return { kind: 'pending', progress: `${conf[1]} of ${conf[2]} confirmations` };
  if (/(wrong|insufficient|mismatch|invalid) (amount|recipient|value|memo)|execution failed|failed on chain/.test(m)) {
    return { kind: 'rejected', reason: msg };
  }
  return { kind: 'pending' };
}

/**
 * Re-submit the SAME handle every `intervalMs` until done, rejected, or
 * `maxMs` elapses. A throw from `verify` (network) counts as pending.
 * Never sends a new payment; never clears the saved entry on a timeout.
 */
export async function verifyWithRetry(
  verify: () => Promise<VerifyAnswer>,
  o: { intervalMs?: number; maxMs?: number; onProgress?: (p: string) => void; sleep?: (ms: number) => Promise<void>; now?: () => number } = {},
): Promise<VerifyOutcome> {
  const interval = Math.max(1, o.intervalMs ?? 4000);
  const maxMs = Math.max(interval, o.maxMs ?? 120_000);
  const sleep = o.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const now = o.now ?? Date.now;
  const start = now();
  let last: string | undefined;
  for (;;) {
    let a: VerifyAnswer;
    try {
      a = await verify();
    } catch {
      a = { kind: 'pending' };
    }
    if (a.kind === 'done') return { state: 'done' };
    if (a.kind === 'rejected') return { state: 'rejected', reason: a.reason };
    if (a.progress) {
      last = a.progress;
      o.onProgress?.(a.progress);
    }
    if (now() - start + interval > maxMs) return last ? { state: 'still-pending', lastProgress: last } : { state: 'still-pending' };
    await sleep(interval);
  }
}
