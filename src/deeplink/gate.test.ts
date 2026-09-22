// The open-in-Pay gate: both variants, and the self-heal after Pay's passcode
// screen. The heal is the part that matters. Without it a visitor who IS inside
// Pay stays stuck on a "please open in Pay" screen until they reload.
import { describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { mountOpenInPayGate, type OpenInPayGateOptions } from './gate';
import { buildOpenInPayUrl, mountOpenInPayGate as fromEntry } from './index';
import { createI18n } from '../i18n';
import { mergeLocales, shellLocales } from '../locales';

const TARGET = 'https://stakes.example/table/3';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36';

function setup(coarse: boolean) {
  const w = new Window({ url: TARGET });
  const doc = w.document as unknown as Document;
  const host = doc.createElement('div');
  doc.body.appendChild(host);
  const win = w as unknown as NonNullable<OpenInPayGateOptions['win']> & Record<string, unknown>;
  win.matchMedia = ((q: string) => ({ matches: coarse && q === '(pointer: coarse)' })) as never;
  const visited: string[] = [];
  const qrCalls: Array<[string, number]> = [];
  const qr = (text: string, size: number) => {
    qrCalls.push([text, size]);
    const el = doc.createElement('canvas');
    el.className = 'fake-qr';
    return el;
  };
  return { w, doc, host, win, visited, qrCalls, qr, navigate: (u: string) => visited.push(u) };
}

describe('mountOpenInPayGate', () => {
  test('is reachable from the ./deeplink entry', () => {
    expect(fromEntry).toBe(mountOpenInPayGate);
  });

  test('a touch device gets one button that runs the ladder', () => {
    const s = setup(true);
    Object.defineProperty(s.w.navigator, 'userAgent', { value: ANDROID, configurable: true });
    const g = mountOpenInPayGate(s.host, { target: TARGET, win: s.win, navigate: s.navigate, qr: s.qr });
    expect(g.variant).toBe('touch');
    const buttons = s.host.querySelectorAll('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]!.textContent).toBe('Open in Nimiq Pay');
    expect(s.qrCalls).toHaveLength(0);
    buttons[0]!.click();
    expect(s.visited).toEqual([buildOpenInPayUrl(TARGET).androidIntent]);
    g.destroy();
    expect(s.host.children).toHaveLength(0);
  });

  test('a desktop gets a QR of the https App Link and no button', () => {
    const s = setup(false);
    const g = mountOpenInPayGate(s.host, { target: TARGET, win: s.win, qr: s.qr, qrSize: 180 });
    expect(g.variant).toBe('desktop');
    expect(s.host.querySelector('button')).toBeNull();
    expect(s.qrCalls).toEqual([['https://nimpay.app/miniapps/open/stakes.example/table/3', 180]]);
    expect(s.host.querySelector('.fake-qr')).not.toBeNull();
    g.destroy();
  });

  test('the target defaults to the current page', () => {
    const s = setup(false);
    mountOpenInPayGate(s.host, { win: s.win, qr: s.qr }).destroy();
    expect(s.qrCalls[0]![0]).toBe(buildOpenInPayUrl(TARGET).https);
  });

  test('labels follow the shell i18n', () => {
    const s = setup(true);
    const i18n = createI18n({ locales: mergeLocales(shellLocales), fallback: 'en', initial: 'de' });
    const g = mountOpenInPayGate(s.host, { target: TARGET, win: s.win, qr: s.qr, i18n });
    expect(s.host.querySelector('button')!.textContent).toBe('In Nimiq Pay öffnen');
    i18n.setLanguage('en');
    expect(s.host.querySelector('button')!.textContent).toBe('Open in Nimiq Pay');
    g.destroy();
  });

  test('heals when window.nimiq appears after the passcode screen', () => {
    for (const event of ['visibilitychange', 'focus', 'pageshow'] as const) {
      const s = setup(false);
      let calls = 0;
      const g = mountOpenInPayGate(s.host, { target: TARGET, win: s.win, qr: s.qr, onInsidePay: () => calls++ });
      expect(calls).toBe(0);
      const fire = () => {
        const tgt = event === 'visibilitychange' ? s.w.document : s.w;
        tgt.dispatchEvent(new s.w.Event(event));
      };
      fire();
      expect(calls).toBe(0);
      s.win.nimiq = {};
      fire();
      expect(calls).toBe(1);
      fire(); // fires once, then stops watching
      expect(calls).toBe(1);
      g.destroy();
    }
  });

  test('window.nimiqPay already present calls onInsidePay at mount', () => {
    const s = setup(true);
    s.win.nimiqPay = {};
    let calls = 0;
    mountOpenInPayGate(s.host, { target: TARGET, win: s.win, qr: s.qr, onInsidePay: () => calls++ }).destroy();
    expect(calls).toBe(1);
  });

  test('destroy stops the watcher', () => {
    const s = setup(false);
    let calls = 0;
    const g = mountOpenInPayGate(s.host, { target: TARGET, win: s.win, qr: s.qr, onInsidePay: () => calls++ });
    g.destroy();
    s.win.nimiq = {};
    s.w.dispatchEvent(new s.w.Event('focus'));
    expect(calls).toBe(0);
  });
});
