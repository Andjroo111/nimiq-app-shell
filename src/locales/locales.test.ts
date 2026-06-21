import { describe, expect, test } from 'bun:test';
import { shellLocales, SHELL_LANGUAGES, mergeLocales } from './index';
import en from './en';

describe('shell locales', () => {
  test('ships 5 locales', () => {
    expect(Object.keys(shellLocales).sort()).toEqual(['de', 'en', 'es', 'fr', 'pt']);
  });

  test('every locale mirrors the authoritative en key set', () => {
    const enKeys = Object.keys(en).sort();
    for (const [lang, messages] of Object.entries(shellLocales)) {
      expect({ lang, keys: Object.keys(messages).sort() }).toEqual({ lang, keys: enKeys });
    }
  });

  test('SHELL_LANGUAGES covers every shipped locale', () => {
    const ids = SHELL_LANGUAGES.map((l) => l.id).sort();
    expect(ids).toEqual(Object.keys(shellLocales).sort());
  });
});

describe('mergeLocales', () => {
  test('later sources win per key and add new locales', () => {
    const merged = mergeLocales(
      { en: { a: '1', b: '2' } },
      { en: { b: 'two', c: '3' }, de: { a: 'eins' } },
    );
    expect(merged.en).toEqual({ a: '1', b: 'two', c: '3' });
    expect(merged.de).toEqual({ a: 'eins' });
  });
});
