// The edges of the i18n engine that i18n.test.ts does not reach: hostile
// storage and location, a locale set with no fallback, and setLanguage calls
// that must NOT notify (a same-id or blank set firing onChange would re-render
// every mounted control for nothing).
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { createI18n } from './index';

const locales = { en: { hi: 'Hello' }, de: { hi: 'Hallo' } };
const KEYS = ['window', 'document', 'navigator', 'localStorage'] as const;
const g = globalThis as unknown as Record<string, unknown>;
let saved: Record<string, PropertyDescriptor | undefined> = {};

function set(k: (typeof KEYS)[number], v: unknown): void {
  Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
}

beforeEach(() => {
  saved = {};
  for (const k of KEYS) saved[k] = Object.getOwnPropertyDescriptor(globalThis, k);
  for (const k of KEYS) delete g[k];
});

afterEach(() => {
  for (const k of KEYS) {
    const d = saved[k];
    if (d) Object.defineProperty(globalThis, k, d);
    else delete g[k];
  }
});

describe('createI18n edges', () => {
  test('a localStorage that throws on every call: boot and switching still work', () => {
    const boom = () => { throw new Error('SecurityError'); };
    set('localStorage', { getItem: boom, setItem: boom, removeItem: boom });
    set('navigator', { language: 'de-AT' });
    const i = createI18n({ locales });
    expect(i.getLanguage()).toBe('de');
    i.setLanguage('en');
    expect(i.t('hi')).toBe('Hello');
  });

  test('a location whose search getter throws is skipped, not fatal', () => {
    set('window', { get location() { return { get search(): string { throw new Error('cross-origin'); } }; } });
    set('navigator', { language: 'de' });
    expect(createI18n({ locales }).getLanguage()).toBe('de');
  });

  test('blank candidates are skipped: an empty ?lang=, host language and stored value', () => {
    set('window', { location: { search: '?lang=%20' }, nimiqPay: { language: ' ' } });
    set('localStorage', { getItem: () => '  ', setItem: () => {} });
    set('navigator', { language: '' });
    expect(createI18n({ locales, fallback: 'de' }).getLanguage()).toBe('de');
  });

  test('no fallback locale at all: unknown language and missing key both return the key', () => {
    const i = createI18n({ locales: { de: { hi: 'Hallo' } }, initial: 'xx', fallback: 'en' });
    expect(i.getLanguage()).toBe('xx');
    expect(i.t('hi')).toBe('hi');
    expect(i.t('greet {name}', { name: 'Ana' })).toBe('greet Ana');
  });

  test('an unknown language keeps its id but reads the fallback strings', () => {
    const i = createI18n({ locales, initial: ' sw ' });
    expect(i.getLanguage()).toBe('sw');
    expect(i.t('hi')).toBe('Hello');
  });

  test('setting the same id, or a blank one, notifies nobody and re-affirms <html lang>', () => {
    const html = { lang: '' };
    set('document', { documentElement: html });
    const i = createI18n({ locales, initial: 'en' });
    const seen: string[] = [];
    i.onChange((id) => seen.push(id));
    html.lang = 'tampered';
    i.setLanguage('en');
    i.setLanguage('   ');
    expect(seen).toEqual([]);
    expect(html.lang).toBe('en');
    i.setLanguage(' de ');
    expect(seen).toEqual(['de']);
  });
});
