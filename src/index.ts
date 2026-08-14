// nimiq-app-shell — the shared shell for the Nimiq app fleet.
//
// Framework-agnostic vanilla TS, for Bun + no-bundler vanilla PWAs (the chain
// apps are vanilla, not Vue). Three pieces, each independently usable:
//
//   1. Dual-mode wallet  — createWallet() auto-detects Nimiq Pay (mini-app SDK)
//      vs standalone web (Hub), behind one unified API.
//   2. nim-format        — fmtNim()/fmtFiat()/parseNim(): the fleet-canonical
//      luna/NIM formatter (registry amount-component semantics).
//   3. i18n engine       — createI18n() with ?lang= / nimiqPay.language /
//      localStorage / navigator resolution, runtime switch, no reload.
//   4. Vanilla UI        — mountProfileWidget(), mountLanguageSwitcher().
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
  type SignMessageResult,
  type Wallet,
  type WalletMode,
  type WalletBackend,
  type MiniAppProvider,
  type HubClient,
} from './wallet';

// ---- nim-format ----
export {
  LUNA_PER_NIM,
  NIM_DECIMALS,
  fmtNim,
  fmtUnits,
  fmtFiat,
  lunaToNim,
  nimToLuna,
  parseNim,
  type FmtNimOptions,
} from './format/nim';

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
  FEATURED_LANGUAGES,
  type ShellLanguage,
} from './locales';

// ---- flags (the fleet-standard flag-hex: inlined artwork + per-flag fit) ----
export { FLAG_SVG, flagDataUrl } from './flags/data';
export { FLAG_FIT, type FlagFit } from './flags/fit';
export { buildFlagHex, type FlagHexOptions } from './ui/flag-hex';

// ---- chart geometry (SVG path maths; no data, no colours, no markup) ----
export {
  areaPaths,
  type AreaPaths,
  type AreaPathsOptions,
  donutArcs,
  type DonutArc,
  donutPoint,
} from './ui/chart-geometry';

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
export {
  mountLanguagePill,
  type LanguagePillOptions,
  type LanguagePillHandle,
} from './ui/language-pill';
export {
  mountWalletPill,
  type WalletPillOptions,
  type WalletPillHandle,
} from './ui/wallet-pill';
// The mini wallet: the fleet's ONE header control. `mountCornerControl` and the
// CornerControl* types are the original names, kept as aliases so a version
// bump never costs an app an edit.
export {
  mountMiniWallet,
  mountCornerControl,
  type CornerControlOptions,
  type CornerControlOptions as MiniWalletOptions,
  type CornerControlHandle,
  type CornerControlHandle as MiniWalletHandle,
  type ShellContact,
  addressGrid,
  menuShift,
} from './ui/corner-control';
// The corner mounts this itself from `assets`; exported for hosts that want the
// balance stack on a page of their own (a wallet screen, a funding view).
export {
  mountAssetList,
  type ShellAsset,
  type AssetListOptions,
  type AssetListHandle,
} from './ui/asset-list';
// The corner's Report a bug row wires itself from `reportBug`; these are for
// hosts that want the sheet from their own entry point, or the validator alone.
export {
  openReportBugSheet,
  validateFeedbackInput,
  submitFeedback,
  submitToBot,
  scrubAddresses,
  collectDiagnostics,
  type ReportBugOptions,
  type ReportBugBot,
  type ReportBugType,
  type FeedbackInput,
  type SubmitFeedbackResult,
} from './ui/report-bug';
export {
  installReportCapture,
  pageContext,
  type PageContext,
} from './ui/report-capture';
