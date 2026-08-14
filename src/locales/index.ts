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
import hi from './hi';
import zh from './zh';
import tr from './tr';
import ko from './ko';
import vi from './vi';
import ha from './ha';
import tl from './tl';
import id from './id';
import type { Locales } from '../i18n';

/** UI strings for every language the mini wallet OFFERS, not just the five it
 *  started with.
 *
 *  Until v0.17.0 this shipped en/de/es/fr/pt while the picker offered eleven, so
 *  choosing Mandarin, Korean, Vietnamese, Hindi, Turkish or Hausa changed the
 *  flag and nothing else: the whole wallet stayed in English. Offering a
 *  language that does nothing is worse than not offering it.
 *
 *  The six added here are MACHINE-ASSISTED and have not been reviewed by native
 *  speakers. That is a real caveat and it is written down rather than implied,
 *  but an unreviewed translation beats a language that visibly does nothing.
 *  `shell.networkOnly` is the one to review first: it is the wrong-chain warning,
 *  and it is the only string here where a bad translation costs money. */
export const shellLocales: Locales = { en, de, es, fr, pt, hi, zh, tr, ko, vi, ha, tl, id };

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

/** The fleet's curated "featured" language set (11), in Andjroo's intentional
 *  order (mirrors nimiq.tech). The shell only ships UI strings for 5 of these;
 *  the rest fall back to English for an app's own chrome, but the visitor's pick
 *  still propagates to every app via ?lang=, so offering them is correct. Apps
 *  that want the full picker pass this to mountLanguagePill / mountLanguageSwitcher.
 *  Flag codes resolve to the bundled flag-hex artwork (no per-flag fit needed
 *  here — the renderer looks up FLAG_FIT by flag code). */
export const FEATURED_LANGUAGES: ShellLanguage[] = [
  { id: 'en', name: 'English', flag: 'us' },
  { id: 'es', name: 'Spanish', flag: 'mx' },
  { id: 'de', name: 'German', flag: 'de' },
  { id: 'hi', name: 'Hindi', flag: 'in' },
  { id: 'zh', name: 'Mandarin Chinese', flag: 'cn' },
  { id: 'fr', name: 'French', flag: 'fr' },
  { id: 'tr', name: 'Turkish', flag: 'tr' },
  { id: 'ha', name: 'Hausa', flag: 'ng' },
  { id: 'ko', name: 'Korean', flag: 'kr' },
  { id: 'pt', name: 'Portuguese', flag: 'br' },
  { id: 'vi', name: 'Vietnamese', flag: 'vn' },
  // Added 2026-08-14 from Andrew's own crypto-ownership data (nimiq.blog):
  // the Philippines (16.8m owners) and Indonesia (13.1m) are top-ten crypto
  // markets that the picker did not speak to. Takes coverage of the top ten
  // from six languages to eight. Pakistan and Iran are the remaining two and
  // need Urdu and Persian, which are right-to-left and therefore layout work
  // rather than translation work.
  { id: 'tl', name: 'Filipino', flag: 'ph' },
  { id: 'id', name: 'Indonesian', flag: 'id' },
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
