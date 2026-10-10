// A pay flow that survives a WebView reload without paying twice
// (recon W-261009-62 Nimicurl, -65 NimTrace, -134 ChainMate).
//
// Every rival that lost real NIM lost it the same way: the page reloaded
// between "wallet approved" and "server confirmed", the app forgot, and the
// user was shown Pay again. So the order here is fixed:
//   1. the send lock is written BEFORE the wallet opens (intent + wallet);
//   2. the handle is saved on it the instant the wallet answers;
//   3. confirming runs on that saved handle, as many times as it takes.
// On re-entry with the same intent:
//   - a saved handle resumes confirming and never calls send;
//   - no handle (the page died while the wallet was open, or the wallet said
//     yes and gave nothing back) is `ambiguous`, not failed. `lookup` may find
//     the tx (server or chain); otherwise the caller shows a status and an
//     explicit "Not sent? Unlock", never an automatic Pay button.
// The lock is released only on paid, rejected, cancelled or a pre-sign failure.

import { payThenConfirm, type ConfirmAttempt } from './pay-then-confirm';
import type { SendLock, SendLockStatus } from './send-lock';

export type ResumablePayResult =
  | { state: 'paid'; handle: string; resumed: boolean }
  | { state: 'cancelled' }
  | { state: 'failed'; error: string }
  | { state: 'rejected'; handle: string; error?: string }
  /** Handle saved, not confirmed yet. Call again later; it resumes, it does not resend. */
  | { state: 'pending'; handle: string; message: string; resumed: boolean }
  /** A send may have happened and no handle is known. Do not offer Pay. */
  | { state: 'ambiguous'; status: SendLockStatus; message: string }
  /** Another write for this wallet is in flight (a different intent). */
  | { state: 'locked'; status: SendLockStatus };

export type ResumablePayStatus =
  | { phase: 'sending' }
  | { phase: 'looking-up' }
  | { phase: 'confirming'; attempt: number; of: number; progress?: string; resumed: boolean };

const safe = (fn: () => void) => {
  try {
    fn();
  } catch {
    /* a UI callback must never decide a payment's outcome */
  }
};

export async function resumablePay(o: {
  lock: SendLock;
  /** Stable id for this order. Same id on every re-entry. */
  intent: string;
  /** The paying wallet's address. */
  owner: string;
  /** The wallet send. Called at most once per intent, and only from idle. */
  send: () => Promise<string>;
  confirm: (handle: string) => Promise<ConfirmAttempt>;
  /** Ask the server or the chain for this intent's tx when no handle was saved. */
  lookup?: () => Promise<string | null>;
  onStatus?: (s: ResumablePayStatus) => void;
  attempts?: number;
  delayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}): Promise<ResumablePayResult> {
  const { lock, intent, owner } = o;
  const status = (s: ResumablePayStatus) => safe(() => o.onStatus?.(s));

  const confirmSaved = async (handle: string): Promise<ResumablePayResult> => {
    // payThenConfirm with a send that only returns the saved handle: the
    // wallet is never touched on this path.
    const r = await payThenConfirm({
      send: async () => handle,
      confirm: o.confirm,
      onStatus: (s) => {
        if (s.phase === 'confirming') status({ ...s, resumed: true });
      },
      attempts: o.attempts,
      delayMs: o.delayMs,
      sleep: o.sleep,
    });
    return settle(r, true);
  };

  const settle = (r: Awaited<ReturnType<typeof payThenConfirm>>, resumed: boolean): ResumablePayResult => {
    switch (r.state) {
      case 'paid':
        lock.release(owner, { force: true });
        return { state: 'paid', handle: r.handle, resumed };
      case 'rejected':
        lock.release(owner, { force: true });
        return { state: 'rejected', handle: r.handle, ...(r.error ? { error: r.error } : {}) };
      case 'cancelled':
        lock.release(owner);
        return { state: 'cancelled' };
      case 'failed':
        lock.release(owner);
        return { state: 'failed', error: r.error };
      case 'pending':
        if (r.handle) return { state: 'pending', handle: r.handle, message: r.message, resumed };
        return { state: 'ambiguous', status: lock.status(owner), message: r.message };
    }
  };

  const held = lock.status(owner);
  if (held.state !== 'idle') {
    const rec = held.record!;
    if (rec.intent !== intent) return { state: 'locked', status: held };
    if (rec.handle) return confirmSaved(rec.handle);
    if (o.lookup) {
      status({ phase: 'looking-up' });
      let found: string | null = null;
      try {
        found = await o.lookup();
      } catch {
        found = null;
      }
      if (typeof found === 'string' && found && lock.attachHandle(owner, found, { intent, adopt: true })) {
        return confirmSaved(found);
      }
    }
    return {
      state: 'ambiguous',
      status: lock.status(owner),
      message: 'a payment for this order may already have been sent; check before paying again',
    };
  }

  const began = lock.begin(intent, owner);
  // Lost a race with another tab between status() and begin().
  if (!began.ok) {
    return began.held.record?.intent === intent
      ? { state: 'ambiguous', status: began.held, message: 'a payment for this order is already in progress' }
      : { state: 'locked', status: began.held };
  }

  status({ phase: 'sending' });
  const r = await payThenConfirm({
    send: o.send,
    confirm: o.confirm,
    onSent: (h) => {
      lock.attachHandle(owner, h, { intent });
    },
    onStatus: (s) => {
      if (s.phase === 'confirming') status({ ...s, resumed: false });
    },
    attempts: o.attempts,
    delayMs: o.delayMs,
    sleep: o.sleep,
  });
  return settle(r, false);
}
