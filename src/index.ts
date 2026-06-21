// nimiq-app-shell — the shared shell for the Nimiq app fleet.
//
// Framework-agnostic vanilla TS, for Bun + no-bundler vanilla PWAs (the chain
// apps are vanilla, not Vue). Three pieces, each independently usable:
//
//   1. Dual-mode wallet  — createWallet() auto-detects Nimiq Pay (mini-app SDK)
//      vs standalone web (Hub), behind one unified API.
//   2. i18n engine       — createI18n() with ?lang= / nimiqPay.language /
//      localStorage / navigator resolution, runtime switch, no reload.
//   3. Vanilla UI        — mountProfileWidget(), mountLanguageSwitcher().
//
// Chain READS (balance, settlement) are intentionally NOT here — that's
// nimiq-settlement. Cashlinks are NOT here either — apps mint them via
// signAndSend + their own offline codec.

// ---- wallet ----
export {
  createWallet,
  detectModeSync,
  isMiniAppHost,
  hasNimiqProvider,
  MiniAppBackend,
  HubBackend,
  type Account,
  type AccountChangeListener,
  type CreateWalletOptions,
  type CreateWalletAdvanced,
  type SendArgs,
  type SendResult,
  type Wallet,
  type WalletMode,
  type WalletBackend,
  type MiniAppProvider,
  type HubClient,
} from './wallet';

// ---- i18n ----
export {
  createI18n,
  type I18n,
  type I18nOptions,
  type Locales,
  type LocaleMessages,
  type TranslateParams,
} from './i18n';

// ---- shell strings + helpers ----
export {
  shellLocales,
  mergeLocales,
  SHELL_LANGUAGES,
  type ShellLanguage,
} from './locales';

// ---- vanilla UI ----
export {
  mountProfileWidget,
  type ProfileWidgetOptions,
  type ProfileWidgetHandle,
} from './ui/profile';
export {
  mountLanguageSwitcher,
  type LanguageSwitcherOptions,
  type LanguageSwitcherHandle,
} from './ui/language-switcher';
