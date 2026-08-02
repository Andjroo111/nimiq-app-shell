// Report a bug: the pure halves. The sheet's DOM is verified by consumer apps'
// browser passes (this repo has no DOM harness, by convention) — what is pinned
// here is the validation contract and the wire format, because those are what a
// host's server parses and what a failed send has to survive.
import { afterEach, describe, expect, test } from 'bun:test';
import {
  validateFeedbackInput,
  submitFeedback,
  type FeedbackInput,
} from './report-bug';
import { shellLocales } from '../locales';

const valid: FeedbackInput = {
  type: 'bug',
  title: 'Timer freezes',
  description: 'The egg timer stops at 30 seconds and never finishes.',
};

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

function stubFetch(res: Partial<Response> & { json?: () => Promise<unknown> }): typeof fetch {
  const calls: Array<{ url: string; body: unknown }> = [];
  const fn = (async (url: string, init?: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init?.body ?? '{}')) });
    return { ok: true, status: 200, json: async () => ({}), ...res } as Response;
  }) as unknown as typeof fetch;
  (fn as unknown as { calls: typeof calls }).calls = calls;
  return fn;
}
const callsOf = (fn: typeof fetch): Array<{ url: string; body: Record<string, string> }> =>
  (fn as unknown as { calls: Array<{ url: string; body: Record<string, string> }> }).calls;

describe('validateFeedbackInput', () => {
  test('a complete report passes', () => {
    expect(validateFeedbackInput(valid)).toBeNull();
  });

  test('type must come from the fixed set', () => {
    expect(validateFeedbackInput({ ...valid, type: '' })).toBe('shell.fbErrType');
    expect(validateFeedbackInput({ ...valid, type: 'crash' as never })).toBe('shell.fbErrType');
  });

  test('a summary under 5 characters, or all whitespace, is rejected', () => {
    expect(validateFeedbackInput({ ...valid, title: 'help' })).toBe('shell.fbErrTitle');
    expect(validateFeedbackInput({ ...valid, title: '        ' })).toBe('shell.fbErrTitle');
  });

  test('a description under 10 characters is rejected', () => {
    expect(validateFeedbackInput({ ...valid, description: 'broken' })).toBe('shell.fbErrDetails');
  });

  // The validator returns i18n KEYS, not English: the sheet renders in whatever
  // language the visitor picked, and an untranslated error would be the one
  // English string in an otherwise translated dialog.
  test('every message it can return exists in every shipped locale', () => {
    const keys = ['shell.fbErrType', 'shell.fbErrTitle', 'shell.fbErrDetails'];
    for (const [locale, messages] of Object.entries(shellLocales)) {
      for (const key of keys) {
        expect((messages as Record<string, string>)[key], `${locale}:${key}`).toBeDefined();
      }
    }
  });
});

describe('submitFeedback', () => {
  test('POSTs trimmed fields to the host endpoint', async () => {
    const fetchStub = stubFetch({});
    globalThis.fetch = fetchStub;
    await submitFeedback('/api/feedback', {
      ...valid,
      title: '  Timer freezes  ',
      description: '  The egg timer stops at 30 seconds.  ',
    });
    const [call] = callsOf(fetchStub);
    expect(call!.url).toBe('/api/feedback');
    expect(call!.body.title).toBe('Timer freezes');
    expect(call!.body.description).toBe('The egg timer stops at 30 seconds.');
    expect(call!.body.type).toBe('bug');
  });

  test('host context rides along, and cannot overwrite the report itself', async () => {
    const fetchStub = stubFetch({});
    globalThis.fetch = fetchStub;
    await submitFeedback('/api/feedback', {
      ...valid,
      context: { surface: 'kid', version: '0.97.0', type: 'spoofed' },
    });
    const [call] = callsOf(fetchStub);
    expect(call!.body.surface).toBe('kid');
    expect(call!.body.version).toBe('0.97.0');
    expect(call!.body.type).toBe('bug');
  });

  test('diagnostic is omitted when the visitor unticks the box', async () => {
    const fetchStub = stubFetch({});
    globalThis.fetch = fetchStub;
    await submitFeedback('/api/feedback', valid);
    expect('diagnostic' in callsOf(fetchStub)[0]!.body).toBe(false);
  });

  test('2xx carries the issue number back', async () => {
    globalThis.fetch = stubFetch({ json: async () => ({ ok: true, issueNumber: 42 }) });
    const result = await submitFeedback('/api/feedback', valid);
    expect(result).toMatchObject({ ok: true, status: 200, issueNumber: 42 });
  });

  // The server-not-wired-yet path. It must surface the mailto so the sheet can
  // offer email rather than swallowing what the person just typed.
  test('503 surfaces the server error and its mailto fallback', async () => {
    globalThis.fetch = stubFetch({
      ok: false,
      status: 503,
      json: async () => ({ error: 'feedback channel not configured', fallbackMailto: 'mailto:a@b.c' }),
    });
    const result = await submitFeedback('/api/feedback', valid);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('feedback channel not configured');
    expect(result.fallbackMailto).toBe('mailto:a@b.c');
  });

  test('a non-JSON error body still produces a usable message', async () => {
    globalThis.fetch = stubFetch({
      ok: false,
      status: 502,
      json: async () => { throw new Error('not json'); },
    });
    const result = await submitFeedback('/api/feedback', valid);
    expect(result).toMatchObject({ ok: false, status: 502 });
    expect(result.error).toContain('502');
  });

  // Offline is the common case on a tablet. It has to come back as a RESULT,
  // never a thrown exception: the sheet awaits this call and would otherwise
  // stay stuck on "Sending" with the send button disabled.
  test('a thrown fetch comes back as a result, not an exception', async () => {
    globalThis.fetch = (async () => { throw new Error('Failed to fetch'); }) as unknown as typeof fetch;
    const result = await submitFeedback('/api/feedback', valid);
    expect(result).toMatchObject({ ok: false, status: 0, error: 'Failed to fetch' });
  });
});
