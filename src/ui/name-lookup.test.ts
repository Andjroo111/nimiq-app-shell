// The name row, driven through the real mini wallet: type into the recipient
// field, let the debounce fire, check what the sheet offers. The resolvers are
// faked per host with the two recorded mainnet answers from ../names, so the
// proof check still runs for real.
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Window } from 'happy-dom';
import { mountMiniWallet, type CornerControlOptions } from './corner-control';
import { shellLocales, mergeLocales } from '../locales';
import { createI18n } from '../i18n';
import { NAME_LOOKUP_DEBOUNCE_MS } from './name-lookup';
import type { Wallet } from '../wallet';
import a from '../names/fixtures/gaston.api.nimiqnames.com.json';
import b from '../names/fixtures/gaston.nns.sonartech.pro.json';
import nimProofs from '../names/fixtures/nim-proofs.json';

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
  const reopen = () => {
    (host.querySelector('.nq-cc-view-sendto .nq-cc-back') as HTMLElement).click();
    (host.querySelector('.nq-cc-send') as HTMLElement).click();
  };
  return { host, field, type, row, calls, paid, reopen };
}

const settled = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

  describe('a delegated answer', () => {
    const FORGED_HOST = 'evil.example';
    const PICKED = 'NQ48 8CKH BA24 2VR3 N249 N8MN J5XX 74DB 5XJ8';
    const delegated = (((url: string) => {
      const u = new URL(url);
      const body = u.host === FORGED_HOST ? { address: PICKED, ttl: 60 }
        : { ...(u.host === 'api.nimiqnames.com' ? a : b), host: FORGED_HOST };
      return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
    }) as typeof fetch);

    test('a forged host on both answers draws a row that says the address is not verified', async () => {
      const { type, row } = mount({ names: { fetch: delegated } });
      await type('shop.gaston');
      const hit = row()!.querySelector('.nq-cc-name-hit') as HTMLElement;
      expect(hit.title).toBe(PICKED);
      expect(hit.classList.contains('nq-cc-name-hit-unverified')).toBe(true);
      expect(hit.querySelector('.nq-cc-name-unverified')!.textContent).toBe('Address not verified');
      expect(hit.getAttribute('aria-label')).toBe('Pay shop.gaston. Address not verified');
    });

    test('a proven name on the same fetch draws no such line', async () => {
      const { type, row } = mount({ names: { fetch: delegated } });
      await type('gaston');
      const hit = row()!.querySelector('.nq-cc-name-hit') as HTMLElement;
      expect(hit.title).toBe(GASTON_SPACED);
      expect(hit.classList.contains('nq-cc-name-hit-unverified')).toBe(false);
      expect(hit.querySelector('.nq-cc-name-unverified')).toBeNull();
      expect(hit.getAttribute('aria-label')).toBe('Pay gaston');
    });

    test('tapping it fills the address and the amount sheet does not name the recipient', async () => {
      const { host, field, type, row } = mount({ names: { fetch: delegated } });
      await type('shop.gaston');
      (row()!.querySelector('.nq-cc-name-hit') as HTMLElement).click();
      expect(field.value.replace(/\s+/g, ' ')).toBe(PICKED);
      expect(host.querySelector('.nq-cc')!.classList.contains('nq-cc-show-send')).toBe(true);
      const parties = host.querySelectorAll('.nq-cc-party-name');
      const party = parties[parties.length - 1] as HTMLElement;
      expect(party.textContent).toBe('NQ48 8CKH BA24');
      expect(party.classList.contains('nq-cc-is-name')).toBe(false);
    });
  });

  describe('a write to the field from code', () => {
    const BOB = 'NQ48 8CKH BA24 2VR3 N249 N8MN J5XX 74DB 5XJ8';
    const withBob = { contacts: { list: async () => [{ label: 'Bob', address: BOB }] } };
    const chip = async (host: HTMLElement) => {
      await settled(40);
      return host.querySelector('.nq-cc-contact') as HTMLElement;
    };

    test('a chip tapped while the answer is in flight drops that answer', async () => {
      const { host, field, type, row } = mount(withBob);
      const bob = await chip(host);
      await type('gaston', NAME_LOOKUP_DEBOUNCE_MS + 20);
      bob.click();
      await settled(700);
      expect(field.value.replace(/\s+/g, ' ')).toBe(BOB);
      expect(row()!.hidden).toBe(true);
      expect(row()!.querySelector('.nq-cc-name-hit')).toBeNull();
    });

    test('a chip tapped during the debounce cancels the lookup', async () => {
      const { host, type, row, calls } = mount(withBob);
      const bob = await chip(host);
      await type('gaston', 0);
      bob.click();
      await settled(NAME_LOOKUP_DEBOUNCE_MS + 100);
      expect(calls).toEqual([]);
      expect(row()!.hidden).toBe(true);
    });

    test('a chip tapped over a drawn row takes the row away', async () => {
      const { host, type, row } = mount(withBob);
      const bob = await chip(host);
      await type('gaston');
      expect(row()!.querySelector('.nq-cc-name-hit')).not.toBeNull();
      bob.click();
      expect(row()!.hidden).toBe(true);
      expect(row()!.querySelector('.nq-cc-name-hit')).toBeNull();
    });

    test('no code writes the field except through the one helper', () => {
      const source = readFileSync(join(import.meta.dir, 'corner-control.ts'), 'utf8');
      expect(source.match(/recipientInput\.value\s*=[^=]/g)).toHaveLength(1);
      expect(source).toContain('recipientInput.value = text;\n    names?.fieldWritten();');
    });
  });

  describe('reopening the sheet', () => {
    test('a name still in the field gets its row back', async () => {
      const { field, type, row, reopen } = mount();
      await type('gaston');
      reopen();
      expect(field.value).toBe('gaston');
      await settled(NAME_LOOKUP_DEBOUNCE_MS + 650);
      const hit = row()!.querySelector('.nq-cc-name-hit') as HTMLElement;
      expect(hit.title).toBe(GASTON_SPACED);
    });

    test('a plain address stays in the field, as it always has, and asks nobody', async () => {
      const { field, type, row, calls, reopen } = mount();
      await type('nq12acqm28ql');
      reopen();
      await settled(NAME_LOOKUP_DEBOUNCE_MS + 100);
      expect(field.value).toBe('NQ12 ACQM 28QL');
      expect(row()!.hidden).toBe(true);
      expect(calls).toEqual([]);
    });

    test('a pick from before the close is forgotten', async () => {
      const { host, type, row, reopen } = mount();
      await type('gaston');
      (row()!.querySelector('.nq-cc-name-hit') as HTMLElement).click();
      (host.querySelector('.nq-cc-view-send .nq-cc-back') as HTMLElement).click();
      reopen();
      await settled(NAME_LOOKUP_DEBOUNCE_MS + 100);
      expect(row()!.hidden).toBe(true);
      // Same address, typed this time: it is no longer the name's to label.
      await type(GASTON_SPACED, 0);
      const parties = host.querySelectorAll('.nq-cc-party-name');
      expect((parties[parties.length - 1] as HTMLElement).textContent).toBe('NQ12 ACQM 28QL');
    });
  });

  describe('.nim', () => {
    const ALICE_SPACED = 'NQ12 ACQM 28QL U8T2 L9J1 GVN4 NJPL 1P3G ENVG';
    const proofFetch = (body: unknown, calls: string[] = []) => ((url: string) => {
      calls.push(url);
      return Promise.resolve(new Response(JSON.stringify(body), { status: body ? 200 : 404 }));
    }) as typeof fetch;
    const nim = (body: unknown, calls?: string[]) => mount({
      names: { fetch: proofFetch(body, calls), nim: { endpoints: ['https://a.test'], singleOperator: true } },
    });

    test('tapping a proven .nim fills its address and names the recipient, no funds to anyone else', async () => {
      const calls: string[] = [];
      const { host, field, type, row, paid } = nim(nimProofs.alice, calls);
      await type('Alice.nim');
      expect(field.value).toBe('Alice.nim');
      expect(calls).toEqual(['https://a.test/api/proof/alice']);
      const hit = row()!.querySelector('.nq-cc-name-hit') as HTMLElement;
      expect(hit.querySelector('.nq-cc-name-label')!.textContent).toBe('alice.nim');
      hit.click();
      expect(field.value.replace(/\s+/g, ' ')).toBe(ALICE_SPACED);
      const parties = host.querySelectorAll('.nq-cc-party-name');
      expect((parties[parties.length - 1] as HTMLElement).textContent).toBe('alice.nim');
      expect(paid).toEqual([]);
    });

    test('the shipped default has one host, so it offers nothing to tap and asks nobody', async () => {
      const calls: string[] = [];
      const { type, row } = mount({ names: { fetch: proofFetch(nimProofs.alice, calls) } });
      await type('alice.nim');
      expect(calls).toEqual([]);
      expect(row()!.querySelector('.nq-cc-name-hit')).toBeNull();
      expect(row()!.textContent).toBe('Could not check alice.nim right now');
    });

    test('a forged address draws one line and no row', async () => {
      const forged = JSON.parse(JSON.stringify(nimProofs.alice));
      forged.leaf.target = nimProofs.bobbo.leaf.target;
      const { type, row } = nim(forged);
      await type('alice.nim');
      expect(row()!.querySelector('.nq-cc-name-hit')).toBeNull();
    });

    test('a name typed one key at a time keeps its dot and stays a name', async () => {
      const { field, type } = nim(null);
      for (const c of 'alice.nim') await type(field.value + c, 0);
      expect(field.value).toBe('alice.nim');
    });

    test('an NNS name still goes to NNS with .nim configured', async () => {
      const { type, row, calls } = mount();
      await type('gaston');
      expect(calls.length).toBeGreaterThan(0);
      expect(row()!.querySelector('.nq-cc-name-label')!.textContent).toBe('gaston');
    });
  });
});
