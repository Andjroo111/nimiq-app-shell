// Pay once, then poll a confirmation until it settles (recon C1-408).
//
// Ported from nimiq-radio (MIT, Copyright (c) 2026 PanoramicRum; see
// THIRD_PARTY.md), apps/web/src/lib/payFlow.ts, with three changes the money
// path needs:
//   - the send happens EXACTLY ONCE. Running out of confirmation attempts is
//     `pending`, never a failure and never a resend: the payment may still land.
//   - a send error is classified by describeWalletError, so a `PENDING:` answer
//     is pending (keep polling elsewhere), a cancel is a cancel, and only a
//     real refusal is `failed`.
//   - no timeout ever wraps the send (the shell's rule); waits are between
//     confirmation attempts only.
// `onSent` runs the instant the wallet answers, before any confirmation, so
// the caller can persist the raw handle (see createPendingTxStore).

import { describeWalletError } from './outcome';

export type ConfirmAttempt = { status: 'ok' } | { status: 'pending'; progress?: string } | { status: 'fail'; error?: string };

export type PayThenConfirmResult =
  | { state: 'paid'; handle: string }
  | { state: 'cancelled' }
  /** The send itself was refused; nothing to confirm. */
  | { state: 'failed'; error: string }
  /** The confirmation said this payment is wrong (amount, recipient, failed on chain). */
  | { state: 'rejected'; handle: string; error?: string }
  /** Sent (or possibly sent) but not confirmed yet. Never resend: resume confirming later. */
  | { state: 'pending'; handle: string | null; message: string };

// After send() has been called, a broad keyword match is not enough: "connection
// aborted", "WebView closed" or a timeout can all follow a broadcast. Only an
// unmistakable user refusal is `cancelled`, only a refusal that can only happen
// before signing is `failed`; everything else is `pending` (outcome unknown).
const USER_REFUSAL = /\buser\b[^.]{0,40}\b(reject|rejected|denied|deny|cancel|cancell?ed|declin|dismiss|closed)\b|^\s*(request\s+)?(rejected|cancell?ed|denied)\s*(by\s+user)?\.?\s*$|action_rejected|\b4001\b/i;
const PRE_SIGN_REFUSAL =
  /\binsufficient (balance|funds)\b|\binvalid (recipient|address|amount|value)\b|\bno (provider|wallet)\b|\bnot installed\b|\bnot connected\b|\bamount (must|should) be\b/i;

function sendErrorOutcome(e: unknown): PayThenConfirmResult {
  const err = describeWalletError(e);
  const code = (e as { code?: unknown } | null)?.code;
  if (err.kind === 'pending') return { state: 'pending', handle: null, message: err.message };
  if (code === 4001 || USER_REFUSAL.test(err.message)) return { state: 'cancelled' };
  if (PRE_SIGN_REFUSAL.test(err.message)) return { state: 'failed', error: err.message };
  return { state: 'pending', handle: null, message: `outcome unknown: ${err.message}` };
}

const safe = (fn: (() => void) | undefined) => {
  try {
    fn?.();
  } catch {
    /* a UI callback must never decide a payment's outcome */
  }
};

export async function payThenConfirm(o: {
  /** The wallet send (signAndSend / pay). Called once. */
  send: () => Promise<string>;
  /** Ask the server whether `handle` paid this order. Thrown errors count as pending. */
  confirm: (handle: string) => Promise<ConfirmAttempt>;
  /** Persist the handle before confirming. A throw here does not stop the flow. */
  onSent?: (handle: string) => void | Promise<void>;
  onStatus?: (s: { phase: 'sending' } | { phase: 'confirming'; attempt: number; of: number; progress?: string }) => void;
  /** Give up waiting on onSent after this long (it keeps running). Default 5000. */
  onSentTimeoutMs?: number;
  attempts?: number;
  delayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}): Promise<PayThenConfirmResult> {
  const attempts = o.attempts ?? 20;
  const delayMs = o.delayMs ?? 3000;
  if (!Number.isInteger(attempts) || attempts < 1 || !Number.isFinite(delayMs) || delayMs < 0) {
    throw new RangeError('payThenConfirm: attempts must be an integer >= 1 and delayMs a finite number >= 0');
  }
  const sleep = o.sleep ?? ((ms) => new Promise<void>((r) => setTimeout(r, ms)));

  const onSentTimeoutMs = o.onSentTimeoutMs ?? 5000;
  if (!Number.isFinite(onSentTimeoutMs) || onSentTimeoutMs < 0) throw new RangeError('payThenConfirm: onSentTimeoutMs must be finite');

  safe(() => o.onStatus?.({ phase: 'sending' }));
  let handle: string;
  try {
    handle = await o.send();
  } catch (e) {
    return sendErrorOutcome(e);
  }
  if (typeof handle !== 'string' || handle === '') {
    // The wallet answered but gave nothing to confirm with: it may have sent.
    return { state: 'pending', handle: null, message: 'the wallet returned no transaction reference' };
  }
  let t: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([Promise.resolve().then(() => o.onSent?.(handle)), new Promise((r) => (t = setTimeout(r, onSentTimeoutMs)))]);
  } catch {
    /* persistence is best effort; confirming still proceeds */
  } finally {
    clearTimeout(t);
  }

  for (let i = 1; i <= attempts; i++) {
    let r: ConfirmAttempt;
    try {
      const got = (await o.confirm(handle)) as ConfirmAttempt | null | undefined;
      // Junk (null, { status: 'OK' }) is not an answer: keep waiting.
      r = got && (got.status === 'ok' || got.status === 'fail' || got.status === 'pending') ? got : { status: 'pending' };
    } catch {
      r = { status: 'pending' };
    }
    const progress = r.status === 'pending' && r.progress ? r.progress : undefined;
    safe(() => o.onStatus?.({ phase: 'confirming', attempt: i, of: attempts, ...(progress ? { progress } : {}) }));
    if (r.status === 'ok') return { state: 'paid', handle };
    if (r.status === 'fail') return { state: 'rejected', handle, ...(r.error ? { error: r.error } : {}) };
    if (i < attempts) await sleep(delayMs);
  }
  return { state: 'pending', handle, message: 'not confirmed yet; if it went through it will appear shortly' };
}
