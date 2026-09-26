// The name row, driven through the real mini wallet: type into the recipient
// field, let the debounce fire, check what the sheet offers. The resolvers are
// faked per host with the two recorded mainnet answers from ../names, so the
// proof check still runs for real.
import { describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { mountMiniWallet, type CornerControlOptions } from './corner-control';
import { shellLocales, mergeLocales } from '../locales';
import { createI18n } from '../i18n';
import { NAME_LOOKUP_DEBOUNCE_MS } from './name-lookup';
import type { Wallet } from '../wallet';
import a from '../names/fixtures/gaston.api.nimiqnames.com.json';
import b from '../names/fixtures/gaston.nns.sonartech.pro.json';

const GASTON_SPACED = 'NQ12 ACQM 28QL U8T2 L9J1 GVN4 NJPL 1P3G ENVG';

type Answers = Record<string, unknown>;
function fakeFetch(byName: Record<string, [Answers, Answers] | 'down'>, calls: string[]): typeof fetch {
  return ((url: string) => {
    const u = new URL(url);
    calls.push(u.pathname);
    const name = decodeURIComponent(u.pathname.split('/').pop()!);
    const entry = byName[name];
    if (entry === 'down') return Promise.resolve(new Response('{"error":"INTERNAL"}', { status: 500 }));
    if (!entry) {
      return Promise.resolve(new Response(JSON.stringify({ error: 'NOT_FOUND', name, height: 1 }), { status: 404 }));
    }
    const body = u.host === 'api.nimiqnames.com' ? entry[0] : entry[1];
    // A found name answers SLOWLY, so a later miss can overtake it.
    return new Promise((r) => setTimeout(() => r(new Response(JSON.stringify(body), { status: 200 })), 500));
  }) as typeof fetch;
}

function mount(opts: Partial<CornerControlOptions> = {}) {
  const w = new Window();
  for (const key of ['document', 'HTMLElement', 'navigator', 'localStorage', 'getComputedStyle', 'Event']) {
    (globalThis as unknown as Record<string, unknown>)[key] = (w as unknown as Record<string, unknown>)[key];
  }
  const i18n = createI18n({ locales: mergeLocales(shellLocales), fallback: 'en' });
  const paid: unknown[] = [];
  const wallet = {
    mode: 'hub',
    account: { address: 'NQ34 248H 8MB8 8QK2 5RVK EM8Q QJ8N 2Q5R 3XRK', label: 'Test' },
    connect: async () => null,
    pay: async (args: unknown) => { paid.push(args); return { txHash: 'x' }; },
    onAccountChange: () => () => {},
    disconnect: () => {},
  } as unknown as Wallet;
  const identicon = (address: string) => {
    const d = w.document.createElement('div');
    d.dataset.for = address;
    return d as unknown as HTMLElement;
  };
  const calls: string[] = [];
  const host = w.document.createElement('div') as unknown as HTMLElement;
  mountMiniWallet(host, {
    wallet, i18n, balance: false, identicon,
    names: { fetch: fakeFetch({ gaston: [a, b], broken: 'down' }, calls) },
    ...opts,
  } as never);
  (host.querySelector('.nq-cc-face') as HTMLElement).click();
  (host.querySelector('.nq-cc-send') as HTMLElement).click();
  const field = host.querySelector('.nq-cc-addr-input') as HTMLTextAreaElement;
  const type = async (text: string, waitMs = NAME_LOOKUP_DEBOUNCE_MS + 650) => {
    field.value = text;
    field.dispatchEvent(new w.Event('input') as unknown as Event);
    await new Promise((r) => setTimeout(r, waitMs));
  };
  const row = () => host.querySelector('.nq-cc-name-row') as HTMLElement | null;
  return { host, field, type, row, calls, paid };
}

describe('names in the recipient field', () => {
  test('a registered name offers its proven address, and does not advance on its own', async () => {
    const { host, field, type, row } = mount();
    await type('gaston');
    expect(field.value).toBe('gaston');
    const hit = row()!.querySelector('.nq-cc-name-hit') as HTMLElement;
    expect(hit.querySelector('.nq-cc-name-label')!.textContent).toBe('gaston');
    expect(hit.title).toBe(GASTON_SPACED);
    expect(host.querySelector('.nq-cc')!.classList.contains('nq-cc-show-send')).toBe(false);
  });

  test('tapping the row fills the address and names the recipient on the amount sheet', async () => {
    const { host, field, type, row } = mount();
    await type('gaston');
    (row()!.querySelector('.nq-cc-name-hit') as HTMLElement).click();
    expect(field.value.replace(/\s+/g, ' ')).toBe(GASTON_SPACED);
    expect(host.querySelector('.nq-cc')!.classList.contains('nq-cc-show-send')).toBe(true);
    const parties = host.querySelectorAll('.nq-cc-party-name');
    const party = parties[parties.length - 1] as HTMLElement;
    expect(party.textContent).toBe('gaston');
    expect(party.title).toBe(GASTON_SPACED);
  });

  test('an unregistered name says so and offers nothing to tap', async () => {
    const { type, row } = mount();
    await type('nobodyhere');
    expect(row()!.querySelector('.nq-cc-name-hit')).toBeNull();
    expect(row()!.textContent).toBe('No one holds the name nobodyhere');
  });

  test('a resolver that is down is a failure, never an address', async () => {
    const { type, row } = mount();
    await type('broken');
    expect(row()!.querySelector('.nq-cc-name-hit')).toBeNull();
    expect(row()!.textContent).toBe('Could not check broken right now');
  });

  test('an address still formats into blocks and never hits a resolver', async () => {
    const { field, type, calls } = mount();
    await type('nq12acqm28ql');
    expect(field.value).toBe('NQ12 ACQM 28QL');
    expect(calls).toEqual([]);
  });

  test('an answer for text no longer in the field is dropped', async () => {
    const { type, row } = mount();
    // gaston's lookup is in flight (debounce passed, slow answer pending)...
    await type('gaston', NAME_LOOKUP_DEBOUNCE_MS + 20);
    // ...when the field changes, and the new miss lands first.
    await type('gastonx');
    expect(row()!.querySelector('.nq-cc-name-hit')).toBeNull();
    expect(row()!.textContent).toBe('No one holds the name gastonx');
  });

  test('a name typed one key at a time stays a name, through the short prefixes NNS rejects', async () => {
    const { field, type } = mount();
    const word = 'nobodyhere';
    for (let i = 1; i < word.length; i += 1) await type(field.value + word[i - 1], 0);
    await type(field.value + word[word.length - 1]);
    expect(field.value).toBe('nobodyhere');
  });

  test('names: false is the old field exactly', async () => {
    const { field, type, row, calls } = mount({ names: false });
    await type('gaston');
    expect(row()).toBeNull();
    expect(field.value).toBe('GAST ON');
    expect(calls).toEqual([]);
  });
});
