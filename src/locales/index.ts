// The shell's own UI strings, bundled in 5 locales. en is authoritative; the
// rest mirror its keys. Apps spread `shellLocales` into createI18n and merge
// their app strings on top:
//
//   import { shellLocales } from 'nimiq-app-shell';
//   const i18n = createI18n({
//     locales: mergeLocales(shellLocales, myAppLocales),
//     fallback: 'en',
//   });

import en from './en';
import de from './de';
import es from './es';
import fr from './fr';
import pt from './pt';
import type { Locales } from '../i18n';

export const shellLocales: Locales = { en, de, es, fr, pt };

export { en, de, es, fr, pt };

/** The languages the shell ships strings for, in display order. id is ISO
 *  639-1; flag is a flag-icons country code (matches nimiq.tech's convention). */
export interface ShellLanguage {
  id: string;
  name: string;
  flag: string;
}

export const SHELL_LANGUAGES: ShellLanguage[] = [
  { id: 'en', name: 'English', flag: 'us' },
  { id: 'es', name: 'Spanish', flag: 'mx' },
  { id: 'de', name: 'German', flag: 'de' },
  { id: 'fr', name: 'French', flag: 'fr' },
  { id: 'pt', name: 'Portuguese', flag: 'br' },
];

/** Deep-merge locale maps: later sources win per-key, per-locale. Locales only
 *  present in a later source are added wholesale. */
export function mergeLocales(...sources: Locales[]): Locales {
  const out: Locales = {};
  for (const src of sources) {
    for (const [lang, messages] of Object.entries(src)) {
      out[lang] = { ...(out[lang] ?? {}), ...messages };
    }
  }
  return out;
}
