// What the capture puts in a bug report — specifically, what it leaves OUT.
//
// `pageContext()` is the structured half of a bot-mode report: it goes browser →
// bot.nimiq.tech → an LLM-written issue on a repo that may well be public, with
// no server of the app's own in between. So the URL it snapshots is the one
// field here that can carry an identifier the app never chose to send, and these
// tests pin that it does not.
//
// The globals are stubbed rather than mocked through a DOM: `pageContext` reads
// `location` / `document` behind typeof guards precisely so it works in a
// non-DOM runtime, and this repo has no DOM harness by convention.
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { _resetCaptureForTests, installReportCapture, pageContext } from './report-capture';

type Loose = Record<string, unknown>;
const g = globalThis as unknown as Loose;
const hadLocation = 'location' in g, realLocation = g.location;
const hadDocument = 'document' in g, realDocument = g.document;

function page(href: string, referrer = ''): void {
  g.location = { href };
  g.document = { title: 'Nimiq Kids', referrer };
}

afterEach(() => {
  if (hadLocation) g.location = realLocation; else delete g.location;
  if (hadDocument) g.document = realDocument; else delete g.document;
});

describe('pageContext: the URL never carries the query or the fragment', () => {
  // The leak this closes: nimiq.kids addresses nearly every call by child UUID
  // and had to switch diagnostics off wholesale because of it. A query string is
  // the same leak one level up, and unlike a UUID it has no shape to match on.
  test('a query string is dropped', () => {
    page('https://nimiq.kids/kid/?child=8f3c1d2e-4b5a-6c7d-8e9f-0a1b2c3d4e5f&debug=1');
    expect(pageContext().url).toBe('https://nimiq.kids/kid/');
  });

  test('a fragment is dropped too — hash routes carry the same ids', () => {
    page('https://nimiq.kids/parent/#/child/8f3c1d2e-4b5a-6c7d-8e9f-0a1b2c3d4e5f/jobs');
    expect(pageContext().url).toBe('https://nimiq.kids/parent/');
  });

  test('a fragment that comes before any ? is still the cut point', () => {
    page('https://nimiq.kids/app#/kid?token=s3cret');
    expect(pageContext().url).toBe('https://nimiq.kids/app');
  });

  // The other half of the trade: which page it was is the whole diagnostic value
  // of this field, so a plain URL has to survive untouched.
  test('a URL with neither is left exactly as it is', () => {
    page('https://nimiq.kids/kid/treasure');
    expect(pageContext().url).toBe('https://nimiq.kids/kid/treasure');
  });

  test('the referrer is trimmed the same way', () => {
    page('https://nimiq.kids/kid/', 'https://nimiq.life/apps?invite=8f3c1d2e-4b5a-6c7d-8e9f-0a1b2c3d4e5f');
    expect(pageContext().referrer).toBe('https://nimiq.life/apps');
  });

  test('an empty referrer stays empty rather than becoming a stray string', () => {
    page('https://nimiq.kids/kid/');
    expect(pageContext().referrer).toBe('');
  });

  test('no DOM at all: the fields are empty, not a crash', () => {
    delete g.location;
    delete g.document;
    expect(pageContext()).toMatchObject({ url: '', referrer: '', title: '' });
  });
});

// The hooks: everything below is what `installReportCapture` rings and ships.
// It patches window listeners, console.error and fetch, and bun test shares one
// global object across files, so each of those is put back after every test.
describe('installReportCapture: what it records, and what it leaves out', () => {
  type Fetch = typeof fetch;
  const realConsoleError = console.error;
  const hadWindow = 'window' in g, realWindow = g.window;
  let win: Loose;
  let listeners: Record<string, Array<(e: unknown) => void>>;

  /** A window with listeners and a scripted fetch: a status per path, or a throw.
   *  Listeners are kept by hand rather than on an EventTarget, because another
   *  test file swaps the global `Event` and a native dispatch then refuses it. */
  function fakeWindow(responses: Record<string, number | 'throw'>): Loose {
    listeners = {};
    const target: Loose = {
      addEventListener: (type: string, fn: (e: unknown) => void) => void (listeners[type] ??= []).push(fn),
    };
    const fetchImpl = (async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const r = responses[new URL(url, 'https://nimiq.kids/').pathname] ?? 200;
      if (r === 'throw') throw new TypeError('Failed to fetch');
      return new Response(null, { status: r });
    }) as Fetch;
    (fetchImpl as unknown as Loose).preconnect = () => {};
    return Object.assign(target, { fetch: fetchImpl, innerWidth: 390, innerHeight: 844, devicePixelRatio: 3 });
  }
  const fire = (type: string, props: Loose) => listeners[type]?.forEach((fn) => fn(props));
  const wfetch = (input: string | Request, init?: RequestInit) => (win.fetch as Fetch)(input, init);

  beforeEach(() => {
    _resetCaptureForTests();
    console.error = () => {};
    win = fakeWindow({ '/api/rates': 502, '/api/session': 401, '/down': 'throw', '/report': 500 });
    g.window = win;
    page('https://nimiq.kids/kid/');
  });

  afterEach(() => {
    _resetCaptureForTests();
    console.error = realConsoleError;
    if (hadWindow) g.window = realWindow; else delete g.window;
  });

  test('no window: nothing is patched', () => {
    delete g.window;
    const before = console.error;
    expect(() => installReportCapture()).not.toThrow();
    expect(console.error).toBe(before);
  });

  // A failed login is `GET /api/session?token=… → 401`, so the query has to go
  // here for the same reason it goes from `url`.
  test('failed requests are logged by path: no origin, no query', async () => {
    installReportCapture();
    await wfetch('https://nimiq.kids/api/rates?pair=NIM-USD');
    await wfetch('/api/session?token=s3cret', { method: 'POST' });
    await expect(wfetch('/down?child=8f3c1d2e')).rejects.toThrow('Failed to fetch');
    await wfetch('/ok');
    expect(pageContext().networkFailures).toEqual([
      'GET /api/rates → 502',
      'POST /api/session → 401',
      'GET /down → network error',
    ]);
  });

  test('a Request input reports its own method', async () => {
    installReportCapture();
    await wfetch(new Request('https://nimiq.kids/api/rates', { method: 'PUT' }));
    expect(pageContext().networkFailures).toEqual(['PUT /api/rates → 502']);
  });

  test('the reporter origin is skipped, so a failed submit does not report itself', async () => {
    installReportCapture('https://bot.nimiq.tech');
    await wfetch('https://bot.nimiq.tech/report');
    await wfetch('https://nimiq.kids/report');
    expect(pageContext().networkFailures).toEqual(['GET /report → 500']);
  });

  test('statics on fetch survive the wrap', () => {
    installReportCapture();
    expect(typeof (win.fetch as unknown as Loose).preconnect).toBe('function');
  });

  test('a window error keeps its location, minus the query, and four stack lines', () => {
    installReportCapture();
    fire('error', {
      message: 'TypeError: x is undefined',
      filename: 'https://nimiq.kids/app.js?child=8f3c1d2e',
      lineno: 10,
      colno: 4,
      error: { stack: 'TypeError\n  at a\n  at b\n  at c\n  at d\n  at e' },
    });
    const [line] = pageContext().consoleErrors;
    expect(line).toStartWith('TypeError: x is undefined\n  at https://nimiq.kids/app.js:10:4\n');
    expect(line).not.toContain('child');
    expect(line!.split('\n')).toHaveLength(6);
  });

  test('unhandled rejections, Error and bare reasons alike', () => {
    installReportCapture();
    fire('unhandledrejection', { reason: new Error('boom') });
    fire('unhandledrejection', { reason: 'plain string' });
    const errs = pageContext().consoleErrors;
    expect(errs[0]).toStartWith('Unhandled rejection: boom\n');
    expect(errs[1]).toBe('Unhandled rejection: plain string');
  });

  test('console.error is recorded, still logs, and survives an unserialisable arg', () => {
    const seen: unknown[][] = [];
    console.error = (...a: unknown[]) => void seen.push(a);
    installReportCapture();
    const circular: Loose = {};
    circular.self = circular;
    console.error('failed', { code: 7 }, circular);
    expect(seen).toHaveLength(1);
    expect(pageContext().consoleErrors).toEqual(['failed {"code":7} [object Object]']);
  });

  test('a second install does not double-record', () => {
    installReportCapture();
    installReportCapture();
    console.error('once');
    expect(pageContext().consoleErrors).toEqual(['once']);
  });

  test('bounded: the last 12 errors and the last 10 failures ship', async () => {
    installReportCapture();
    for (let i = 0; i < 30; i++) console.error(`e${i}`);
    for (let i = 0; i < 15; i++) await wfetch('/api/rates');
    const ctx = pageContext();
    expect(ctx.consoleErrors).toHaveLength(12);
    expect(ctx.consoleErrors.at(-1)).toBe('e29');
    expect(ctx.networkFailures).toHaveLength(10);
    expect(ctx.viewport).toEqual({ w: 390, h: 844, dpr: 3 });
  });
});
