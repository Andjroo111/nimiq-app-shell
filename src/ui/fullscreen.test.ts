import { beforeEach, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { createI18n } from '../i18n';
import { mergeLocales, shellLocales } from '../locales';
import {
  __resetPayFullscreenOffer,
  askPayFullscreen,
  enterPayFullscreen,
  getPayFullscreenHost,
  offerPayFullscreen,
  watchPayFullscreen,
  type FullscreenAnswer,
} from './fullscreen';

/** A host with the SDK 0.2.4 surface; `refuse` makes request reject. */
function host(o: { on?: boolean; refuse?: boolean } = {}) {
  let on = o.on ?? false;
  const listeners = new Set<(v: boolean) => void>();
  const calls: string[] = [];
  const api = {
    requestFullscreen: async () => {
      calls.push('request');
      if (o.refuse) throw new Error('denied by host');
      on = true;
      listeners.forEach((l) => l(true));
    },
    exitFullscreen: async () => {
      calls.push('exit');
      on = false;
      listeners.forEach((l) => l(false));
    },
    getFullscreen: async () => on,
    onFullscreenChange: (l: (v: boolean) => void) => (listeners.add(l), () => listeners.delete(l)),
  };
  return { win: { nimiqPay: api }, api, calls, set: (v: boolean) => { on = v; listeners.forEach((l) => l(v)); }, listeners };
}

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
};
const answer = (a: FullscreenAnswer) => async () => a;

beforeEach(() => __resetPayFullscreenOffer());

describe('feature detection', () => {
  test('needs all four host calls', () => {
    expect(getPayFullscreenHost(host().win)).not.toBeNull();
    const { requestFullscreen, ...noRequest } = host().api;
    expect(getPayFullscreenHost({ nimiqPay: noRequest })).toBeNull();
    const { exitFullscreen, ...noExit } = host().api;
    expect(getPayFullscreenHost({ nimiqPay: noExit })).toBeNull();
    expect(getPayFullscreenHost({ nimiqPay: { language: 'en' } })).toBeNull();
    expect(getPayFullscreenHost({})).toBeNull();
    expect(getPayFullscreenHost(undefined)).toBeNull();
  });

  test('enter fails quietly on an old host and on a refusal', async () => {
    expect(await enterPayFullscreen({})).toBe(false);
    expect(await enterPayFullscreen(host({ refuse: true }).win)).toBe(false);
    expect(await enterPayFullscreen(host().win)).toBe(true);
  });
});

describe('offerPayFullscreen', () => {
  test('unsupported host: never asks', async () => {
    let asked = 0;
    expect(await offerPayFullscreen({ win: {}, ask: async () => (asked++, 'yes'), storage: memory() })).toBe('unsupported');
    expect(asked).toBe(0);
  });

  test('asks first, enters only on yes', async () => {
    const h = host();
    expect(await offerPayFullscreen({ win: h.win, ask: answer('yes'), storage: memory() })).toBe('entered');
    expect(h.calls).toEqual(['request']);
  });

  test('"not now" sends nothing to the host', async () => {
    const h = host();
    expect(await offerPayFullscreen({ win: h.win, ask: answer('no'), storage: memory() })).toBe('declined');
    expect(h.calls).toEqual([]);
  });

  test('asked once per launch', async () => {
    const h = host();
    const s = memory();
    await offerPayFullscreen({ win: h.win, ask: answer('no'), storage: s });
    let asked = 0;
    expect(await offerPayFullscreen({ win: h.win, ask: async () => (asked++, 'yes'), storage: s })).toBe('asked');
    expect(asked).toBe(0);
  });

  test('"never" is remembered across launches', async () => {
    const s = memory();
    expect(await offerPayFullscreen({ win: host().win, ask: answer('never'), storage: s })).toBe('muted');
    __resetPayFullscreenOffer(); // a new launch
    let asked = 0;
    expect(await offerPayFullscreen({ win: host().win, ask: async () => (asked++, 'yes'), storage: s })).toBe('muted');
    expect(asked).toBe(0);
  });

  test('already fullscreen: no prompt', async () => {
    let asked = 0;
    expect(await offerPayFullscreen({ win: host({ on: true }).win, ask: async () => (asked++, 'yes'), storage: memory() })).toBe('already');
    expect(asked).toBe(0);
  });

  test('host refuses after a yes: failed, not thrown', async () => {
    expect(await offerPayFullscreen({ win: host({ refuse: true }).win, ask: answer('yes'), storage: memory() })).toBe('failed');
  });

  test('a throwing ask or broken storage is a quiet decline', async () => {
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(await offerPayFullscreen({ win: host().win, ask: async () => { throw new Error('x'); }, storage: broken })).toBe('declined');
  });
});

describe('watchPayFullscreen', () => {
  test('mirrors host state onto <html> and re-reads on return to visible', async () => {
    const w = new Window();
    const doc = w.document as unknown as Document;
    const h = host();
    const seen: boolean[] = [];
    const stop = watchPayFullscreen((v) => seen.push(v), { win: h.win, doc });
    await Promise.resolve();
    await Promise.resolve();
    expect(doc.documentElement.hasAttribute('data-pay-fullscreen')).toBe(false);
    h.set(true);
    expect(doc.documentElement.hasAttribute('data-pay-fullscreen')).toBe(true);
    // The host left fullscreen while backgrounded without an event.
    h.listeners.clear();
    await h.api.exitFullscreen();
    doc.dispatchEvent(new w.Event('visibilitychange') as unknown as Event);
    await new Promise((r) => setTimeout(r, 0));
    expect(doc.documentElement.hasAttribute('data-pay-fullscreen')).toBe(false);
    expect(seen).toEqual([false, true, false]);
    stop();
  });

  test('unsupported host: a no-op unsubscribe', () => {
    expect(() => watchPayFullscreen(undefined, { win: {} })()).not.toThrow();
  });
});

describe('askPayFullscreen sheet', () => {
  const setup = () => {
    const w = new Window();
    const doc = w.document as unknown as Document;
    const i18n = createI18n({ locales: mergeLocales(shellLocales), fallback: 'en', initial: 'en' });
    return { doc, i18n };
  };

  for (const a of ['yes', 'no', 'never'] as const) {
    test(`button "${a}" resolves "${a}" and removes the sheet`, async () => {
      const { doc, i18n } = setup();
      const p = askPayFullscreen(doc, i18n);
      expect(doc.querySelector('[role="dialog"]')?.textContent).toContain('Open in full screen?');
      (doc.querySelector(`[data-answer="${a}"]`) as HTMLElement).click();
      expect(await p).toBe(a);
      expect(doc.getElementById('nq-fs-scrim')).toBeNull();
    });
  }
});
