// A tiny, zero-dependency i18n engine — the vanilla re-implementation of the
// idea behind nimiq.tech's vue-i18n setup (no vue-i18n here).
//
// Language resolution priority on init:
//   1. ?lang= URL param          (deep-link / nimiq.life handoff)
//   2. window.nimiqPay?.language (the Nimiq Pay host's chosen language)
//   3. localStorage              (the visitor's last explicit choice)
//   4. navigator.language        (split on '-', e.g. "pt-BR" → "pt")
//   5. fallback (default 'en')
//
// The chosen language is persisted to localStorage and mirrored to
// document.documentElement.lang. setLanguage switches at runtime and emits
// onChange — no reload. Unknown keys fall back to the fallback locale, then to
// the key itself.

export type LocaleMessages = Record<string, string>;
export type Locales = Record<string, LocaleMessages>;

export interface I18nOptions {
  /** Message sets keyed by language id (e.g. { en: {...}, de: {...} }). */
  locales: Locales;
  /** The authoritative locale used when a key is missing. Default 'en'. */
  fallback?: string;
  /** localStorage key for the persisted choice. Default 'nimiq-app-lang'. */
  storageKey?: string;
  /**
   * Override the initial language resolution (skips the URL/host/storage/nav
   * chain). Mainly for tests and SSR.
   */
  initial?: string;
}

export type TranslateParams = Record<string, string | number>;

export interface I18n {
  /** Translate a key, interpolating {name}-style params. */
  t(key: string, params?: TranslateParams): string;
  /** Switch language at runtime: persist, set <html lang>, emit onChange. */
  setLanguage(id: string): void;
  /** The current language id. */
  getLanguage(): string;
  /** The language ids that have a message set. */
  availableLanguages(): string[];
  /** Subscribe to language changes. Returns an unsubscribe function. */
  onChange(cb: (id: string) => void): () => void;
}

const DEFAULT_STORAGE_KEY = 'nimiq-app-lang';

function readUrlLang(): string | null {
  if (typeof window === 'undefined' || !window.location) return null;
  try {
    const v = new URLSearchParams(window.location.search).get('lang');
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

function readHostLang(): string | null {
  if (typeof window === 'undefined') return null;
  const v = window.nimiqPay?.language;
  return v && v.trim() ? v.trim() : null;
}

function readStoredLang(key: string): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const v = localStorage.getItem(key);
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

function readNavLang(): string | null {
  if (typeof navigator === 'undefined') return null;
  const v = navigator.language;
  if (!v) return null;
  const base = v.split('-')[0];
  return base && base.trim() ? base.trim() : null;
}

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

export function createI18n(options: I18nOptions): I18n {
  const locales = options.locales;
  const fallback = options.fallback ?? 'en';
  const storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
  const listeners = new Set<(id: string) => void>();

  const available = Object.keys(locales);
  const has = (id: string | null): id is string => !!id && id in locales;

  /** Resolve a requested id to one we actually have a message set for. We keep
   *  the *requested* id as the active language (so <html lang> reflects the real
   *  choice), but translation reads from the resolved message set. */
  function resolveMessages(id: string): LocaleMessages {
    if (has(id)) return locales[id]!;
    if (has(fallback)) return locales[fallback]!;
    return {};
  }

  function pickInitial(): string {
    if (options.initial && options.initial.trim()) return options.initial.trim();
    const candidates = [readUrlLang(), readHostLang(), readStoredLang(storageKey), readNavLang()];
    for (const c of candidates) {
      if (has(c)) return c;
    }
    return fallback;
  }

  let current = pickInitial();

  function applyDomLang(id: string): void {
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = id;
    }
  }

  function persist(id: string): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(storageKey, id);
    } catch {
      // private mode / quota — non-fatal
    }
  }

  // Mirror the boot choice into the DOM (and persist it so a fresh ?lang= or
  // host-language pick survives the next plain visit).
  applyDomLang(current);
  persist(current);

  return {
    t(key: string, params?: TranslateParams): string {
      const messages = resolveMessages(current);
      let value = messages[key];
      if (value == null && has(fallback)) value = locales[fallback]![key];
      if (value == null) return interpolate(key, params);
      return interpolate(value, params);
    },
    setLanguage(id: string): void {
      const next = id.trim();
      if (!next || next === current) {
        // still re-affirm DOM/storage on a no-op set of the same id
        applyDomLang(current);
        persist(current);
        return;
      }
      current = next;
      persist(next);
      applyDomLang(next);
      for (const cb of listeners) cb(next);
    },
    getLanguage(): string {
      return current;
    },
    availableLanguages(): string[] {
      return [...available];
    },
    onChange(cb: (id: string) => void): () => void {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}
