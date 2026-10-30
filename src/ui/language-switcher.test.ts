// The flag row and the compact pill: both drive one i18n instance, so what is
// pinned is the sync in both directions (a pick sets the language, a language
// change from anywhere else moves the active mark) and that destroy() really
// lets go. The menu's open and close paths are pinned for the pill, because a
// document listener left behind keeps closing menus that belong to someone else.
//
// happy-dom supplies the DOM. bun test shares one global object across files,
// so every global set here is put back after each test.
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { createI18n, type I18n } from '../i18n';
import { FEATURED_LANGUAGES, mergeLocales, shellLocales, SHELL_LANGUAGES } from '../locales';
import { mountLanguageSwitcher } from './language-switcher';
import { mountLanguagePill } from './language-pill';

const KEYS = ['window', 'document', 'navigator', 'localStorage'] as const;
const g = globalThis as unknown as Record<string, unknown>;
let saved: Record<string, PropertyDescriptor | undefined> = {};
let w: Window;
let host: HTMLElement;
let i18n: I18n;

beforeEach(() => {
  w = new Window({ url: 'https://app.example/' });
  saved = {};
  for (const k of KEYS) {
    saved[k] = Object.getOwnPropertyDescriptor(globalThis, k);
    Object.defineProperty(globalThis, k, { value: (w as unknown as Record<string, unknown>)[k], configurable: true, writable: true });
  }
  host = w.document.createElement('div') as unknown as HTMLElement;
  w.document.body.appendChild(host as never);
  i18n = createI18n({ locales: mergeLocales(shellLocales), initial: 'en' });
});

afterEach(() => {
  for (const k of KEYS) {
    const d = saved[k];
    if (d) Object.defineProperty(globalThis, k, d);
    else delete g[k];
  }
  void w.happyDOM.close();
});

const active = (root: Element, sel: string) =>
  [...root.querySelectorAll(sel)].filter((b) => b.classList.contains('is-active')).map((b) => b.getAttribute('aria-label') ?? b.textContent);

describe('mountLanguageSwitcher', () => {
  test('one option per shell language, the current one marked, styles injected once', () => {
    const a = mountLanguageSwitcher(host, { i18n });
    mountLanguageSwitcher(host, { i18n });
    const buttons = a.el.querySelectorAll('.nq-langsw__btn');
    expect(buttons).toHaveLength(SHELL_LANGUAGES.length);
    expect(active(a.el, '.nq-langsw__btn')).toEqual(['English']);
    expect(buttons[0]!.getAttribute('aria-selected')).toBe('true');
    expect(buttons[1]!.getAttribute('aria-selected')).toBe('false');
    expect(w.document.querySelectorAll('#nimiq-shell-lang-switcher-style')).toHaveLength(1);
    expect(a.el.getAttribute('aria-label')).toBe('Language');
    expect(a.el.style.getPropertyValue('--nq-flag-w')).toBe('40px');
  });

  test('a click sets the language, and the mark follows', () => {
    const h = mountLanguageSwitcher(host, { i18n });
    (h.el.querySelectorAll('.nq-langsw__btn')[2] as HTMLButtonElement).click();
    expect(i18n.getLanguage()).toBe('de');
    expect(active(h.el, '.nq-langsw__btn')).toEqual(['German']);
  });

  test('a change from elsewhere moves the mark; after destroy it no longer listens', () => {
    const h = mountLanguageSwitcher(host, { i18n, languages: FEATURED_LANGUAGES, size: 24, injectStyles: false });
    expect(h.el.querySelectorAll('li')).toHaveLength(FEATURED_LANGUAGES.length);
    expect(w.document.getElementById('nimiq-shell-lang-switcher-style')).toBeNull();
    i18n.setLanguage('ko');
    expect(active(h.el, '.nq-langsw__btn')).toEqual(['Korean']);
    h.destroy();
    expect(host.contains(h.el)).toBe(false);
    i18n.setLanguage('fr');
    expect(active(h.el, '.nq-langsw__btn')).toEqual(['Korean']);
  });
});

describe('mountLanguagePill', () => {
  const menuOf = (root: Element) => root.querySelector('.nq-langpill__menu') as HTMLUListElement;
  const trigger = (root: Element) => root.querySelector('.nq-langpill__btn') as HTMLButtonElement;

  test('closed by default, the trigger shows one flag and a caret', () => {
    const h = mountLanguagePill(host, { i18n });
    expect(menuOf(h.el).hidden).toBe(true);
    expect(trigger(h.el).getAttribute('aria-expanded')).toBe('false');
    expect(trigger(h.el).querySelectorAll('svg.nq-flag-hex')).toHaveLength(1);
    expect(trigger(h.el).querySelector('.nq-langpill__caret')).not.toBeNull();
    expect(h.el.querySelectorAll('.nq-langpill__option')).toHaveLength(FEATURED_LANGUAGES.length);
    expect(active(h.el, '.nq-langpill__option')).toEqual(['English']);
  });

  test('the trigger toggles the menu', () => {
    const h = mountLanguagePill(host, { i18n });
    trigger(h.el).click();
    expect(menuOf(h.el).hidden).toBe(false);
    expect(trigger(h.el).getAttribute('aria-expanded')).toBe('true');
    trigger(h.el).click();
    expect(menuOf(h.el).hidden).toBe(true);
  });

  test('picking an option sets the language, closes the menu, and re-renders the trigger', () => {
    const h = mountLanguagePill(host, { i18n });
    trigger(h.el).click();
    const before = trigger(h.el).innerHTML;
    const vi = [...h.el.querySelectorAll('.nq-langpill__option')].find((o) => o.textContent === 'Vietnamese') as HTMLButtonElement;
    vi.click();
    expect(i18n.getLanguage()).toBe('vi');
    expect(menuOf(h.el).hidden).toBe(true);
    expect(active(h.el, '.nq-langpill__option')).toEqual(['Vietnamese']);
    expect(trigger(h.el).innerHTML).not.toBe(before);
  });

  test('an outside click closes it, an inside click does not', () => {
    const h = mountLanguagePill(host, { i18n });
    trigger(h.el).click();
    menuOf(h.el).dispatchEvent(new w.MouseEvent('click', { bubbles: true }) as unknown as Event);
    expect(menuOf(h.el).hidden).toBe(false);
    w.document.body.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    expect(menuOf(h.el).hidden).toBe(true);
  });

  test('Escape closes it and returns focus to the trigger; other keys do nothing', () => {
    const h = mountLanguagePill(host, { i18n });
    trigger(h.el).click();
    w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter' }));
    expect(menuOf(h.el).hidden).toBe(false);
    w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape' }));
    expect(menuOf(h.el).hidden).toBe(true);
    expect(w.document.activeElement).toBe(trigger(h.el) as never);
  });

  test('a language with no entry in the list falls back to the first flag', () => {
    i18n.setLanguage('xx');
    const h = mountLanguagePill(host, { i18n, languages: SHELL_LANGUAGES });
    expect(trigger(h.el).querySelectorAll('svg.nq-flag-hex')).toHaveLength(1);
    expect(active(h.el, '.nq-langpill__option')).toEqual([]);
  });

  test('destroy closes an open menu, drops its listeners and stops following i18n', () => {
    const h = mountLanguagePill(host, { i18n, injectStyles: false });
    trigger(h.el).click();
    h.destroy();
    expect(host.contains(h.el)).toBe(false);
    expect(menuOf(h.el).hidden).toBe(true);
    i18n.setLanguage('de');
    expect(active(h.el, '.nq-langpill__option')).toEqual(['English']);
  });
});
