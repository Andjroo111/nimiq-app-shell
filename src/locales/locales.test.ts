import { describe, expect, test } from 'bun:test';
import { shellLocales, SHELL_LANGUAGES, FEATURED_LANGUAGES, mergeLocales } from './index';
import en from './en';

describe('shell locales', () => {
  test('ships a locale for all 13 offered languages', () => {
    expect(Object.keys(shellLocales).sort())
      .toEqual(['de', 'en', 'es', 'fr', 'ha', 'hi', 'id', 'ko', 'pt', 'tl', 'tr', 'vi', 'zh']);
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

// A value left byte-identical to English is how nimiq.tl shipped the word
// "Address" untranslated for eleven versions: every key was PRESENT, so the
// key-parity test above passed while the string did nothing. Presence is not
// translation.
//
// Some cognates are legitimately identical (French "Type", Indonesian "Bug"),
// so they are named here one by one. Naming them is the point: a new identical
// value has to be argued for in this list rather than slipping in silently.
describe('locale values are actually translated', () => {
  const LEGITIMATE_COGNATES = new Set([
    'es:shell.fbIdea',      // "Idea" is Spanish
    'fr:shell.fbType',      // "Type" is French
    'fr:shell.fbBug',       // French UI borrows "bug"
    'fr:shell.fbQuestion',  // "Question" is French
    'id:shell.fbBug',       // Indonesian borrows "bug"
    'tl:shell.fbBug',       // Filipino borrows "bug"
    // Filipino's tech register borrows these three wholesale, the way the
    // Filipino Facebook and Google interfaces do. "Adres" is different and IS
    // translated: it is an established loanword the Hub's own fil.po uses.
    // Coining "Akawnt" or "Propayl" to satisfy this test would read worse than
    // the borrowed word, which is the opposite of the point.
    'tl:shell.profile',
    'tl:shell.account',
    'tl:shell.network',
  ]);

  const en = shellLocales.en as Record<string, string>;

  test('no locale silently ships the English string', () => {
    const offenders: string[] = [];
    for (const [loc, messages] of Object.entries(shellLocales)) {
      if (loc === 'en') continue;
      for (const [key, value] of Object.entries(messages as Record<string, string>)) {
        if (value !== en[key]) continue;
        if (LEGITIMATE_COGNATES.has(`${loc}:${key}`)) continue;
        offenders.push(`${loc}:${key} = "${value}"`);
      }
    }
    expect(offenders, `untranslated: ${offenders.join(', ')}`).toEqual([]);
  });

  // The menu card is a fixed 272px. A label several times the English length
  // is how a section heading starts wrapping into two lines nobody designed.
  test('no label runs far longer than its English source', () => {
    const tooLong: string[] = [];
    for (const [loc, messages] of Object.entries(shellLocales)) {
      if (loc === 'en') continue;
      for (const [key, value] of Object.entries(messages as Record<string, string>)) {
        const source = en[key];
        if (!source || source.length > 30) continue; // long sentences are allowed to be long
        if (value.length > source.length * 2.2 && value.length > 24) {
          tooLong.push(`${loc}:${key} ${value.length} vs ${source.length}`);
        }
      }
    }
    expect(tooLong, `overlong: ${tooLong.join(', ')}`).toEqual([]);
  });
});
