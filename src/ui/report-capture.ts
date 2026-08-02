// Page-context capture for bug reports.
//
// A person reporting a bug can tell you what they saw. They cannot tell you the
// TypeError that fired ninety seconds earlier, or that /api/rates has been 502ing
// the whole time, and that is usually the half that identifies the bug. So the
// hooks go in at mount, before anything has gone wrong, and the last few errors
// ride along with whatever they end up typing.
//
// Ported from the nimiq.bot widget (bot.nimiq.tech/widget.js), which has been
// collecting exactly this shape for the fleet — same field names on purpose, so
// the service's triage reads reports from the corner control and reports from the
// widget identically.
//
// Bounded on purpose: ring buffers, short stacks, paths without origins. This
// leaves the device, so it is a debugging aid, not a session recording.

const MAX_ERRORS = 20;
const MAX_FAILURES = 12;

const consoleErrors: string[] = [];
const networkFailures: string[] = [];
let installed = false;

function push(list: string[], line: string, cap: number): void {
  list.push(line);
  if (list.length > cap) list.shift();
}

function safeStr(o: unknown): string {
  try {
    return typeof o === 'string' ? o : JSON.stringify(o);
  } catch {
    return String(o);
  }
}

function shortStack(s?: string): string {
  return s ? '\n' + String(s).split('\n').slice(0, 4).join('\n') : '';
}

/** Path + query only. An absolute URL would carry the origin into every line for
 *  no benefit, and third-party origins are not ours to log. */
function shortUrl(u: string): string {
  try {
    const x = new URL(u, location.href);
    return x.pathname + x.search;
  } catch {
    return String(u).slice(0, 120);
  }
}

export interface PageContext {
  url: string;
  title: string;
  referrer: string;
  userAgent: string;
  viewport: { w: number; h: number; dpr: number };
  consoleErrors: string[];
  networkFailures: string[];
  hasScreenshot: boolean;
}

/** Install the capture hooks. Idempotent, and safe to call with no DOM (it just
 *  does nothing). `ignoreOrigin` keeps the reporter's own traffic out of the
 *  failure list — a failed submit reporting itself is noise. */
export function installReportCapture(ignoreOrigin?: string): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('error', (e: ErrorEvent) => {
    const where = e.filename ? `\n  at ${e.filename}:${e.lineno}:${e.colno}` : '';
    push(consoleErrors, (e.message || 'Error') + where + shortStack(e.error?.stack), MAX_ERRORS);
  });

  window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
    const r = (e.reason ?? {}) as { message?: string; stack?: string };
    push(consoleErrors, `Unhandled rejection: ${r.message ?? String(e.reason)}${shortStack(r.stack)}`, MAX_ERRORS);
  });

  const nativeError = console.error.bind(console);
  console.error = (...args: unknown[]): void => {
    try {
      push(consoleErrors, args.map(safeStr).join(' '), MAX_ERRORS);
    } catch {
      /* never let capture break logging */
    }
    nativeError(...args);
  };

  if (typeof window.fetch === 'function') {
    const original = window.fetch;
    const nativeFetch = original.bind(window);
    const wrapped = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
      const ours = Boolean(ignoreOrigin) && url.startsWith(ignoreOrigin!);
      try {
        const res = await nativeFetch(input, init);
        if (res.status >= 400 && !ours) {
          push(networkFailures, `${method} ${shortUrl(url)} → ${res.status}`, MAX_FAILURES);
        }
        return res;
      } catch (err) {
        if (!ours) push(networkFailures, `${method} ${shortUrl(url)} → network error`, MAX_FAILURES);
        throw err;
      }
    };
    // Carry the statics across (`fetch.preconnect` in Bun/modern DOM). Copy from
    // the ORIGINAL, not from `nativeFetch`: bind() returns a fresh function that
    // has none of the original's own properties, so assigning from the bound copy
    // would silently move nothing and drop `preconnect` off the global.
    window.fetch = Object.assign(wrapped, original) as typeof fetch;
  }
}

/** Snapshot what has been captured so far, in the nimiq.bot context shape. */
export function pageContext(hasScreenshot = false): PageContext {
  return {
    url: typeof location !== 'undefined' ? location.href : '',
    title: typeof document !== 'undefined' ? document.title : '',
    referrer: typeof document !== 'undefined' ? document.referrer : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    viewport: typeof window !== 'undefined'
      ? { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 }
      : { w: 0, h: 0, dpr: 1 },
    consoleErrors: consoleErrors.slice(-12),
    networkFailures: networkFailures.slice(-10),
    hasScreenshot,
  };
}

/** Test seam. */
export function _resetCaptureForTests(): void {
  consoleErrors.length = 0;
  networkFailures.length = 0;
  installed = false;
}
