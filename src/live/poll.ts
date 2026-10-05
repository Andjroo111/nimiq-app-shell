// Cheap live updates without websockets (recon C1-235).
//
// The server exposes one tiny "version token" (a string built from everything
// a viewer would notice). The client polls it fast, backs off while nothing
// changes, pauses while the page is hidden, snaps back to fast on focus, and
// fetches the full payload only when the token moves.

export interface LivePollOptions {
  /** Read the current token. Cheap: one row, one string. */
  fetchToken: () => Promise<string>;
  /** Called with the new token when it differs from the last one seen
   *  (including the first successful read). Fetch the full payload here. */
  onChange: (token: string) => void | Promise<void>;
  /** Default 3000. */
  fastMs?: number;
  /** Default 20000. */
  maxMs?: number;
  /** Interval multiplier per unchanged poll. Default 1.6. */
  factor?: number;
  /** For visibility/focus. Default globalThis.document when present. */
  doc?: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'> | null;
  /** For focus. Default globalThis.window when present. */
  win?: Pick<Window, 'addEventListener' | 'removeEventListener'> | null;
  /** Injected for tests. */
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (h: unknown) => void;
  onError?: (e: unknown) => void;
  /** Abandon one fetchToken after this long. Default 10000. */
  tokenTimeoutMs?: number;
}

export interface LivePoll {
  stop(): void;
  /** Poll now and reset to the fast interval (e.g. after the user acted). */
  kick(): void;
  /** Current delay before the next poll, for tests and diagnostics. */
  intervalMs(): number;
}

export function startLivePoll(o: LivePollOptions): LivePoll {
  const fin = (v: number | undefined, d: number, name: string) => {
    const x = v ?? d;
    // NaN slips through Math.max and turns the timer into a ~1 ms busy loop.
    if (!Number.isFinite(x)) throw new RangeError(`startLivePoll: ${name} must be finite`);
    return x;
  };
  const fastMs = Math.max(250, fin(o.fastMs, 3000, 'fastMs'));
  const maxMs = Math.max(fastMs, fin(o.maxMs, 20000, 'maxMs'));
  const factor = Math.max(1, fin(o.factor, 1.6, 'factor'));
  const tokenTimeoutMs = Math.max(1, fin(o.tokenTimeoutMs, 10_000, 'tokenTimeoutMs'));
  const doc = o.doc === undefined ? ((globalThis as { document?: Document }).document ?? null) : o.doc;
  const win = o.win === undefined ? ((globalThis as { window?: Window }).window ?? null) : o.win;
  const setT = o.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearT = o.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));

  let last: string | null = null;
  let interval = fastMs;
  let timer: unknown = null;
  let running = false;
  let stopped = false;

  const hidden = () => doc?.visibilityState === 'hidden';

  const schedule = () => {
    if (stopped || hidden()) return; // hidden: no timer at all until visible
    if (timer !== null) clearT(timer);
    timer = setT(tick, interval);
  };

  const tick = async () => {
    timer = null;
    if (stopped || hidden() || running) return;
    running = true;
    let fetchTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      // A fetch that never answers must not freeze the loop (running stays true).
      const token = await Promise.race([
        o.fetchToken(),
        new Promise<never>((_, rej) => (fetchTimer = setTimeout(() => rej(new Error('token fetch timed out')), tokenTimeoutMs))),
      ]);
      if (stopped) return;
      if (token !== last) {
        interval = fastMs;
        // A hung onChange must not freeze the loop: it gets the same timeout as
        // the fetch, and an unfinished delivery is retried next poll.
        let changeTimer: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([
            Promise.resolve().then(() => o.onChange(token)),
            new Promise<never>((_, rej) => (changeTimer = setTimeout(() => rej(new Error('onChange timed out')), tokenTimeoutMs))),
          ]);
        } finally {
          clearTimeout(changeTimer);
        }
        // Only a delivered token counts as seen; a throwing onChange gets it again.
        last = token;
      } else {
        interval = Math.min(maxMs, Math.round(interval * factor));
      }
    } catch (e) {
      // A failed read backs off like a quiet one; it never stops the loop.
      interval = Math.min(maxMs, Math.round(interval * factor));
      o.onError?.(e);
    } finally {
      clearTimeout(fetchTimer);
      running = false;
      schedule();
    }
  };

  const wake = () => {
    if (stopped || hidden()) return;
    interval = fastMs;
    if (timer !== null) clearT(timer);
    timer = null;
    void tick();
  };
  const onVisibility = () => (hidden() ? (timer !== null && clearT(timer), (timer = null)) : wake());

  doc?.addEventListener('visibilitychange', onVisibility);
  win?.addEventListener('focus', wake);
  void tick();

  return {
    stop() {
      stopped = true;
      if (timer !== null) clearT(timer);
      timer = null;
      doc?.removeEventListener('visibilitychange', onVisibility);
      win?.removeEventListener('focus', wake);
    },
    kick: wake,
    intervalMs: () => interval,
  };
}
