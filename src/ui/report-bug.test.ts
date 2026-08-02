// Report a bug: the pure halves. The sheet's DOM is verified by consumer apps'
// browser passes (this repo has no DOM harness, by convention) — what is pinned
// here is the validation contract and the wire format, because those are what a
// host's server parses and what a failed send has to survive.
import { afterEach, describe, expect, test } from 'bun:test';
import {
  validateFeedbackInput,
  submitFeedback,
  submitToBot,
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

describe('submitToBot (the nimiq.bot transport)', () => {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  function stubBot(draftRes: Record<string, unknown>, fileRes: Record<string, unknown>, okDraft = true, okFile = true): void {
    calls.length = 0;
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? '{}'));
      calls.push({ url: String(url), body });
      const isDraft = String(url).endsWith('/api/draft');
      return {
        ok: isDraft ? okDraft : okFile,
        status: (isDraft ? okDraft : okFile) ? 200 : 500,
        json: async () => (isDraft ? draftRes : fileRes),
      } as Response;
    }) as unknown as typeof fetch;
  }
  const draftOk = {
    reportId: 'r1',
    draft: { title: 'Timer freezes at 30 seconds', body: 'The egg timer sticks.', labels: ['bug', 'user-report'] },
  };
  const filedOk = { url: 'https://github.test/i/12', number: 12 };

  test('drafts then files, against the repo it was given', async () => {
    stubBot(draftOk, filedOk);
    const result = await submitToBot({ repo: 'nimiq.kids' }, valid);
    expect(result).toMatchObject({ ok: true, issueNumber: 12, issueUrl: 'https://github.test/i/12' });
    expect(calls.map((c) => c.url)).toEqual([
      'https://bot.nimiq.tech/api/draft',
      'https://bot.nimiq.tech/api/file',
    ]);
    expect(calls[0]!.body.repo).toBe('nimiq.kids');
    expect(calls[1]!.body.reportId).toBe('r1');
  });

  test('host labels ride along with the drafted ones, deduped', async () => {
    stubBot(draftOk, filedOk);
    await submitToBot({ repo: 'nimiq.kids', labels: ['surface:kid', 'bug'] }, valid);
    expect(calls[1]!.body.labels).toEqual(['bug', 'user-report', 'surface:kid']);
  });

  // In bot mode the browser talks to the service directly, so there is no server
  // of ours left to scrub on the way out. If this regresses, kid account ids go
  // into public GitHub issues.
  test('addresses are redacted from the text AND from captured context', async () => {
    stubBot(draftOk, filedOk);
    await submitToBot({ repo: 'nimiq.kids' }, {
      ...valid,
      description: 'it paid NQ07 0000 0000 0000 0000 0000 0000 0000 0000 twice',
      pageContext: {
        consoleErrors: ['balance failed for NQ070000000000000000000000000000000000'],
        url: 'https://nimiq.kids/kid/',
      },
    });
    const sent = JSON.stringify(calls[0]!.body);
    expect(sent).not.toContain('NQ07 0000');
    expect(sent).not.toContain('NQ0700000000');
    expect(sent).toContain('[address redacted]');
  });

  test('the draft title is scrubbed too, since the service echoes our text back', async () => {
    stubBot({ reportId: 'r1', draft: { title: 'Sent to NQ07 0000 0000 0000 0000 0000 0000 0000 0000', body: 'b' } }, filedOk);
    await submitToBot({ repo: 'nimiq.kids' }, valid);
    expect(String(calls[1]!.body.title)).toContain('[address redacted]');
  });

  test('a service error code becomes a sentence, not a code', async () => {
    stubBot({ error: 'rate_limited' }, {}, false);
    const result = await submitToBot({ repo: 'nimiq.kids' }, valid);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Too many reports just now. Give it a minute.');
  });

  // The widget treats this as success and so must we: the issue exists, and
  // telling someone it failed gets the same bug filed twice.
  test('a non-2xx file response that still carries a url counts as filed', async () => {
    stubBot(draftOk, { url: 'https://github.test/i/13', number: 13 }, true, false);
    const result = await submitToBot({ repo: 'nimiq.kids' }, valid);
    expect(result).toMatchObject({ ok: true, issueNumber: 13 });
  });

  test('a draft with nothing to file does not blindly POST /api/file', async () => {
    stubBot({ reportId: 'r1' }, filedOk);
    const result = await submitToBot({ repo: 'nimiq.kids' }, valid);
    expect(result.ok).toBe(false);
    expect(calls).toHaveLength(1);
  });

  test('a custom service origin is honoured, trailing slash and all', async () => {
    stubBot(draftOk, filedOk);
    await submitToBot({ repo: 'nimiq.kids', service: 'https://bot.test/' }, valid);
    expect(calls[0]!.url).toBe('https://bot.test/api/draft');
  });

  test('offline comes back as a result, never a throw', async () => {
    globalThis.fetch = (async () => { throw new Error('Failed to fetch'); }) as unknown as typeof fetch;
    expect(await submitToBot({ repo: 'nimiq.kids' }, valid)).toMatchObject({ ok: false, status: 0 });
  });
});

describe('submitToBot: a missing label must not swallow the report', () => {
  // Found live: the draft asks for `user-report`, the repo does not have that
  // label, GitHub 422s the whole create, and every report dies forever on a
  // config detail nobody can see from the app.
  test('retries without labels when the service reports github_failed', async () => {
    const calls: Array<Record<string, unknown>> = [];
    let fileAttempt = 0;
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? '{}'));
      calls.push({ url: String(url), ...body });
      if (String(url).endsWith('/api/draft')) {
        return { ok: true, status: 200, json: async () => ({
          reportId: 'r1', draft: { title: 't', body: 'b', labels: ['bug', 'user-report'] } }) } as Response;
      }
      fileAttempt += 1;
      return fileAttempt === 1
        ? { ok: false, status: 502, json: async () => ({ error: 'github_failed' }) } as Response
        : { ok: true, status: 200, json: async () => ({ url: 'https://github.test/i/5', number: 5 }) } as Response;
    }) as unknown as typeof fetch;

    const result = await submitToBot({ repo: 'nimiq.kids', labels: ['surface:kid'] }, valid);
    expect(result).toMatchObject({ ok: true, issueNumber: 5 });
    const fileCalls = calls.filter((c) => String(c.url).endsWith('/api/file'));
    expect(fileCalls).toHaveLength(2);
    expect(fileCalls[0]!.labels).toEqual(['bug', 'user-report', 'surface:kid']);
    expect(fileCalls[1]!.labels).toEqual([]);
  });

  test('does not retry when there were no labels to blame', async () => {
    let fileAttempt = 0;
    globalThis.fetch = (async (url: string) => {
      if (String(url).endsWith('/api/draft')) {
        return { ok: true, status: 200, json: async () => ({
          reportId: 'r1', draft: { title: 't', body: 'b', labels: [] } }) } as Response;
      }
      fileAttempt += 1;
      return { ok: false, status: 502, json: async () => ({ error: 'github_failed' }) } as Response;
    }) as unknown as typeof fetch;

    const result = await submitToBot({ repo: 'nimiq.kids' }, valid);
    expect(result.ok).toBe(false);
    expect(fileAttempt).toBe(1);
  });

  test('does not retry a rate limit, which labels cannot fix', async () => {
    let fileAttempt = 0;
    globalThis.fetch = (async (url: string) => {
      if (String(url).endsWith('/api/draft')) {
        return { ok: true, status: 200, json: async () => ({
          reportId: 'r1', draft: { title: 't', body: 'b', labels: ['bug'] } }) } as Response;
      }
      fileAttempt += 1;
      return { ok: false, status: 429, json: async () => ({ error: 'rate_limited' }) } as Response;
    }) as unknown as typeof fetch;

    const result = await submitToBot({ repo: 'nimiq.kids' }, valid);
    expect(result.error).toBe('Too many reports just now. Give it a minute.');
    expect(fileAttempt).toBe(1);
  });
});

describe('submitToBot: what the service drops has to ride in the text', () => {
  // Verified against a real filed issue: nimiq.bot renders URL/viewport/browser
  // from `context` and shows nothing else, so console errors, failed requests
  // and the host's own fields were arriving and then vanishing.
  const calls: Array<Record<string, unknown>> = [];
  function stub(): void {
    calls.length = 0;
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url: String(url), ...JSON.parse(String(init?.body ?? '{}')) });
      return String(url).endsWith('/api/draft')
        ? { ok: true, status: 200, json: async () => ({ reportId: 'r', draft: { title: 't', body: 'b', labels: [] } }) } as Response
        : { ok: true, status: 200, json: async () => ({ url: 'u', number: 1 }) } as Response;
    }) as unknown as typeof fetch;
  }

  test('surface, version, console errors and failed requests reach the text', async () => {
    stub();
    await submitToBot({ repo: 'nimiq.kids' }, {
      ...valid,
      context: { surface: 'kid', version: '0.99.0' },
      pageContext: {
        consoleErrors: ['TypeError: x is not a function'],
        networkFailures: ['GET /api/rates -> 502'],
      },
    });
    const text = String(calls[0]!.text);
    expect(text).toContain('surface: kid');
    expect(text).toContain('version: 0.99.0');
    expect(text).toContain('TypeError: x is not a function');
    expect(text).toContain('GET /api/rates -> 502');
    expect((calls[0]!.context as Record<string, unknown>).surface).toBe('kid');
  });

  test('nothing to report adds no trailing rule', async () => {
    stub();
    await submitToBot({ repo: 'nimiq.kids' }, valid);
    expect(String(calls[0]!.text).trim().endsWith('---')).toBe(false);
    expect(String(calls[0]!.text)).not.toContain('Console');
  });

  test('the appended block is scrubbed like everything else', async () => {
    stub();
    await submitToBot({ repo: 'nimiq.kids' }, {
      ...valid,
      pageContext: { consoleErrors: ['send failed to NQ07 0000 0000 0000 0000 0000 0000 0000 0000'] },
    });
    expect(String(calls[0]!.text)).toContain('[address redacted]');
    expect(String(calls[0]!.text)).not.toContain('NQ07 0000');
  });

  test('only the last few lines travel, so a noisy page cannot flood the issue', async () => {
    stub();
    const many = Array.from({ length: 20 }, (_, i) => `error ${i}`);
    await submitToBot({ repo: 'nimiq.kids' }, { ...valid, pageContext: { consoleErrors: many } });
    const text = String(calls[0]!.text);
    expect(text).toContain('error 19');
    expect(text).not.toContain('error 14');
  });
});
