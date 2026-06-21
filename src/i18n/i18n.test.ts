import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { createI18n } from './index';

const locales = {
  en: { greeting: 'Hello', welcome: 'Welcome, {name}', only: 'EN only' },
  de: { greeting: 'Hallo', welcome: 'Willkommen, {name}' },
  pt: { greeting: 'Olá', welcome: 'Bem-vindo, {name}' },
};

// ---- a minimal localStorage + document + navigator shim --------------------

function installStorage(): void {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
  };
}

function installDocument(): void {
  (globalThis as any).document = { documentElement: { lang: '' } };
}

function installWindow(search: string, nimiqPay?: { language?: string }): void {
  (globalThis as any).window = {
    location: { search },
    ...(nimiqPay ? { nimiqPay } : {}),
  };
}

function installNavigator(language: string): void {
  (globalThis as any).navigator = { language };
}

beforeEach(() => {
  installStorage();
  installDocument();
});

afterEach(() => {
  for (const k of ['localStorage', 'document', 'window', 'navigator']) {
    delete (globalThis as any)[k];
  }
});

// ---- translation -----------------------------------------------------------

describe('t()', () => {
  test('translates a key', () => {
    const i18n = createI18n({ locales, initial: 'en' });
    expect(i18n.t('greeting')).toBe('Hello');
  });

  test('interpolates params', () => {
    const i18n = createI18n({ locales, initial: 'de' });
    expect(i18n.t('welcome', { name: 'Andrew' })).toBe('Willkommen, Andrew');
  });

  test('falls back to fallback locale for a missing key', () => {
    const i18n = createI18n({ locales, fallback: 'en', initial: 'de' });
    // 'only' exists in en, not de
    expect(i18n.t('only')).toBe('EN only');
  });

  test('unknown key returns the key itself', () => {
    const i18n = createI18n({ locales, initial: 'en' });
    expect(i18n.t('does.not.exist')).toBe('does.not.exist');
  });
});

// ---- setLanguage -----------------------------------------------------------

describe('setLanguage()', () => {
  test('switches at runtime and persists + sets <html lang>', () => {
    const i18n = createI18n({ locales, initial: 'en' });
    i18n.setLanguage('de');
    expect(i18n.getLanguage()).toBe('de');
    expect(i18n.t('greeting')).toBe('Hallo');
    expect((globalThis as any).localStorage.getItem('nimiq-app-lang')).toBe('de');
    expect((globalThis as any).document.documentElement.lang).toBe('de');
  });

  test('emits onChange (no reload)', () => {
    const i18n = createI18n({ locales, initial: 'en' });
    const seen: string[] = [];
    i18n.onChange((id) => seen.push(id));
    i18n.setLanguage('pt');
    i18n.setLanguage('de');
    expect(seen).toEqual(['pt', 'de']);
  });

  test('unsubscribe stops further notifications', () => {
    const i18n = createI18n({ locales, initial: 'en' });
    const seen: string[] = [];
    const off = i18n.onChange((id) => seen.push(id));
    i18n.setLanguage('de');
    off();
    i18n.setLanguage('pt');
    expect(seen).toEqual(['de']);
  });
});

// ---- resolution priority ---------------------------------------------------

describe('initial language resolution', () => {
  test('?lang= URL param wins (highest priority)', () => {
    installWindow('?lang=pt', { language: 'de' });
    installNavigator('fr-FR');
    (globalThis as any).localStorage.setItem('nimiq-app-lang', 'en');
    const i18n = createI18n({ locales, fallback: 'en' });
    expect(i18n.getLanguage()).toBe('pt');
  });

  test('window.nimiqPay.language wins over storage + navigator', () => {
    installWindow('', { language: 'de' });
    installNavigator('en-US');
    (globalThis as any).localStorage.setItem('nimiq-app-lang', 'pt');
    const i18n = createI18n({ locales, fallback: 'en' });
    expect(i18n.getLanguage()).toBe('de');
  });

  test('localStorage wins over navigator', () => {
    installWindow('');
    installNavigator('en-US');
    (globalThis as any).localStorage.setItem('nimiq-app-lang', 'pt');
    const i18n = createI18n({ locales, fallback: 'en' });
    expect(i18n.getLanguage()).toBe('pt');
  });

  test('navigator.language (split on -) when nothing else', () => {
    installWindow('');
    installNavigator('de-AT');
    const i18n = createI18n({ locales, fallback: 'en' });
    expect(i18n.getLanguage()).toBe('de');
  });

  test('falls back to fallback when no candidate is a known locale', () => {
    installWindow('?lang=xx', { language: 'zz' });
    installNavigator('qq-QQ');
    const i18n = createI18n({ locales, fallback: 'en' });
    expect(i18n.getLanguage()).toBe('en');
  });

  test('boot persists the resolved language and sets <html lang>', () => {
    installWindow('?lang=pt');
    const i18n = createI18n({ locales, fallback: 'en' });
    expect((globalThis as any).localStorage.getItem('nimiq-app-lang')).toBe('pt');
    expect((globalThis as any).document.documentElement.lang).toBe('pt');
    expect(i18n.getLanguage()).toBe('pt');
  });

  test('availableLanguages lists the locale ids', () => {
    const i18n = createI18n({ locales, initial: 'en' });
    expect(i18n.availableLanguages().sort()).toEqual(['de', 'en', 'pt']);
  });
});
