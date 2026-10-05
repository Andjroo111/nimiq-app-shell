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
}

export interface LivePoll {
  stop(): void;
  /** Poll now and reset to the fast interval (e.g. after the user acted). */
  kick(): void;
  /** Current delay before the next poll, for tests and diagnostics. */
  intervalMs(): number;
}

export function startLivePoll(o: LivePollOptions): LivePoll {
  const fastMs = Math.max(250, o.fastMs ?? 3000);
  const maxMs = Math.max(fastMs, o.maxMs ?? 20000);
  const factor = Math.max(1, o.factor ?? 1.6);
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
    try {
      const token = await o.fetchToken();
      if (stopped) return;
      if (token !== last) {
        last = token;
        interval = fastMs;
        await o.onChange(token);
      } else {
        interval = Math.min(maxMs, Math.round(interval * factor));
      }
    } catch (e) {
      // A failed read backs off like a quiet one; it never stops the loop.
      interval = Math.min(maxMs, Math.round(interval * factor));
      o.onError?.(e);
    } finally {
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
