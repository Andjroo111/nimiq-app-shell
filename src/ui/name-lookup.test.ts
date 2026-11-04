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
import { NAME_INVALID_DELAY_MS, NAME_LOOKUP_CSS, NAME_LOOKUP_DEBOUNCE_MS } from './name-lookup';
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

const delegatedFetch = ((url: string) => {
  const u = new URL(url);
  const body = u.host === 'evil.example' ? { address: 'NQ48 8CKH BA24 2VR3 N249 N8MN J5XX 74DB 5XJ8', ttl: 60 }
    : { ...(u.host === 'api.nimiqnames.com' ? a : b), host: 'evil.example' };
  return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
}) as typeof fetch;

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

    test('a forged host on both answers says not verified and shows every block', async () => {
      const { host, field, type, row } = mount({ names: { fetch: delegated } });
      await type('shop.gaston');
      expect(row()!.querySelector('.nq-cc-name-hit')).toBeNull();
      expect(row()!.querySelector('.nq-cc-name-unverified')!.textContent).toBe('Address not verified');
      expect(row()!.querySelector('.nq-cc-name-full')!.textContent).toBe('NQ48 8CKH BA24\n2VR3 N249 N8MN\nJ5XX 74DB 5XJ8');
      const go = row()!.querySelector('.nq-cc-name-continue') as HTMLElement;
      expect(go.textContent).toBe('Send to this address');
      expect(go.getAttribute('aria-label')).toBe('Send to this address: shop.gaston. Address not verified');
      // Showing it moves nothing: the field and the step wait for the tap.
      expect(field.value).toBe('shop.gaston');
      expect(host.querySelector('.nq-cc')!.classList.contains('nq-cc-show-send')).toBe(false);
    });

    test('tapping the box itself does nothing, only the button continues', async () => {
      const { host, field, type, row } = mount({ names: { fetch: delegated } });
      await type('shop.gaston');
      (row()!.querySelector('.nq-cc-name-unverified-box') as HTMLElement).click();
      (row()!.querySelector('.nq-cc-name-full') as HTMLElement).click();
      expect(field.value).toBe('shop.gaston');
      expect(host.querySelector('.nq-cc')!.classList.contains('nq-cc-show-send')).toBe(false);
    });

    test('a parent with no delegation says the name does not exist, not to retry', async () => {
      const { type, row } = mount();
      await type('shop.gaston');
      expect(row()!.querySelector('button')).toBeNull();
      expect(row()!.textContent).toBe('shop.gaston does not exist. Its parent name has no delegation');
    });

    test('a proven name on the same fetch draws no such line', async () => {
      const { type, row } = mount({ names: { fetch: delegated } });
      await type('gaston');
      const hit = row()!.querySelector('.nq-cc-name-hit') as HTMLElement;
      expect(hit.title).toBe(GASTON_SPACED);
      expect(row()!.querySelector('.nq-cc-name-unverified')).toBeNull();
      expect(row()!.querySelector('.nq-cc-name-continue')).toBeNull();
      expect(hit.getAttribute('aria-label')).toBe('Pay gaston');
    });

    test('tapping it fills the address and the amount sheet does not name the recipient', async () => {
      const { host, field, type, row } = mount({ names: { fetch: delegated } });
      await type('shop.gaston');
      (row()!.querySelector('.nq-cc-name-continue') as HTMLElement).click();
      expect(field.value.replace(/\s+/g, ' ')).toBe(PICKED);
      expect(host.querySelector('.nq-cc')!.classList.contains('nq-cc-show-send')).toBe(true);
      const parties = host.querySelectorAll('.nq-cc-party-name');
      const party = parties[parties.length - 1] as HTMLElement;
      expect(party.textContent).toBe('NQ48 8CKH BA24');
      expect(party.classList.contains('nq-cc-is-name')).toBe(false);
    });
  });

  describe('what a paste can look like', () => {
    const SPELLED = GASTON_SPACED.replace(/ /g, '');
    const onSendSheet = (host: HTMLElement) => host.querySelector('.nq-cc')!.classList.contains('nq-cc-show-send');
    const addresses: Record<string, string> = {
      'a leading zero-width space': `\u200b${SPELLED}`,
      'a space inside the prefix': `NQ 12 ACQM 28QL U8T2 L9J1 GVN4 NJPL 1P3G ENVG`,
      'a nimiq:// link': `nimiq://${SPELLED}`,
      'a zero-width space before nimiq:': `\u200bnimiq:${SPELLED}`,
      'quotes': `"${SPELLED}"`,
    };
    for (const [what, text] of Object.entries(addresses)) {
      test(`${what} is an address`, async () => {
        const { host, field, type, row } = mount();
        await type(text, 0);
        expect(field.value.replace(/\s+/g, ' ')).toBe(GASTON_SPACED);
        expect(onSendSheet(host)).toBe(true);
        expect(row()!.hidden).toBe(true);
      });
    }

    const names: Record<string, string> = {
      'an @': `@${SPELLED}`,
      'an @ behind a quote': `"@${SPELLED}`,
      'an @ behind a zero-width space': `\u200b@${SPELLED}`,
      '.nim': `${SPELLED}.nim`,
      '.nim inside quotes': `"${SPELLED}.nim"`,
      '.nim before a zero-width space': `${SPELLED}.nim\u200b`,
    };
    for (const [what, text] of Object.entries(names)) {
      test(`${what} stays a name, does not advance and draws a line`, async () => {
        const { host, type, row } = mount();
        await type(text, NAME_INVALID_DELAY_MS + 50);
        expect(onSendSheet(host)).toBe(false);
        expect(row()!.hidden).toBe(false);
        expect(row()!.textContent).not.toBe('');
      });
    }

    test('text in name mode with no query says why', async () => {
      const { type, row, calls } = mount();
      await type('gas', NAME_INVALID_DELAY_MS + 50);
      expect(row()!.textContent).toBe('Enter an address without symbols, or a name of at least 5 letters');
      expect(calls).toEqual([]);
    });

    test('an empty field draws nothing', async () => {
      const { type, row } = mount();
      await type('gas', NAME_INVALID_DELAY_MS + 50);
      expect(row()!.hidden).toBe(false);
      await type('', NAME_INVALID_DELAY_MS + 50);
      expect(row()!.hidden).toBe(true);
    });
  });

  describe('the row is a live region', () => {
    test('it is marked as one', () => {
      const { row } = mount();
      expect(row()!.getAttribute('aria-live')).toBe('polite');
    });

    test('a screen reader user typing an address is never told it is invalid', async () => {
      const { type, row } = mount();
      const heard: string[] = [];
      for (const text of ['n', 'nq', 'nq1', 'nq12', 'nq12a']) {
        await type(text, NAME_LOOKUP_DEBOUNCE_MS + 50);
        heard.push(row()!.textContent ?? '');
      }
      await new Promise((r) => setTimeout(r, NAME_INVALID_DELAY_MS + 50));
      heard.push(row()!.textContent ?? '');
      expect(heard).toEqual(['', '', '', '', '', '']);
      expect(row()!.hidden).toBe(true);
    });

    test('the same words are not written again, so they are not said again', async () => {
      const { type, row } = mount();
      await type('gaston', 0);
      const first = row()!.firstElementChild;
      expect(first!.textContent).toBe('Checking gaston...');
      await type('gaston ', 0);
      expect(row()!.firstElementChild).toBe(first);
    });

    test('new words are written', async () => {
      const { type, row } = mount();
      await type('gaston', 0);
      const first = row()!.firstElementChild;
      await type('gastons', 0);
      expect(row()!.firstElementChild).not.toBe(first);
      expect(row()!.textContent).toBe('Checking gastons...');
    });
  });

  test('a pick does not name an address pasted after it', async () => {
    const { host, type, row } = mount();
    await type('gaston');
    (row()!.querySelector('.nq-cc-name-hit') as HTMLElement).click();
    (host.querySelector('.nq-cc-view-send .nq-cc-back') as HTMLElement).click();
    await type('NQ48 8CKH BA24 2VR3 N249 N8MN J5XX 74DB 5XJ8', 0);
    const parties = host.querySelectorAll('.nq-cc-party-name');
    const party = parties[parties.length - 1] as HTMLElement;
    expect(party.textContent).toBe('NQ48 8CKH BA24');
    expect(party.classList.contains('nq-cc-is-name')).toBe(false);
  });

  test('Send disarms if the field turns into name text that spells an address', async () => {
    const { host, type } = mount();
    const spelled = GASTON_SPACED.replace(/ /g, '');
    await type(spelled, 0);
    const amount = host.querySelector('.nq-cc-view-send .nq-cc-input') as HTMLInputElement;
    amount.value = '1';
    amount.dispatchEvent(new (globalThis as unknown as { Event: typeof Event }).Event('input'));
    const send = host.querySelector('.nq-cc-send-confirm') as HTMLButtonElement;
    expect(send.disabled).toBe(false);
    await type(`@${spelled}`, 0);
    expect(send.disabled).toBe(true);
  });

  describe('a drawn row on a short screen', () => {
    const watch = () => {
      const seen: string[] = [];
      (globalThis.HTMLElement.prototype as unknown as Record<string, unknown>).scrollIntoView =
        function (this: HTMLElement) { seen.push(this.className); };
      return seen;
    };

    test('a proven row scrolls into view', async () => {
      const { type } = mount();
      const seen = watch();
      await type('gaston');
      expect(seen).toContain('nq-cc-name-hit');
    });

    test('an unverified row brings its box and its button into view', async () => {
      const { type } = mount({ names: { fetch: delegatedFetch } });
      const seen = watch();
      await type('shop.gaston');
      expect(seen).toEqual(['nq-cc-name-unverified-box', 'nq-cc-name-continue']);
    });
  });

  describe('the unverified button in every language', () => {
    for (const locale of Object.keys(mergeLocales(shellLocales))) {
      test(`${locale}: the accessible name contains the visible words`, async () => {
        const i18n = createI18n({ locales: mergeLocales(shellLocales), fallback: 'en' });
        i18n.setLanguage(locale);
        const { type, row } = mount({ names: { fetch: delegatedFetch }, i18n } as never);
        await type('shop.gaston');
        const go = row()!.querySelector('.nq-cc-name-continue') as HTMLElement;
        expect(go.textContent!.length).toBeGreaterThan(0);
        expect(go.getAttribute('aria-label')).toContain(go.textContent!);
      });
    }
  });

  test('an unverified pick of a proven address does not inherit the proven name', async () => {
    // gaston is picked first, then a delegate host answers with gaston's own address.
    const same = ((url: string) => {
      const u = new URL(url);
      const body = u.host === 'evil.example' ? { address: GASTON_SPACED, ttl: 60 }
        : { ...(u.host === 'api.nimiqnames.com' ? a : b), host: 'evil.example' };
      return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
    }) as typeof fetch;
    const { host, type, row } = mount({ names: { fetch: same } });
    await type('gaston');
    (row()!.querySelector('.nq-cc-name-hit') as HTMLElement).click();
    (host.querySelector('.nq-cc-view-send .nq-cc-back') as HTMLElement).click();
    await type('shop.gaston');
    (row()!.querySelector('.nq-cc-name-continue') as HTMLElement).click();
    const parties = host.querySelectorAll('.nq-cc-party-name');
    const party = parties[parties.length - 1] as HTMLElement;
    expect(party.textContent).toBe('NQ12 ACQM 28QL');
  });

  describe('text in name mode that spells an address', () => {
    const SPELLED = GASTON_SPACED.replace(/ /g, '');
    for (const text of [`@${SPELLED}`, `${SPELLED}.nim`]) {
      test(`${text.replace(SPELLED, '<address>')} does not advance`, async () => {
        const { host, type } = mount();
        await type(text, 0);
        expect(host.querySelector('.nq-cc')!.classList.contains('nq-cc-show-send')).toBe(false);
      });
    }

    test('the address alone still advances', async () => {
      const { host, type } = mount();
      await type(SPELLED, 0);
      expect(host.querySelector('.nq-cc')!.classList.contains('nq-cc-show-send')).toBe(true);
    });

    test('names: false still advances on the same text, as it always did', async () => {
      const { host, type } = mount({ names: false });
      await type(`@${SPELLED}`, 0);
      expect(host.querySelector('.nq-cc')!.classList.contains('nq-cc-show-send')).toBe(true);
    });
  });

  describe('the row styles', () => {
    const rule = (selector: string) => NAME_LOOKUP_CSS.slice(NAME_LOOKUP_CSS.indexOf(`\n${selector} {`)).split('}')[0]!;
    const channel = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
    const lum = ([r, g, b]: number[]) => 0.2126 * channel(r!) + 0.7152 * channel(g!) + 0.0722 * channel(b!);
    const ratio = (x: number[], y: number[]) => {
      const [hi, lo] = [lum(x), lum(y)].sort((m, n) => n - m) as [number, number];
      return (hi + 0.05) / (lo + 0.05);
    };
    const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

    test('the warning text reaches AA on the washed row, on white', () => {
      const color = rule('.nq-cc-name-unverified').match(/color:var\([^,]+, (#[0-9a-f]{6})\)/)![1]!;
      const pct = Number(rule('.nq-cc-name-unverified-box').match(/#fc8702\) (\d+)%/)![1]) / 100;
      const washed = hex('#fc8702').map((c) => c * pct + 255 * (1 - pct));
      expect(ratio(hex(color), washed)).toBeGreaterThanOrEqual(4.5);
    });

    test('a note reaches AA on white and wraps a long name', () => {
      const note = rule('.nq-cc-name-note');
      expect(note).toContain('overflow-wrap:anywhere');
      const [, fg, pct] = note.match(/color-mix\(in srgb, var\([^,]+, (#[0-9a-f]{6})\) (\d+)%, transparent\)/)!;
      const alpha = Number(pct) / 100;
      expect(ratio(hex(fg!).map((c) => c * alpha + 255 * (1 - alpha)), [255, 255, 255])).toBeGreaterThanOrEqual(4.5);
    });

    test('an address on either row is in the mono face its blocks line up in', () => {
      expect(rule('.nq-cc-name-full')).toContain('Fira Mono');
      expect(rule('.nq-cc-name-addr')).toContain('Fira Mono');
    });

    test('a long name wraps in the row and on the amount sheet', () => {
      expect(rule('.nq-cc-name-label')).toContain('overflow-wrap:anywhere');
      const party = rule('.nq-cc-party-name.nq-cc-mono.nq-cc-is-name');
      expect(party).toContain('white-space:normal');
      expect(party).toContain('overflow:visible');
      expect(party).toContain('overflow-wrap:anywhere');
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
      expect(row()!.textContent).toBe('This site does not check .nim names');
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
