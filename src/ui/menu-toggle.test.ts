// The face toggles the menu, whatever form `hidden` takes. TS 6 types it
// boolean | 'until-found', and nimiq.markets carried a patch until this was fixed here.
import { describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { mountMiniWallet } from './corner-control';
import { shellLocales, mergeLocales } from '../locales';
import { createI18n } from '../i18n';

function mount() {
  const w = new Window();
  for (const key of ['document', 'HTMLElement', 'navigator', 'localStorage', 'getComputedStyle']) {
    (globalThis as unknown as Record<string, unknown>)[key] = (w as unknown as Record<string, unknown>)[key];
  }
  const host = w.document.createElement('div') as unknown as HTMLElement;
  w.document.body.appendChild(host as never);
  mountMiniWallet(host, { i18n: createI18n({ locales: mergeLocales(shellLocales), fallback: 'en' }) });
  const menu = host.querySelector('.nq-cc-menu') as HTMLElement;
  const flag = host.querySelector('.nq-cc-face-flag') as HTMLElement;
  return { menu, flag };
}

describe('menu toggle', () => {
  test('a click opens a closed menu and a second click closes it', () => {
    const { menu, flag } = mount();
    expect(menu.hidden).toBe(true);
    flag.click();
    expect(menu.hidden).toBe(false);
    expect(flag.getAttribute('aria-expanded')).toBe('true');
    flag.click();
    expect(menu.hidden).toBe(true);
  });

  test("hidden = 'until-found' counts as closed, so a click opens it", () => {
    const { menu, flag } = mount();
    let v: boolean | 'until-found' = 'until-found';
    Object.defineProperty(menu, 'hidden', { configurable: true, get: () => v, set: (x) => { v = x; } });
    flag.click();
    expect(menu.hidden).toBe(false);
    expect(flag.getAttribute('aria-expanded')).toBe('true');
  });
});
