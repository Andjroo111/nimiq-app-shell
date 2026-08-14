import { describe, expect, test } from 'bun:test';
import { shellLocales, SHELL_LANGUAGES, FEATURED_LANGUAGES, mergeLocales } from './index';
import en from './en';

describe('shell locales', () => {
  test('ships a locale for all 11 offered languages', () => {
    expect(Object.keys(shellLocales).sort())
      .toEqual(['de', 'en', 'es', 'fr', 'ha', 'hi', 'ko', 'pt', 'tr', 'vi', 'zh']);
  });

  test('every locale mirrors the authoritative en key set', () => {
    const enKeys = Object.keys(en).sort();
    for (const [lang, messages] of Object.entries(shellLocales)) {
      expect({ lang, keys: Object.keys(messages).sort() }).toEqual({ lang, keys: enKeys });
    }
  });

  // THE point of v0.17.0. The picker offers FEATURED_LANGUAGES, so a language
  // in that list without strings changes the flag and nothing else, which is
  // how Mandarin, Korean, Vietnamese, Hindi, Turkish and Hausa silently did
  // nothing for eleven versions.
  test('every language the picker OFFERS has strings to show', () => {
    for (const lang of FEATURED_LANGUAGES) {
      expect(shellLocales[lang.id], `${lang.id} (${lang.name}) has no shell strings`)
        .toBeDefined();
    }
  });

  test('SHELL_LANGUAGES is a subset of what ships', () => {
    for (const lang of SHELL_LANGUAGES) {
      expect(shellLocales[lang.id], lang.id).toBeDefined();
    }
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
