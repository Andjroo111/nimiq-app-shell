// withTimeout — a promise race whose timer RESOLVES to a fallback.
//
// Why resolve and not reject (C1-415): a Nimiq Pay WebView that is suspended
// mid-call (screen locked, app backgrounded) leaves the native bridge promise
// neither resolved nor rejected. A try/catch around it never fires, so the
// caller hangs forever. Racing it against a timer that resolves to a known
// fallback is the only way to get control back.

/**
 * Race `p` against a timer. Resolves with `p`'s value if it settles first,
 * rejects with `p`'s error if it rejects first, else resolves to `fallback`
 * after `ms` milliseconds. The timer is cleared as soon as `p` settles.
 *
 * NEVER wrap a SEND or a SIGN in this: `sendBasicTransaction`,
 * `sendBasicTransactionWithData`, `sign`, `pay`, `signAndSend` or
 * `signMessage`. A send that times out may already have been broadcast.
 * Resolving it to a fallback tells the caller it failed, the caller retries,
 * and that is a double-send. Timeouts belong on init, detection and read-only
 * calls only. `timeout.test.ts` fails if a send path is wrapped.
 */
export function withTimeout<T, F = T>(p: Promise<T>, ms: number, fallback: F): Promise<T | F> {
  return new Promise<T | F>((resolve, reject) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    p.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
