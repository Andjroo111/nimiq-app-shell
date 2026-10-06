// Wait until Nimiq Pay can actually send, BEFORE asking it to.
//
// Ported from nim-duel (MIT, Copyright (c) 2026 Sukuna; see THIRD_PARTY.md),
// src/lib/nimiq.ts waitForConsensus + the grace sleep in payNim.
//
// Sending before the wallet has consensus fails with an opaque "syncing your
// account" error, and isConsensusEstablished() flips true slightly before the
// wallet's own account state settles, so a short grace follows it.
//
// What is deliberately NOT ported: nim-duel's retry of the SEND on a /sync/
// error. That message is not proven to be thrown before signing, and a retry
// after the wallet accepted the tx is a double-pay. This only ever waits
// before the first send; it never wraps or repeats one.

export interface ConsensusProvider {
  isConsensusEstablished?: () => Promise<unknown>;
}

export type SendReadiness =
  | { ready: true; waitedMs: number }
  /** No consensus within the budget: tell the user, do not send yet. */
  | { ready: false; reason: 'no-consensus'; waitedMs: number }
  /** The provider has no consensus probe: proceed (Hub, older SDKs). */
  | { ready: true; waitedMs: 0; unprobed: true };

export async function waitForSendReady(
  provider: ConsensusProvider | null | undefined,
  o: { timeoutMs?: number; graceMs?: number; pollMs?: number; sleep?: (ms: number) => Promise<void>; now?: () => number } = {},
): Promise<SendReadiness> {
  const fin = (v: number | undefined, d: number, name: string) => {
    const x = v ?? d;
    if (!Number.isFinite(x) || x < 0) throw new RangeError(`waitForSendReady: ${name} must be a finite number >= 0`);
    return x;
  };
  const timeoutMs = fin(o.timeoutMs, 45_000, 'timeoutMs');
  const graceMs = fin(o.graceMs, 1500, 'graceMs');
  const pollMs = Math.max(50, fin(o.pollMs, 1000, 'pollMs'));
  const sleep = o.sleep ?? ((ms) => new Promise<void>((r) => setTimeout(r, ms)));
  const now = o.now ?? Date.now;

  const probe = provider?.isConsensusEstablished;
  if (typeof probe !== 'function') return { ready: true, waitedMs: 0, unprobed: true };

  const start = now();
  let probes = 0;
  for (;;) {
    let ok = false;
    let t: ReturnType<typeof setTimeout> | undefined;
    try {
      // The SDK may answer a bare boolean or an { error } envelope. A probe
      // that never answers must not hold the caller past the budget.
      const left = Math.max(1, timeoutMs - (now() - start));
      ok = (await Promise.race([probe.call(provider), new Promise((r) => (t = setTimeout(() => r(false), left)))])) === true;
    } catch {
      ok = false;
    } finally {
      clearTimeout(t);
    }
    if (ok) {
      await sleep(graceMs);
      return { ready: true, waitedMs: now() - start };
    }
    // Past the budget on the clock, or a clock that does not move (count probes too).
    if (now() - start + pollMs > timeoutMs || ++probes * pollMs > timeoutMs) {
      return { ready: false, reason: 'no-consensus', waitedMs: now() - start };
    }
    await sleep(pollMs);
  }
}
