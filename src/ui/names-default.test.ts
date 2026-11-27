// The name lookup is OPT-IN (v0.34.1). The registry is a third party, and the
// recipient field of a payment sheet does not send what is typed into it to a
// third party unless the host asked. Sixteen sites mount the shell without a
// `names` option, so "nothing passed" is the case that has to stay quiet.
//
// Every test here mounts WITHOUT the key unless it says otherwise, and counts
// requests on the real global fetch, because a default-on resolver would use
// exactly that.
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { mountMiniWallet, resolveNamesOption, type CornerControlOptions } from './corner-control';
import { shellLocales, mergeLocales } from '../locales';
import { createI18n } from '../i18n';
import { NAME_INVALID_DELAY_MS, NAME_LOOKUP_DEBOUNCE_MS } from './name-lookup';
import type { Wallet } from '../wallet';
import a from '../names/fixtures/gaston.api.nimiqnames.com.json';
import b from '../names/fixtures/gaston.nns.sonartech.pro.json';

const GASTON_SPACED = 'NQ12 ACQM 28QL U8T2 L9J1 GVN4 NJPL 1P3G ENVG';

/** Answers `gaston` the way the two shipped resolvers do, and records every URL. */
function recordingFetch(requests: string[]): typeof fetch {
  return ((input: unknown) => {
    const url = String(input);
    requests.push(url);
    const u = new URL(url);
    const body = u.host === 'api.nimiqnames.com' ? a : b;
    return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
  }) as typeof fetch;
}

/** `opts` is passed through untouched: no `names` key unless the test adds one. */
function mount(opts: Partial<CornerControlOptions> = {}) {
  const w = new Window();
  for (const key of ['document', 'HTMLElement', 'navigator', 'localStorage', 'getComputedStyle', 'Event']) {
    (globalThis as unknown as Record<string, unknown>)[key] = (w as unknown as Record<string, unknown>)[key];
  }
  const i18n = createI18n({ locales: mergeLocales(shellLocales), fallback: 'en' });
  const wallet = {
    mode: 'hub',
    account: { address: 'NQ34 248H 8MB8 8QK2 5RVK EM8Q QJ8N 2Q5R 3XRK', label: 'Test' },
    connect: async () => null,
    pay: async () => ({ txHash: 'x' }),
    onAccountChange: () => () => {},
    disconnect: () => {},
  } as unknown as Wallet;
  const host = w.document.createElement('div') as unknown as HTMLElement;
  mountMiniWallet(host, { wallet, i18n, balance: false, reportBug: false, ...opts } as never);
  (host.querySelector('.nq-cc-face') as HTMLElement).click();
  (host.querySelector('.nq-cc-send') as HTMLElement).click();
  const field = host.querySelector('.nq-cc-addr-input') as HTMLTextAreaElement;
  const type = async (text: string, waitMs = NAME_LOOKUP_DEBOUNCE_MS + NAME_INVALID_DELAY_MS + 200) => {
    field.value = text;
    field.dispatchEvent(new w.Event('input') as unknown as Event);
    await new Promise((r) => setTimeout(r, waitMs));
  };
  const label = () => (host.querySelector('.nq-cc-view-sendto .nq-cc-field-head label') as HTMLElement).textContent;
  const wrap = host.querySelector('.nq-cc-addr-field') as HTMLElement;
  const row = () => host.querySelector('.nq-cc-name-row') as HTMLElement | null;
  return { host, field, type, label, wrap, row };
}

describe('the name lookup is off unless the host asks for it', () => {
  let requests: string[];
  let realFetch: typeof fetch;
  beforeEach(() => {
    requests = [];
    realFetch = globalThis.fetch;
    globalThis.fetch = recordingFetch(requests);
  });
  afterEach(() => { globalThis.fetch = realFetch; });

  test('no names option: the label asks for an address only', () => {
    const { label } = mount();
    expect(label()).toBe('Enter address');
  });

  test('no names option: a typed name is not a name, draws no row and makes no request', async () => {
    const { field, type, row, wrap } = mount();
    await type('gaston');
    // Reformatted into address blocks, which is what the field did before names existed.
    expect(field.value).toBe('GAST ON');
    expect(wrap.classList.contains('nq-cc-addr-is-name')).toBe(false);
    expect(row()).toBeNull();
    expect(requests).toEqual([]);
  });

  test('no names option: a .nim name makes no request either', async () => {
    const { type, row, wrap } = mount();
    await type('alice.nim');
    expect(wrap.classList.contains('nq-cc-addr-is-name')).toBe(false);
    expect(row()).toBeNull();
    expect(requests).toEqual([]);
  });

  test('names: undefined is the same as leaving it out', async () => {
    const { label, type, row } = mount({ names: undefined });
    expect(label()).toBe('Enter address');
    await type('gaston');
    expect(row()).toBeNull();
    expect(requests).toEqual([]);
  });

  test('no names option: no resolver is created', () => {
    // createNameResolver spreads its options at construction, so the only way
    // to see "none was built" from outside is that an absent option resolves to
    // null, and null is what skips the constructor.
    expect(resolveNamesOption(undefined)).toBeNull();
    expect(resolveNamesOption(false)).toBeNull();
    for (const junk of [null, 0, '', 'on', 1]) {
      expect(resolveNamesOption(junk as never)).toBeNull();
    }
  });

  test('names: false is still off', async () => {
    const { label, field, type, row } = mount({ names: false });
    expect(label()).toBe('Enter address');
    await type('gaston');
    expect(field.value).toBe('GAST ON');
    expect(row()).toBeNull();
    expect(requests).toEqual([]);
  });

  test('names: true turns it on with the shipped resolvers', async () => {
    const { label, field, type, row, wrap } = mount({ names: true });
    expect(label()).toBe('Enter address or name');
    await type('gaston');
    expect(field.value).toBe('gaston');
    expect(wrap.classList.contains('nq-cc-addr-is-name')).toBe(true);
    expect(new Set(requests.map((u) => new URL(u).host))).toEqual(new Set(['api.nimiqnames.com', 'nns.sonartech.pro']));
    const hit = row()!.querySelector('.nq-cc-name-hit') as HTMLElement;
    expect(hit.querySelector('.nq-cc-name-label')!.textContent).toBe('gaston');
    expect(hit.title).toBe(GASTON_SPACED);
  });

  test('names: {} turns it on, as an options object always did', async () => {
    const { label, type, row } = mount({ names: {} });
    expect(label()).toBe('Enter address or name');
    await type('gaston');
    expect(requests.length).toBeGreaterThan(0);
    expect((row()!.querySelector('.nq-cc-name-hit') as HTMLElement).title).toBe(GASTON_SPACED);
  });

  test('an injected fetch is the one that is used, and only after opting in', async () => {
    const own: string[] = [];
    const { type, row } = mount({ names: { fetch: recordingFetch(own) } });
    await type('gaston');
    expect(own.length).toBeGreaterThan(0);
    expect(requests).toEqual([]);
    expect(row()!.querySelector('.nq-cc-name-hit')).not.toBeNull();
  });

  test('the two ways of opting in resolve to resolver options', () => {
    expect(resolveNamesOption(true)).toEqual({});
    const given = { timeoutMs: 1234 };
    expect(resolveNamesOption(given)).toBe(given);
  });
});
