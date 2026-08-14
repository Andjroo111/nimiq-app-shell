// Corner control — the fleet's ONE header corner button (locked with Andjroo
// 2026-07-23; reference: nimiq-branding-cli registry/components/corner-control).
//
// The face shows wallet state (outline "Connect wallet ▾" → identicon + short
// label ▾); everything else lives one click away in a single menu: mini-wallet
// block (identicon, tap-to-rename name, NIM-bold-over-fiat-gray balance),
// wallet-verbatim action bar (Receive quiet left ↓ / Send light-blue right ↑ /
// bare QR-scan glyph), the address hidden BEHIND Receive (QR + 3×3 tap-to-copy
// grid with the wallet Copyable's blue-holds-until-blur states), Language and
// "Show amounts in" as collapsed value rows expanding into flag-hex card grids,
// an opt-in "Create a Cashlink" row, "Open in Nimiq Pay", a network row ONLY on
// testnet, and a quiet Disconnect. Inside Nimiq Pay (wallet.mode === 'miniapp')
// the wallet is ambient: the face collapses to the current-language flag and the
// menu keeps only the language picker.
//
// Production seams are OPTIONAL and unwired rows simply don't render (no dead
// buttons): send/scan/createCashlink/onboard/onRename/getBalanceLuna/fiat/qr.
// NOTE (verified vs @nimiq/hub-api): HubApi.rename requires an accountId that
// chooseAddress never returns, so ecosystem-wide rename must come from the host
// (e.g. an app holding accountIds via Hub list()) — that is WHY onRename is a
// seam and the name is plain text without it. createCashlink needs only appName,
// so hosts can wire it directly. Disconnect is always the LOCAL forget
// (wallet.disconnect()) — never Hub logout.

import type { I18n } from '../i18n';
import type { Wallet } from '../wallet';
import { FEATURED_LANGUAGES, type ShellLanguage } from '../locales';
import { buildFlagHex } from './flag-hex';
import { fmtNim, fmtFiat, lunaToNim, nimToLuna } from '../format/nim';
import { BUG_ICON, openReportBugSheet, type ReportBugOptions } from './report-bug';
import { installReportCapture } from './report-capture';
import { mountAssetList, type AssetListHandle, type ShellAsset } from './asset-list';
import { applyTheme, type ShellTheme } from './theme';
import { nimiqQr } from './qr';
import { formatAddressBlocks, reformatInPlace, significantChars } from './address-input';

/** A NIM address: NQ + 2 check digits + 32 base32 chars. */
const NIM_ADDRESS_SHAPE = /^NQ[0-9]{2}[0-9A-HJ-NP-VXY]{32}$/;

/** Split an address into the cells of the wallet's address block.
 *
 *  Ported from the nq registry `address-display`, whose two formats agree on
 *  one thing that is easy to miss: **the block is always THREE ROWS**. NIM is
 *  nine four-character chunks in three columns; Ethereum is three fourteen-
 *  character chunks in one. Keeping the row count constant is what makes a NIM
 *  address and a Polygon one read as siblings and occupy the same height.
 *
 *    NIM, 36 chars  ->  9 cells of 4      ->  3 columns
 *    EVM, 42 chars  ->  3 cells of 14     ->  1 column   (upstream, verbatim)
 *    legacy, 34     ->  3 cells of 12/11  ->  1 column
 *    bech32m, 62    ->  3 cells of 21/20  ->  1 column
 *
 *  UPSTREAM BUG NOT PORTED: the registry does `address.match(/.{14}/g)`, which
 *  returns only whole 14-character groups and silently DROPS the tail. A
 *  34-character legacy BTC address renders as 28 characters, truncated, and
 *  looks perfectly tidy while doing it. For a string people paste money into
 *  that is not a rounding error. Rows here are near-equal thirds instead, so
 *  every character survives at any length. */
/** How far to shift a right-anchored menu so it clears the viewport's left edge,
 *  in CSS `right` pixels: 0 to leave it alone, negative to move it right.
 *
 *  Split out from the DOM because `getBoundingClientRect` is the only part that
 *  needs a browser, and the arithmetic is the part that can be wrong. Never
 *  shifts further than the room on the right, so pulling a card away from one
 *  edge cannot push it off the other. */
export function menuShift(left: number, right: number, viewportWidth: number, gutter = 8): number {
  const overLeft = gutter - left;
  if (overLeft <= 0) return 0;
  const roomRight = viewportWidth - gutter - right;
  const shift = Math.min(overLeft, Math.max(0, roomRight));
  return shift > 0 ? -Math.round(shift) : 0;
}

export function addressGrid(address: string): { cells: string[]; columns: number } {
  const compact = address.replace(/\s+/g, '');
  if (!compact) return { cells: [], columns: 1 };

  // NIM keeps its own four-character rhythm, which is the format the wallet
  // shows and the one people read their own address in.
  if (NIM_ADDRESS_SHAPE.test(compact.toUpperCase())) {
    return { cells: compact.match(/.{4}/g) ?? [compact], columns: 3 };
  }

  // Everything else: three rows, near-equal, one cell each.
  const n = compact.length;
  const base = Math.floor(n / 3);
  const wide = n % 3;
  const cells: string[] = [];
  let at = 0;
  for (let i = 0; i < 3; i += 1) {
    const size = base + (i < wide ? 1 : 0);
    if (size === 0) continue; // an address shorter than three characters
    cells.push(compact.slice(at, at + size));
    at += size;
  }
  return { cells, columns: 1 };
}

/** One saved recipient. The host owns the list and its storage. */
export interface ShellContact {
  /** What the person is called. This is what the chip shows. */
  label: string;
  /** The address to fill in. Shown on hover so a name never hides what it means. */
  address: string;
  /** Scope the entry to one asset's chain. Omitted means NIM.
   *
   *  Load-bearing: offering a Polygon address while sending NIM is offering a
   *  mistake, and the two address formats are close enough in a small field
   *  that a wrong pick is easy to miss. */
  asset?: string;
}

export interface CornerControlOptions {
  /** The app's wallet. OMIT IT on pages that have no wallet concept at all
   *  (a kid app on device pairing, a portal chooser): the corner then renders
   *  language-only — the flag inside the same outline pill the wallet pages
   *  wear, over the single-section menu it shows inside Nimiq Pay — instead of
   *  offering a Connect button the page can't honour. */
  wallet?: Wallet;
  i18n: I18n;
  /** Languages to offer. Default: the 11 FEATURED_LANGUAGES.
   *
   *  Eleven and not the 5 the shell ships UI strings for, because
   *  `mountLanguagePill` (the v0.2.x chrome this replaces) offered 11, and
   *  defaulting lower would silently cut every app the fleet sweep touches from
   *  eleven languages to five. nimiq.tech ships full translations for exactly
   *  these 11, so the pick is real even where the shell's own strings fall back
   *  to English. */
  languages?: ShellLanguage[];
  /** Identicon renderer for the face + wallet block (self-sized element). */
  identicon?: (address: string, sizePx: number) => HTMLElement;
  /** OVERRIDE the receive QR. Without it the mini wallet draws the wallet's own
   *  (registry `qr-code`: rounded modules, the light-blue radial), so this is a
   *  seam rather than a requirement. It was host-only until v0.20.0, which had
   *  nineteen apps about to hand-roll the one graphic here a camera must read. */
  qr?: (text: string, sizePx: number) => HTMLElement;
  /** Show the Receive flow (address + QR behind the Receive button). Default true. */
  receive?: boolean;
  /** OVERRIDE the Send button with an app-specific flow (e.g. a checkout).
   *
   *  The Send button is NOT a seam like the others: it is always present, and
   *  without this option it opens the mini wallet's own BUILT-IN send view
   *  (recipient + amount here, the wallet only for the approval, via
   *  `wallet.pay()`). That built-in view is what makes this a wallet rather
   *  than a connect button, so pass this only when the app genuinely owns the
   *  flow. Passing a no-op replaces a working send with a dead button. */
  send?: () => void;
  /** Wire the QR-scan button. Hidden when absent. */
  scan?: () => void;
  /** Wire the opt-in "Create a Cashlink" row (HubApi.createCashlink). Hidden when absent. */
  createCashlink?: () => void;
  /** Wire the signed-out "New to Nimiq? Create a wallet" line. Hidden when absent.
   *
   *  NOT `HubApi.onboard`, whatever the older docs said. `ONBOARD` is commented
   *  out of the Hub's `_3rdPartyRequestWhitelist` on purpose ("Do not allow
   *  ONBOARD because it exposes internal accountIds"), so a fleet origin calling
   *  it gets `unauthorized to call onboard`.
   *
   *  Wire it to `connect()` instead: the Hub's choose-address flow offers
   *  wallet creation to a visitor who has none, which is the same funnel by a
   *  route third parties are actually allowed to take. That is what nimiq.kids
   *  does. */
  onboard?: () => void;
  /** Tap-name-to-rename is BUILT IN: the new label persists locally per address
   *  (localStorage) and shows on the face + menu. This hook is an optional
   *  EXTRA — called with the committed label for hosts that can sync it further
   *  (see header note on why Hub rename can't be the default). */
  onRename?: (label: string) => void | Promise<void>;
  /** Balance source in luna. Without it the balance stack is hidden.
   *
   *  NIM-only by construction: one address, one chain, luna's 5 decimals. Apps
   *  that hold more than NIM pass `assets` instead (this stays for the fleet
   *  already on it, and for the Send view's available-balance cap). */
  getBalanceLuna?: (address: string) => Promise<number>;
  /** Multi-asset balances. Supersedes `getBalanceLuna`: when present the mini
   *  wallet shows a per-asset stack, and the account row's right-hand figure
   *  becomes the fiat TOTAL across them.
   *
   *  Each asset carries its OWN address and its OWN reader because the shell
   *  cannot derive one from the other: the Hub hands back a BTC and a Polygon
   *  address alongside the NIM one from a single chooseAddress, with no
   *  balances attached, and reading them means a Polygon RPC and a BTC explorer
   *  that this package has no business knowing about. Rows resolve
   *  independently, so the slowest chain does not hold up the rest.
   *
   *  Pass a function for a list that changes with app state; it is re-read on
   *  every refresh, so adding a row never means remounting the corner. */
  assets?: ShellAsset[] | (() => ShellAsset[]);
  /** Reference-currency support: offered tickers + a 1-NIM price feed. Enables
   *  the "Show amounts in" grid.
   *
   *  This does NOT require a wallet or getBalanceLuna. Which currency a person
   *  reads amounts in is a display preference, not a property of being signed
   *  in — and an app can price its own screens off it with no wallet in sight
   *  (nimiq.kids authenticates by device pairing and still shows NIM values).
   *  With a balance the menu's own balance line follows it too. */
  fiat?: {
    currencies: string[];
    /** Default ticker. Default 'USD'. */
    default?: string;
    /** Price of ONE WHOLE unit of `asset` in `ticker`, or null when unknown.
     *  Only called when a balance is being rendered; a fiat-only host may
     *  return null.
     *
     *  `asset` defaults to 'NIM' and is only ever passed when the host wired
     *  `assets`, so the existing 1-arg feeds across the fleet keep working
     *  unchanged. */
    rate: (ticker: string, asset?: string) => Promise<number | null>;
    /** Called whenever the visitor picks a different ticker, and once at mount
     *  with the restored/default one, so a host can price its own UI. */
    onChange?: (ticker: string) => void;
  };
  /** Saved recipients for the send view. Hidden when absent.
   *
   *  A HOST seam, because there is no shared address book to read: the Hub
   *  exposes no contacts API to a third-party origin and `LIST` is not
   *  whitelisted. That is fine, because the host is the only party that knows
   *  anything useful anyway (nimiq.kids knows a child by name, a POS knows the
   *  till). Storage stays entirely the host's; this package should not grow a
   *  second thing it persists.
   *
   *  `list` may be async and may throw; a failed read renders no chips rather
   *  than breaking the send view. */
  contacts?: {
    list: () => ShellContact[] | Promise<ShellContact[]>;
    /** Offer to save an unrecognised recipient after a send lands. Without it
     *  the book is read-only, which is the right default for a host that
     *  manages contacts on its own screens. */
    add?: (entry: ShellContact) => void | Promise<void>;
  };
  /** Show the "Switch account" row. Default TRUE.
   *
   *  The row calls `wallet.connect()` again, which for a real Hub wallet
   *  reopens the account picker, so it is correct with no wiring and that is
   *  why it defaults on.
   *
   *  Pass `false` when `connect()` means something other than "choose an
   *  account". Hashmark is the case: its wallet is an adapter over a betting
   *  key, and connect() means "set up betting", changing the funding address
   *  and possibly routing to onboarding. Offering that as "Switch account"
   *  describes an action the app does not have. */
  switchAccount?: boolean;
  /** 'test' renders the network row (mainnet says nothing). Default 'main'. */
  network?: 'main' | 'test';
  /** "Open in Nimiq Pay" deeplink URL (standalone web only). Hidden when
   *  absent. Pass a function for URLs that depend on late state (e.g. an auth
   *  token that must ride along) — it is called at click time. */
  openInPay?: string | (() => string);
  /** Wire the "Report a bug" row. Hidden when absent, like every other seam
   *  here, so no app grows a dead button.
   *
   *  This is the fleet's ONE bug entry point by design: the corner is already
   *  the only header control, so a reporter that added a second permanent
   *  affordance (a floating dot, say) would cost every app a piece of its
   *  screen. Object form = the shell owns the whole flow (row, sheet, POST to
   *  your endpoint); function form = the host renders its own UI.
   *
   *  Present in EVERY presentation, including language-only and inside Nimiq
   *  Pay: a bug on a wallet-less page is still a bug someone needs to report. */
  reportBug?: ReportBugOptions | (() => void);
  /** Make the control wear the HOST's brand: eleven semantic tokens (font, the
   *  Connect colour, the act colour, their two label colours, surface, text,
   *  the face pill and its text, and the three status hues), expanded into the
   *  `--nq-cc-*` set and stamped on this instance. Omit it and it is Nimiq.
   *
   *  A token reaches everything derived from it, so a dark surface also darkens
   *  the wells, hairlines, hover washes and scrollbar without naming any of
   *  them. For the one thing the tokens do not cover, set the var directly in
   *  your own CSS — they are the same mechanism, and `theme` is stamped inline
   *  so it wins where both are set. */
  theme?: ShellTheme;
  /** Inject the component's <style> once. Default true. */
  injectStyles?: boolean;
}

export interface CornerControlHandle {
  el: HTMLDivElement;
  open(): void;
  close(): void;
  destroy(): void;
  /** The ticker amounts are currently shown in, or null when no fiat feed was
   *  passed. Lets a host read the restored choice without waiting for onChange. */
  readonly fiatTicker: string | null;
}

const STYLE_ID = 'nimiq-shell-corner-control-style';
const FIAT_STORE_KEY = 'nq-shell:fiat';
const LABEL_STORE_PREFIX = 'nq-shell:label:';

function storedLabel(address: string): string | null {
  try { return localStorage.getItem(LABEL_STORE_PREFIX + address.replace(/\s+/g, '')); } catch { return null; }
}
function setStoredLabel(address: string, label: string): void {
  try { localStorage.setItem(LABEL_STORE_PREFIX + address.replace(/\s+/g, ''), label); } catch { /* ignore */ }
}

/** Native-language display names (the locked spec shows native names in the
 *  picker; SHELL_LANGUAGES carries English names for other components). */
export const NATIVE_NAMES: Record<string, string> = {
  en: 'English', es: 'Español', de: 'Deutsch', fr: 'Français', pt: 'Português',
  hi: 'हिन्दी', zh: '中文', tr: 'Türkçe', ko: '한국어', vi: 'Tiếng Việt', ha: 'Hausa',
  tl: 'Filipino', id: 'Bahasa Indonesia',
};

/** Fiat ticker → bundled flag artwork (the wallet pairs currencies with country
 *  flags; we clip them into the brand hexagon). Unknown tickers render text-only. */
export const FIAT_FLAGS: Record<string, string> = {
  AED: 'ae', ARS: 'ar', AUD: 'au', BRL: 'br', CAD: 'ca', CHF: 'ch', CLP: 'cl',
  CNY: 'cn', CRC: 'cr', CZK: 'cz', DKK: 'dk', EUR: 'eu', GBP: 'gb', GMD: 'gm',
  GTQ: 'gt', HKD: 'hk', HUF: 'hu', IDR: 'id', ILS: 'il', INR: 'in', JPY: 'jp',
  KRW: 'kr', MXN: 'mx', MYR: 'my', NGN: 'ng', NOK: 'no', NZD: 'nz', PHP: 'ph',
  PKR: 'pk', PLN: 'pl', RUB: 'ru', SEK: 'se', SGD: 'sg', THB: 'th', TRY: 'tr',
  TWD: 'tw', UAH: 'ua', USD: 'us', VND: 'vn', ZAR: 'za',
  // XOF, the West African CFA franc, is deliberately absent. It is legal tender
  // in eight countries, so any single flag would name the wrong one; it renders
  // text-only, which is the honest answer rather than a guess.
};

function ensureStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  // Ported from the registry corner-control.css (locked 2026-07-23). EVERY
  // painted value reads a --nq-cc-* var whose default is the Nimiq value it
  // replaced, so an app that sets nothing is unchanged and an app that sets a
  // brand is not fighting a hardcode. See theme.ts for the token layer above
  // these; the derived tints below are why that layer stays eleven tokens wide.
  //
  // Derivation rule: a tint is never a literal. rgba(31,35,72,.06) IS
  // #1f2348 at 6%, and #1f2348 IS the default --nq-cc-menu-fg, so it is written
  // as a color-mix of that var: identical when untouched, and it follows the
  // foreground the moment a host themes one. Same for the light-blue washes,
  // which are --nq-cc-accent at 8% and 12%.
  style.textContent = `
.nq-cc { position:relative; display:inline-block;
  font-family:var(--nq-cc-font, 'Mulish','Muli',system-ui,sans-serif); }
.nq-cc-caret { width:10px; height:6px; flex:none; color:currentColor; opacity:.6;
  transition:transform .18s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-face[aria-expanded="true"] .nq-cc-caret,
.nq-cc-face-flag[aria-expanded="true"] .nq-cc-caret { transform:rotate(180deg); }

/* face (hub mode): the fleet outline pill, both states, + the caret */
.nq-cc-face { display:inline-flex; align-items:center; gap:8px; height:40px; padding:0 14px;
  border:1px solid color-mix(in srgb, currentColor 22%, transparent); border-radius:999px;
  background:transparent; color:inherit; font:inherit; font-size:14px; font-weight:700; line-height:1; cursor:pointer;
  transition:border-color .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)), background-color .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-face:hover { border-color: color-mix(in srgb, currentColor 45%, transparent); background: color-mix(in srgb, currentColor 6%, transparent); }
.nq-cc-face:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:3px; }
/* 8px left: the identicon needs air off the pill edge (Andjroo, phone review) */
.nq-cc[data-connected] .nq-cc-face { padding:4px 12px 4px 8px; font-size:13px; }
.nq-cc-face-icon { width:28px; height:28px; flex:none; border-radius:50%; overflow:hidden; display:inline-flex; }
.nq-cc-face-icon > * { width:100%; height:100%; display:block; }
.nq-cc-face-label { white-space:nowrap; }
.nq-cc[data-connected] .nq-cc-face-label { font-family:ui-monospace,'Fira Mono',monospace; letter-spacing:.02em; }

/* face (mini-app mode): flag only, the wallet is ambient */
.nq-cc-face-flag { display:none; align-items:center; gap:7px; height:38px; padding:0 10px;
  border:none; border-radius:8px; background:none; cursor:pointer; color:inherit;
  transition:background .2s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-face-flag:hover { background: color-mix(in srgb, currentColor 8%, transparent); }
.nq-cc-face-flag:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:2px; }
.nq-cc[data-mode="miniapp"] .nq-cc-face { display:none; }
.nq-cc[data-mode="miniapp"] .nq-cc-face-flag { display:inline-flex; }

/* face (language-only): a SURFACE pill holding the flag.
   Chrome-less is a mini-app statement: inside Nimiq Pay the host wallet is the
   context, so the control recedes. A wallet-less page (the kid app, the portal
   chooser) is not that: the language control is the header's only affordance and
   has to read as a control, exactly like the langpill it replaced and like the
   pill sitting on every wallet page. Both share data-mode="miniapp" for the
   MENU gating; only the face differs, so it keys off data-face.

   It reads as a control through ELEVATION, not an outline (Andjroo, 2026-08-03:
   "remove the gray line ... around the actual white of the pill"). It used to
   carry "border:1px solid currentColor 22%", which this same file already argues
   against thirty lines down: "inputs: inset box-shadow border, never border
   (rule 1)". Nimiq separates with a hairline, whitespace, or a separate surface,
   and a raised white pill is the third.

   The surface and the FOREGROUND ship together. This pill is color:inherit
   and its caret is drawn in currentColor, so on a dark header the old
   borderless-transparent pill inherited a light caret. Painting it white without
   also pinning the text colour would hide the caret on exactly those pages. Both
   are themeable, so a host that wants a dark pill sets the pair. */
.nq-cc[data-face="lang"] .nq-cc-face-flag { height:40px; padding:0 12px;
  border:none; border-radius:999px;
  background:var(--nq-cc-face-bg, #fff);
  color:var(--nq-cc-face-fg, #1f2348);
  box-shadow:var(--nq-cc-face-shadow,
    0 2px 2.5px rgba(31,35,72,.02), 0 7px 8.5px rgba(31,35,72,.04), 0 18px 38px rgba(31,35,72,.07));
  transition:box-shadow .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)), background-color .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc[data-face="lang"] .nq-cc-face-flag:hover { background:var(--nq-cc-face-bg-hover, #fff);
  box-shadow:var(--nq-cc-face-shadow-hover,
    0 3px 3.5px rgba(31,35,72,.03), 0 9px 12px rgba(31,35,72,.06), 0 22px 46px rgba(31,35,72,.10)); }
.nq-cc[data-face="lang"] .nq-cc-face-flag:focus-visible { outline-offset:3px; }

/* menu */
/* stays a compact card hanging off the corner on EVERY viewport (Andjroo,
   mobile review 7/23: full-width phone sheet rejected, "it should just come
   out of the corner"); max-width only guards sub-300px screens */
.nq-cc-menu { position:absolute; top:calc(100% + 8px); right:var(--nq-cc-menu-shift, 0px); z-index:60; width:272px;
  max-width:calc(100vw - 24px); padding:6px;
  background:var(--nq-cc-menu-bg, #fff); border:var(--nq-cc-menu-border, none); border-radius:10px;
  box-shadow:var(--nq-cc-menu-shadow, 0 4px 28px rgba(0,0,0,.16));
  color:var(--nq-cc-menu-fg, #1f2348); text-align:left; }
.nq-cc-menu[hidden] { display:none; }
.nq-cc-divider { height:1px; margin:6px 4px; background:var(--nq-cc-menu-line, rgba(31,35,72,.08)); }
.nq-cc-section { padding:6px 4px; position:relative; }

/* signed out: navy Connect (bottom-right radial) + the quiet onboard line */
.nq-cc-connect { position:relative; width:100%; height:36px; border:none; border-radius:500px;
  display:flex; align-items:center; justify-content:center; font-family:inherit; font-size:14px;
  font-weight:700; color:var(--nq-cc-connect-fg, #fff); cursor:pointer;
  background-color:var(--nq-cc-connect-bg, #1f2348);
  background-image:var(--nq-cc-connect-image,
    radial-gradient(100% 100% at 100% 100%, #260133, #1f2348)); }
.nq-cc-connect:hover { background-image:var(--nq-cc-connect-image-hover,
  radial-gradient(100% 100% at 100% 100%, #180021, #151833)); }
.nq-cc-connect:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:2px; }
.nq-cc-connect:disabled { opacity:.7; cursor:default; }
.nq-cc-onboard { width:100%; margin-top:2px; padding:10px 4px; border:none; background:none; cursor:pointer;
  font-family:inherit; font-size:13px; font-weight:600; color:var(--nq-cc-menu-muted, rgba(31,35,72,.6));
  border-radius:6px; transition:color .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-onboard:hover { color:var(--nq-cc-accent, #0582ca); }
.nq-cc-onboard:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:2px; }

/* state gates: the driver stamps data-connected / data-mode / data-testnet */
.nq-cc[data-connected] .nq-cc-when-out { display:none; }
.nq-cc:not([data-connected]) .nq-cc-when-connected { display:none; }
.nq-cc[data-mode="miniapp"] .nq-cc-when-hub { display:none; }

/* mini wallet block */
.nq-cc-wallet { padding:10px 8px 8px; }
.nq-cc-account { display:flex; align-items:center; gap:10px; }
.nq-cc-identicon { display:block; flex:none; width:40px; height:40px; }
.nq-cc-identicon > * { width:100%; height:100%; display:block; }
.nq-cc-name { font-size:14px; font-weight:600; min-width:0; overflow:hidden; text-overflow:ellipsis;
  white-space:nowrap; border:none; background:none; font-family:inherit; color:inherit; text-align:left;
  padding:9px 6px; margin:-6px 0 -6px -6px; border-radius:6px;
  transition:background .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
button.nq-cc-name { cursor:pointer; }
button.nq-cc-name:hover { background:var(--nq-cc-menu-hover, rgba(31,35,72,.06)); }
button.nq-cc-name:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:-2px; }
.nq-cc-name-input { width:100%; min-width:0; border:none; border-radius:6px; padding:2px 4px;
  font-family:inherit; font-size:14px; font-weight:600;
  color:var(--nq-cc-input-fg, var(--nq-cc-menu-fg, #1f2348));
  background:var(--nq-cc-input-bg, var(--nq-cc-card-bg, #fff));
  box-shadow:inset 0 0 0 2px color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 10%, transparent); }
.nq-cc-name-input:focus { outline:none;
  box-shadow:inset 0 0 0 2px var(--nq-cc-accent, #0582ca); }
.nq-cc-balance { margin-left:auto; display:flex; flex-direction:column; align-items:flex-end; gap:1px; flex:none; }
.nq-cc-balance[hidden] { display:none; }
.nq-cc-balance-nim { font-size:13px; font-weight:700; color:var(--nq-cc-menu-fg, #1f2348); }
.nq-cc-balance-fiat { font-size:12px; font-weight:600; color:var(--nq-cc-menu-muted, rgba(31,35,72,.5)); }

/* action bar = the wallet's MobileActionBar verbatim: Receive quiet LEFT ↓,
   Send light-blue RIGHT ↑, bare scan glyph at .4 opacity */
.nq-cc-actions { display:flex; align-items:center; gap:6px; margin-top:8px; position:relative; }
.nq-cc-receive { flex:1; display:inline-flex; align-items:center; justify-content:center; gap:7px; height:32px;
  border:none; border-radius:500px; background:var(--nq-cc-menu-hover, rgba(31,35,72,.07)); font-family:inherit;
  font-size:13px; font-weight:700; color:var(--nq-cc-menu-fg, #1f2348); cursor:pointer;
  transition:background .2s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-receive:hover, .nq-cc-receive:focus-visible {
  background:color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 12%, transparent); }
.nq-cc-receive:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:2px; }
.nq-cc-send { flex:1; display:inline-flex; align-items:center; justify-content:center; gap:7px; height:32px;
  border:none; border-radius:500px; cursor:pointer; font-family:inherit; font-size:13px; font-weight:700;
  color:var(--nq-cc-send-fg, #fff); background-color:var(--nq-cc-send-bg, #0582ca);
  background-image:var(--nq-cc-send-image,
    radial-gradient(100% 100% at 100% 100%, #265dd7, #0582ca)); }
.nq-cc-send:hover { background-image:var(--nq-cc-send-image-hover,
  radial-gradient(100% 100% at 100% 100%, #1f4fbc, #0473b3)); }
.nq-cc-send:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:3px; }
.nq-cc-arrow-up { transform:rotate(-90deg); width:11px; height:8px; }
.nq-cc-arrow-down { transform:rotate(90deg); width:11px; height:8px; }
.nq-cc-scan { flex:none; padding:4px; border:none; background:none; cursor:pointer; color:var(--nq-cc-menu-fg, #1f2348);
  opacity:.4; border-radius:6px; transition:opacity .2s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-scan:hover, .nq-cc-scan:focus-visible { opacity:.7; }
.nq-cc-scan:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:1px; }
.nq-cc-scan-glyph { display:block; width:24px; height:24px; }

/* receive view: the address lives BEHIND Receive, like the wallet */
.nq-cc-view-receive { display:none; }
.nq-cc.nq-cc-show-receive .nq-cc-view-main { display:none; }
.nq-cc.nq-cc-show-receive .nq-cc-view-receive { display:block; }

/* send view: the mini-wallet send: recipient + amount here, the user's own
   wallet only appears for the approval (Hub checkout / Nimiq Pay confirm) */
.nq-cc-view-send { display:none; }
.nq-cc.nq-cc-show-send .nq-cc-view-main { display:none; }
.nq-cc.nq-cc-show-send .nq-cc-view-send { display:block; }
.nq-cc-send-body { display:flex; flex-direction:column; gap:8px; padding:10px 8px 8px; }
.nq-cc-field-label { font-size:12px; font-weight:600; color:var(--nq-cc-menu-muted, rgba(31,35,72,.5)); }
/* The recipient identicon leads the row, the label follows it, which is the
   order of an avatar beside a name everywhere else. The slot keeps its width
   whether or not a face is in it, so the label never jumps sideways at the
   moment the address becomes valid. */
.nq-cc-field-head { display:flex; align-items:center; gap:9px; min-height:36px; }
.nq-cc-recipient-icon { display:block; width:36px; height:36px; flex:none; }
.nq-cc-recipient-icon > * { display:block; width:100%; height:100%; }

/* Recipient: nine four-char blocks in a 3x3 grid, the wallet's send-modal field
   scaled to this menu. One textarea holding a 14-character line per row
   ("XXXX XXXX XXXX"), so the blocks sit at fixed FRACTIONS of the line in any
   monospace font. Everything below is in ch for that reason: a px or rem
   geometry drifts the moment Fira Mono is missing and the fallback's advance
   differs, which is the documented cause of address grids looking wonky.

   Inset box-shadow for the border, never border (rule 1). */
.nq-cc-addr-field { position:relative; border-radius:8px; padding:7px 0;
  background:var(--nq-cc-input-bg, var(--nq-cc-card-bg, #fff));
  box-shadow:inset 0 0 0 2px color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 12%, transparent);
  transition:box-shadow .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-addr-field:focus-within { box-shadow:inset 0 0 0 2px var(--nq-cc-accent, #0582ca); }
/* A formatted line is 14 characters plus two block gaps. The gap is
   WORD-SPACING rather than a bigger font or letter-spacing, because the
   reference is tight four-character blocks separated by air: widening the
   letters would space the characters inside a block too, and the four
   characters of a block read as one unit. */
.nq-cc-addr-input { display:block; margin:0 auto; padding:0; border:none;
  --nq-cc-addr-gap:4.9ch;
  width:calc(14ch + 2 * var(--nq-cc-addr-gap));
  word-spacing:var(--nq-cc-addr-gap);
  outline:none; resize:none; overflow:hidden; background:transparent;
  font-family:'Fira Mono',ui-monospace,monospace; font-size:14px; line-height:26px;
  text-transform:uppercase; text-align:center;
  color:var(--nq-cc-input-fg, var(--nq-cc-menu-fg, #1f2348)); }
.nq-cc-addr-input::placeholder { opacity:.32; }
/* The separators, drawn on ONE element behind the text so the textarea keeps a
   single caret and a single selection.

   The column rules sit in the two gaps between blocks, at characters 4.5 and
   9.5 of the 14-character line, which is 2.5ch either side of centre. This
   element must carry the same font as the textarea, or its ch unit is Mulish's
   and the rules land in the middle of the text.
   NOTE: this block is a JS template literal, so it must never contain a
   backtick. Writing ch in code quotes here is what broke the build once. */
.nq-cc-addr-rules { position:absolute; inset:7px 0; pointer-events:none;
  font-family:'Fira Mono',ui-monospace,monospace; font-size:14px;
  --nq-cc-addr-rule:color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 10%, transparent);
  --nq-cc-addr-gap:4.9ch;
  /* Block 1 ends at char 4 and block 2 starts at char 5 plus the gap, so the
     gap centre is 2.5ch + half a gap either side of the line's centre. Derived
     rather than eyeballed, so changing the gap moves the rules with it. */
  --nq-cc-addr-rule-x:calc(2.5ch + var(--nq-cc-addr-gap) / 2);
  background:
    linear-gradient(var(--nq-cc-addr-rule), var(--nq-cc-addr-rule)) calc(50% - var(--nq-cc-addr-rule-x)) 50%/1px 100% no-repeat,
    linear-gradient(var(--nq-cc-addr-rule), var(--nq-cc-addr-rule)) calc(50% + var(--nq-cc-addr-rule-x)) 50%/1px 100% no-repeat,
    linear-gradient(var(--nq-cc-addr-rule), var(--nq-cc-addr-rule)) 50% 33.333%/calc(100% - 20px) 1px no-repeat,
    linear-gradient(var(--nq-cc-addr-rule), var(--nq-cc-addr-rule)) 50% 66.667%/calc(100% - 20px) 1px no-repeat; }
/* inputs: inset box-shadow border, never border (rule 1) */
.nq-cc-input { width:100%; border:none; border-radius:8px; padding:9px 10px; font-family:inherit;
  font-size:14px; font-weight:600;
  color:var(--nq-cc-input-fg, var(--nq-cc-menu-fg, #1f2348));
  background:var(--nq-cc-input-bg, var(--nq-cc-card-bg, #fff));
  box-shadow:inset 0 0 0 2px color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 12%, transparent); }
.nq-cc-input:focus { outline:none; box-shadow:inset 0 0 0 2px var(--nq-cc-accent, #0582ca); }
.nq-cc-input::placeholder { font-weight:600;
  color:color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 30%, transparent); }
.nq-cc-amount-row { position:relative; }
.nq-cc-amount-row .nq-cc-input { padding-right:44px; }
.nq-cc-amount-suffix { position:absolute; right:11px; top:50%; transform:translateY(-50%);
  font-size:13px; font-weight:700; pointer-events:none;
  color:color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 45%, transparent); }
.nq-cc-send-hint { font-size:12px; font-weight:600; color:var(--nq-cc-menu-muted, rgba(31,35,72,.5)); }
.nq-cc-send-hint:empty { display:none; }
.nq-cc-send-confirm { width:100%; height:36px; border:none; border-radius:500px; margin-top:2px;
  font-family:inherit; font-size:14px; font-weight:700; cursor:pointer;
  color:var(--nq-cc-send-fg, #fff); background-color:var(--nq-cc-send-bg, #0582ca);
  background-image:var(--nq-cc-send-image,
    radial-gradient(100% 100% at 100% 100%, #265dd7, #0582ca)); }
.nq-cc-send-confirm:hover:not(:disabled) { background-image:var(--nq-cc-send-image-hover,
  radial-gradient(100% 100% at 100% 100%, #1f4fbc, #0473b3)); }
.nq-cc-send-confirm:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:3px; }
.nq-cc-send-confirm:disabled { opacity:.4; cursor:default; }
.nq-cc-send-error { font-size:12px; font-weight:600; text-align:center;
  color:var(--nq-cc-danger, #d94432); }
.nq-cc-send-error:empty { display:none; }
.nq-cc-send-done { display:none; flex-direction:column; align-items:center; gap:6px;
  padding:16px 0 10px; color:var(--nq-cc-success, #13b59d); font-size:14px; font-weight:700; }
.nq-cc-view-send.nq-cc-sent .nq-cc-send-body { display:none; }
.nq-cc-view-send.nq-cc-sent .nq-cc-send-done { display:flex; }
/* Sub-view header: back chevron left, the view's name CENTRED in the card.
   Three columns and not a flex row, so the title is centred on the menu rather
   than on whatever is left over beside the button. The third column is the
   chevron's width again, holding the symmetry. */
.nq-cc-view-head { display:grid; grid-template-columns:34px 1fr 34px; align-items:center;
  padding:2px 2px 0; }
.nq-cc-view-title { grid-column:2; text-align:center; font-size:15px; font-weight:600;
  color:var(--nq-cc-menu-fg, #1f2348); }
.nq-cc-back { grid-column:1; display:inline-flex; align-items:center; justify-content:center;
  width:34px; height:34px; padding:0; border:none; border-radius:50%; background:none;
  font-family:inherit; color:var(--nq-cc-menu-muted, rgba(31,35,72,.6)); cursor:pointer;
  transition:background .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-back:hover { background:var(--nq-cc-menu-hover, rgba(31,35,72,.06)); }
.nq-cc-back:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:-2px; }
.nq-cc-chevron { display:block; width:8px; height:13px; }
.nq-cc-receive-body { display:flex; flex-direction:column; align-items:center; padding:10px 8px 8px; }
.nq-cc-qr { display:block; padding:10px; border-radius:8px;
  background:var(--nq-cc-qr-plate, #fff); }
.nq-cc-qr:empty { display:none; padding:0; }
.nq-cc-qr > * { display:block; width:164px; height:164px; }
.nq-cc-receive-hint { font-size:12px; font-weight:600; color:var(--nq-cc-menu-muted, rgba(31,35,72,.45)); margin:8px 0 2px; }

/* tap-to-copy address: upstream Copyable verbatim: light-blue tooltip, tinted
   field, and the blue HOLDS after copy until focus leaves */
.nq-cc-copy-wrap { position:relative; display:block; margin-top:10px; width:100%; }
.nq-cc-address { display:grid; grid-template-columns:repeat(var(--nq-cc-addr-cols, 3), 1fr); gap:3px 0; justify-items:center;
  width:100%; padding:8px 6px; border:none; border-radius:6px; cursor:pointer;
  background:color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 4%, transparent);
  font-family:'Fira Mono',ui-monospace,monospace; font-size:12px; color:var(--nq-cc-menu-muted, rgba(31,35,72,.7));
  transition:background .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)), color .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-address:hover, .nq-cc-address:focus,
.nq-cc-copy-wrap.nq-cc-copied .nq-cc-address, .nq-cc-copy-wrap.nq-cc-copied-hold .nq-cc-address {
  background:color-mix(in srgb, var(--nq-cc-accent, #0582ca) 8%, transparent);
  color:var(--nq-cc-accent, #0582ca); }
.nq-cc-address:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:2px; }
/* The wrong-chain guard. Orange because it is a WARNING: red would read as an
   error that already happened, and grey would read as fine print, which is
   exactly what this must not be.
   Colours are the nq registry status-alert warning triplet verbatim
   (colors-orange on colors-orange-400 with a colors-orange-500 ring), not an
   approximation of it. NOTE: this block is a JS template literal, so it must
   never contain a backtick. */
.nq-cc-net-warn { margin:8px 0 0; padding:8px 10px; border-radius:6px;
  background:var(--nq-cc-warn-bg, oklch(0.951 0.0221 74.1));
  outline:1.5px solid var(--nq-cc-warn-line, oklch(0.9396 0.0436 71.7)); outline-offset:-1.5px;
  color:var(--nq-cc-warning, oklch(0.7387 0.179 56.67));
  font-size:11.5px; font-weight:700; line-height:1.4; text-align:center; }
.nq-cc-net-warn[hidden] { display:none; }

/* Saved recipients: a wrapping row of quiet pills under the address field.
   Pills because every actionable thing in this menu is a pill, and quiet
   because they are a shortcut, not the primary way to fill the field.

   QUIET IS NOT SMALL. These shipped 47x23, and a 23px-tall control that fills
   in who gets paid is the one mis-tap in this menu that costs money. The pill
   now clears 36px on its shortest side, which is the floor nq lint enforces and
   the size the Connect button already was. The text stays 11.5px and the fill
   stays a wash: what grew is the target, not the voice. */
.nq-cc-contacts { display:flex; flex-wrap:wrap; gap:5px; margin:6px 0 2px; }
.nq-cc-contacts[hidden] { display:none; }
.nq-cc-contact { max-width:100%; min-height:36px; display:inline-flex; align-items:center;
  padding:4px 12px; border:none; border-radius:999px;
  background:color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 6%, transparent);
  color:var(--nq-cc-menu-fg, #1f2348);
  font-family:inherit; font-size:11.5px; font-weight:700; line-height:1.3; cursor:pointer;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  transition:background .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-contact:hover { background:color-mix(in srgb, var(--nq-cc-accent, #0582ca) 12%, transparent);
  color:var(--nq-cc-accent, #0582ca); }
.nq-cc-contact:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:2px; }
.nq-cc-copy-tooltip { position:absolute; left:50%; bottom:calc(100% + 10px);
  transform:translateX(-50%) translateY(4px); padding:8px 12px; border-radius:4px;
  background-image:var(--nq-cc-send-image,
    radial-gradient(100% 100% at 100% 100%, #265dd7, #0582ca));
  color:var(--nq-cc-send-fg, #fff); font-size:13px;
  font-weight:600; line-height:1.1; white-space:nowrap; pointer-events:none; opacity:0; z-index:30;
  box-shadow:0 2px 2.5px rgba(31,35,72,.02), 0 7px 8.5px rgba(31,35,72,.04), 0 18px 38px rgba(31,35,72,.07);
  transition:opacity .3s var(--nimiq-ease, cubic-bezier(.25,0,0,1)), transform .3s var(--nimiq-ease, cubic-bezier(.25,0,0,1));
  transition-delay:.2s; }
.nq-cc-copy-tooltip::after { content:''; position:absolute; left:50%; top:calc(100% - 1px); width:14px; height:7px;
  margin-left:-7px; transform:scaleY(-1);
  background-image:var(--nq-cc-send-image,
    radial-gradient(100% 100% at 100% 100%, #265dd7, #0582ca));
  -webkit-mask-image:url('data:image/svg+xml,<svg viewBox="0 0 18 16" xmlns="http://www.w3.org/2000/svg"><path d="M9 7.12c-.47 0-.93.2-1.23.64L3.2 14.29A4 4 0 0 1 0 16h18a4 4 0 0 1-3.2-1.7l-4.57-6.54c-.3-.43-.76-.64-1.23-.64z" fill="white"/></svg>');
  mask-image:url('data:image/svg+xml,<svg viewBox="0 0 18 16" xmlns="http://www.w3.org/2000/svg"><path d="M9 7.12c-.47 0-.93.2-1.23.64L3.2 14.29A4 4 0 0 1 0 16h18a4 4 0 0 1-3.2-1.7l-4.57-6.54c-.3-.43-.76-.64-1.23-.64z" fill="white"/></svg>');
  -webkit-mask-size:100% 100%; mask-size:100% 100%; }
.nq-cc-copy-wrap.nq-cc-copied .nq-cc-copy-tooltip { opacity:1; transform:translateX(-50%) translateY(0); }

/* rows + accordion value rows */
.nq-cc-row { display:flex; align-items:center; gap:8px; position:relative; width:100%; padding:7px 10px;
  border:none; border-radius:6px; background:none; font-family:inherit; text-align:left; cursor:pointer;
  transition:background .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-row:hover { background:var(--nq-cc-menu-hover, rgba(31,35,72,.06)); }
.nq-cc-row:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:-2px; }
.nq-cc-label { font-size:13px; font-weight:600; color:var(--nq-cc-menu-muted, rgba(31,35,72,.6)); white-space:nowrap; }
.nq-cc-strong { font-size:14px; font-weight:600; color:var(--nq-cc-menu-fg, #1f2348); }
.nq-cc-cashlink-slot { display:block; width:24px; height:24px; flex:none; color:var(--nq-cc-menu-fg, #1f2348); }
.nq-cc-cashlink-slot svg { display:block; width:100%; height:100%; }
.nq-cc-hexlogo { display:block; width:20px; height:18px; flex:none; }
.nq-cc-acc { display:flex; align-items:center; justify-content:space-between; gap:8px; width:100%;
  padding:7px 10px; border:none; border-radius:6px; background:none; font-family:inherit; text-align:left;
  cursor:pointer; transition:background .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-acc:hover { background:var(--nq-cc-menu-hover, rgba(31,35,72,.06)); }
.nq-cc-acc:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:-2px; }
.nq-cc-acc-value { display:inline-flex; align-items:center; gap:7px; margin-left:auto; }
.nq-cc-acc[aria-expanded="true"] .nq-cc-caret { transform:rotate(180deg); }
.nq-cc-acc-body { display:none; }
.nq-cc-acc-body.nq-cc-open { display:block; }

/* flag-hex card grids on the faint well; ALWAYS-VISIBLE slim gutter slider.
   TRAP: standard scrollbar-width/scrollbar-color make Chrome 121+ ignore
   ::-webkit-scrollbar, they live in the Firefox-only @supports block. */
.nq-cc-grid-wrap { position:relative; margin-top:6px; }
/* Scroll affordance. The grid has a styled scrollbar, but macOS and iOS hide
   overlay scrollbars until you actually scroll, so a list of 40 currencies
   looks like a list of 12. A fade on the bottom edge says "there is more"
   without adding chrome; it is removed once you reach the end, so a fully
   visible grid never wears one. */
.nq-cc-grid-wrap::after { content:''; position:absolute; left:0; right:0; bottom:0; height:34px;
  pointer-events:none; opacity:1; transition:opacity .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1));
  /* plain transparent, not rgba(255,255,255,0): gradients interpolate in
     PREMULTIPLIED alpha, so the old white-with-zero-alpha stop was a workaround
     for a browser bug that is gone, and it made the fade travel through white
     on any surface that is not. */
  background:linear-gradient(to bottom, transparent, var(--nq-cc-menu-bg, #fff));
  border-radius:0 0 6px 6px; }
/* A chevron sitting IN the fade. The fade alone was not read as an affordance
   (Andrew, twice), and on iOS there is nothing else to read: WebKit ignores
   ::-webkit-scrollbar there, so an overlay scrollbar never appears until a
   finger is already moving. A downward chevron is the one mark people already
   associate with "more below". It rides the same on/off state as the fade. */
.nq-cc-grid-more { position:absolute; left:50%; bottom:5px; transform:translateX(-50%);
  display:flex; align-items:center; justify-content:center; width:22px; height:22px;
  border-radius:50%; background:var(--nq-cc-menu-bg, #fff); pointer-events:none;
  box-shadow:0 1px 4px color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 18%, transparent); opacity:1;
  transition:opacity .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-grid-more svg { width:11px; height:11px; color:var(--nq-cc-menu-fg, #1f2348); opacity:.75; }
.nq-cc-grid-wrap[data-at-end]::after, .nq-cc-grid-wrap[data-no-scroll]::after,
.nq-cc-grid-wrap[data-at-end] .nq-cc-grid-more,
.nq-cc-grid-wrap[data-no-scroll] .nq-cc-grid-more { opacity:0; }
/* A real track on pointer devices. iOS ignores this entirely, which is why the
   chevron above is the primary signal rather than the fallback. */
.nq-cc-grid { scrollbar-width:thin;
  scrollbar-color:color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 28%, transparent) transparent; }
.nq-cc-grid { display:grid; gap:4px; padding:4px; padding-right:8px; max-height:196px; overflow-y:auto;
  background:color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 4%, transparent); border-radius:6px; }
.nq-cc-grid.nq-cc-cols-2 { grid-template-columns:1fr 1fr; }
.nq-cc-grid.nq-cc-cols-3 { grid-template-columns:repeat(3, 1fr); }
.nq-cc-grid::-webkit-scrollbar { width:11px; }
.nq-cc-grid::-webkit-scrollbar-track { background:transparent; margin:4px 0; }
.nq-cc-grid::-webkit-scrollbar-thumb { border-radius:500px;
  background:color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 28%, transparent);
  border:3px solid transparent; background-clip:padding-box; }
.nq-cc-grid::-webkit-scrollbar-thumb:hover {
  background-color:color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 45%, transparent); }
@supports (-moz-appearance: none) {
  .nq-cc-grid { scrollbar-width:thin;
    scrollbar-color:color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 28%, transparent) transparent; }
}
.nq-cc-card { display:flex; align-items:center; justify-content:flex-start; gap:7px; height:42px; padding:0 8px;
  border:none; border-radius:6px; background:none; cursor:pointer; font-family:inherit;
  color:var(--nq-cc-menu-muted, rgba(31,35,72,.6)); min-width:0;
  transition:background .3s var(--nimiq-ease, cubic-bezier(.25,0,0,1)), color .3s var(--nimiq-ease, cubic-bezier(.25,0,0,1)), box-shadow .3s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-card:hover { background:var(--nq-cc-menu-hover, rgba(31,35,72,.06)); color:var(--nq-cc-menu-fg, #1f2348); }
.nq-cc-card:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:-2px; }
.nq-cc-card.nq-cc-current { background:var(--nq-cc-card-bg, #fff); color:var(--nq-cc-menu-fg, #1f2348);
  box-shadow:0 .3px 2px rgba(0,0,0,.025), 0 1.5px 3px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.07); }
.nq-cc-card-art { display:block; width:26px; height:24px; flex:none; }
.nq-cc-card-art:empty { display:none; }
.nq-cc-card-name { font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.nq-cc-card-ticker { font-size:12px; font-weight:700; letter-spacing:.06em; }

/* footer: quiet Disconnect; network row ONLY on testnet */
.nq-cc-footer { display:flex; align-items:center; justify-content:space-between; padding:6px 10px 8px;
  font-size:12px; font-weight:600; color:var(--nq-cc-menu-muted, rgba(31,35,72,.45)); }
.nq-cc-net-group { display:none; align-items:center; gap:8px; }
.nq-cc[data-testnet] .nq-cc-net-group { display:inline-flex; }
.nq-cc:not([data-testnet]) .nq-cc-footer { justify-content:center; padding-top:2px; padding-bottom:6px; }
.nq-cc-disconnect { padding:10px 8px; margin:-8px; border:none; background:none; cursor:pointer;
  font-family:inherit; font-size:12px; font-weight:600; color:var(--nq-cc-menu-muted, rgba(31,35,72,.45));
  transition:color .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-disconnect:hover { color:var(--nq-cc-danger, #d94432); }
.nq-cc-disconnect:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:2px; border-radius:3px; }
.nq-cc-badge { font-size:12px; line-height:1; font-weight:700; letter-spacing:.09em; text-transform:uppercase;
  color:var(--nq-cc-warning, #fc8702);
  background:color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 7%, transparent);
  padding:5px 8px; border-radius:4px; }
/* no footer at all when there is nothing to show */
.nq-cc:not([data-testnet]):not([data-connected]) .nq-cc-footer,
.nq-cc:not([data-testnet]):not([data-connected]) .nq-cc-footer-divider,
.nq-cc[data-mode="miniapp"]:not([data-testnet]) .nq-cc-footer,
.nq-cc[data-mode="miniapp"]:not([data-testnet]) .nq-cc-footer-divider { display:none; }

`;
  document.head.appendChild(style);
}

/** Back chevron. Same stroke weight and linecaps as the caret it sits beside,
 *  so the two read as one family rather than two icon sets. */
const CHEVRON_LEFT =
  '<svg class="nq-cc-chevron" viewBox="0 0 6 10" aria-hidden="true">' +
  '<path d="M5 1L1 5l4 4" fill="none" stroke="currentColor" stroke-width="1.15" ' +
  'stroke-linecap="round" stroke-linejoin="round"/></svg>';

const CARET =
  '<svg class="nq-cc-caret" viewBox="0 0 10 6" aria-hidden="true">' +
  '<path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// Neutral hexagon placeholder when no identicon renderer is injected (same as
// the wallet pill; a flag is a language mark, never an identity mark).
const PLACEHOLDER_HEX =
  '<svg viewBox="0 -4 64 64" aria-hidden="true"><path opacity=".25" d="M62.3 25.4L49.2 2.6A5.3 5.3 0 0 0 44.6 0H18.4c-1.9 0-3.6 1-4.6 2.6L.7 25.4c-1 1.6-1 3.6 0 5.2l13.1 22.8c1 1.6 2.7 2.6 4.6 2.6h26.2c1.9 0 3.6-1 4.6-2.6l13-22.8c1-1.6 1-3.6.1-5.2z" fill="currentColor"/></svg>';

const WALLET_ICON =
  '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" style="flex:none;opacity:.85">' +
  '<rect x="2" y="5" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>' +
  '<path d="M2 9h16" stroke="currentColor" stroke-width="1.5"/>' +
  '<circle cx="6" cy="13" r="1" fill="currentColor"/></svg>';

// wallet-verbatim arrow (MobileActionBar) — rotated by CSS for up/down
const ARROW =
  '<svg width="16" height="12" viewBox="0 0 16 12" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="%CLS%">' +
  '<path d="M10,1l5,5l-5,5" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
  '<line x1="14" y1="6" x2="1" y2="6" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// wallet-verbatim ScanQrCodeIcon (upstream nimiq-style scan-qr-code.svg)
const SCAN_QR =
  '<svg class="nq-cc-scan-glyph" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g fill="currentColor"><path d="M1.21 7.06c.67 0 1.21-.54 1.21-1.21l-.04-3.12a.3.3 0 0 1 .3-.3H5.7a1.21 1.21 0 1 0 0-2.43H2.37A2.4 2.4 0 0 0 0 2.42v3.43c0 .67.54 1.21 1.21 1.21zM5.69 37.58H2.73a.3.3 0 0 1-.3-.3v-3.13a1.21 1.21 0 1 0-2.43 0v3.43A2.4 2.4 0 0 0 2.37 40H5.7a1.21 1.21 0 0 0 0-2.42zM38.79 32.94c-.67 0-1.21.54-1.21 1.21l.04 3.12a.3.3 0 0 1-.3.3H34.3a1.21 1.21 0 1 0 0 2.43h3.32A2.4 2.4 0 0 0 40 37.58v-3.43c0-.67-.54-1.21-1.21-1.21zM37.63 0H34.3a1.21 1.21 0 1 0 0 2.42h2.96c.17 0 .3.14.3.3v3.13a1.21 1.21 0 0 0 2.43 0V2.42A2.4 2.4 0 0 0 37.63 0z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M13.94 15.15H6.67c-.67 0-1.22-.54-1.22-1.21V6.67c0-.67.55-1.21 1.22-1.21h7.27c.67 0 1.21.54 1.21 1.2v7.28c0 .67-.54 1.21-1.21 1.21zM8.18 7.88a.3.3 0 0 0-.3.3v4.24c0 .17.13.3.3.3h4.24a.3.3 0 0 0 .3-.3V8.18a.3.3 0 0 0-.3-.3H8.18zM6.67 24.85h7.27c.67 0 1.21.54 1.21 1.21v7.27c0 .67-.54 1.22-1.21 1.22H6.67c-.67 0-1.22-.55-1.22-1.22v-7.27c0-.67.55-1.21 1.22-1.21zm5.75 7.27a.3.3 0 0 0 .3-.3v-4.24a.3.3 0 0 0-.3-.3H8.18a.3.3 0 0 0-.3.3v4.24c0 .17.13.3.3.3h4.24zM26.06 5.45h7.27c.67 0 1.21.55 1.21 1.22v7.27c0 .67-.54 1.21-1.2 1.21h-7.28c-.67 0-1.21-.54-1.21-1.21V6.67c0-.67.54-1.22 1.21-1.22zm5.76 7.28a.3.3 0 0 0 .3-.3V8.17a.3.3 0 0 0-.3-.3h-4.24a.3.3 0 0 0-.3.3v4.24c0 .17.13.3.3.3h4.24z"/><path d="M17.58 10.6h1.2a.9.9 0 1 0 0-1.81.3.3 0 0 1-.3-.3V6.66a.9.9 0 1 0-1.81 0V9.7c0 .5.4.9.9.9zM21.21 7.58c.17 0 .3.13.3.3v6.66a.9.9 0 1 0 1.82 0V6.67c0-.5-.4-.91-.9-.91H21.2a.9.9 0 1 0 0 1.82zM12.42 18.18c0 .5.41.91.91.91h4.25c.5 0 .9-.4.9-.9v-4.86a.9.9 0 1 0-1.81 0v3.64a.3.3 0 0 1-.3.3h-3.04c-.5 0-.9.4-.9.91z"/><path d="M9.09 17.27c-.5 0-.9.4-.9.91v3.03a.3.3 0 0 1-.31.3H6.67a.9.9 0 1 0 0 1.82h15.75c.5 0 .91-.4.91-.9v-3.64a.9.9 0 0 0-1.82 0v2.42a.3.3 0 0 1-.3.3h-10.9a.3.3 0 0 1-.31-.3v-3.03c0-.5-.4-.9-.91-.9zM22.12 26.06c0-.5-.4-.9-.9-.9h-3.64c-.5 0-.91.4-.91.9v4.85a.9.9 0 1 0 1.81 0v-3.64c0-.16.14-.3.3-.3h2.43c.5 0 .91-.4.91-.9zM33.33 32.42h-10.3a.3.3 0 0 1-.3-.3V29.7a.9.9 0 1 0-1.82 0v3.63c0 .5.4.91.9.91h11.52a.9.9 0 0 0 0-1.82z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M29.1 30h-3.65a.9.9 0 0 1-.9-.91v-3.64c0-.5.4-.9.9-.9h3.64c.5 0 .91.4.91.9v3.64c0 .5-.4.91-.9.91zm-2.43-3.64a.3.3 0 0 0-.3.3v1.22c0 .17.13.3.3.3h1.2a.3.3 0 0 0 .31-.3v-1.21a.3.3 0 0 0-.3-.3h-1.21z"/><path d="M32.73 20.9c-.5 0-.91.42-.91.92v7.88a.9.9 0 0 0 1.82 0v-7.88c0-.5-.41-.91-.91-.91zM33.64 17.58c0-.5-.41-.91-.91-.91h-6.67c-.5 0-.9.4-.9.9v3.64a.9.9 0 0 0 1.8 0V18.8c0-.17.15-.3.31-.3h5.46c.5 0 .9-.41.9-.91z"/></g></svg>';

// Switch-account glyph: the Nimiq hexagon IS the two arrows.
//
// Andrew drew this one, 2026-08-14, after the first pass put arrows inside a
// hexagon frame: the outline itself is cut at the left and right points into
// two halves, and each half ends in an arrowhead pointing the way it was
// travelling. Rotational, the way a refresh mark is, but in the brand's shape.
//
// Both halves are slices of the shipped `logos-nimiq-hexagon-outline-mono`
// path, VERBATIM (rule 2: never reconstruct an SVG path). The four rounded
// corners come along with them, which is what makes it read as the hexagon
// rather than as a generic six-sided ring; the only pieces removed are the two
// pointed tips, and those are exactly where the gaps go.
//
// currentColor, never gold. Gold belongs to the logo, and this is a UI icon.
//
// Stroke 0.72 on the 18 viewBox is 0.95px at 24, matching the cashlink and bug
// glyphs beside it. The asset ships at 1.5, which is its weight as a standalone
// logo; carried into a row of UI icons it drew at 2px and read a full weight
// darker than its neighbours, which is what Andrew spotted.
//
// EACH HALF STOPS 0.9 SHORT OF ITS POINT. Ending exactly at the tips left the
// two arrowheads nearly touching, and at 24px on a phone they read as one
// continuous outline rather than as two arrows going opposite ways (Andrew,
// 2026-08-14). Pulling both ends back along their own edge opens the break
// without shortening the shape enough to stop being the hexagon: 1.4 and 2.0
// were also drawn, and past about 1 the halves start reading as two chevrons.
//
// The arrowhead barbs straddle the travel axis at 32 degrees, 2.1 long. Every
// coordinate here is stated rather than computed, because this is a static
// asset: an icon that does trigonometry at runtime is a drawing pretending to
// be code.
const SWITCH_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 17" aria-hidden="true">' +
  '<g fill="none" stroke="currentColor" stroke-width="0.72" stroke-linecap="round" ' +
  'stroke-linejoin="round">' +
  '<path d="M16.603 6.779l-2.987-5.306a1.37 1.37 0 00-1.189-.702H5.57c-.489 0-.941.267-1.186.703L1.396 6.779"/>' +
  '<path d="M1.396 9.752l2.988 5.304a1.36 1.36 0 001.186.703h6.858a1.36 1.36 0 001.186-.703l2.988-5.304"/>' +
  '<path d="M3.24 5.773L1.396 6.779L1.3 4.681M14.758 10.757L16.602 9.752L16.697 11.85"/></g></svg>';

// wallet-verbatim cashlink glyph (upstream nimiq-style cashlink.svg)
const CASHLINK_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2.5px" stroke-linejoin="round"><path d="M40.25,23.25v-.5a6.5,6.5,0,0,0-6.5-6.5h-3.5a6.5,6.5,0,0,0-6.5,6.5v6.5a6.5,6.5,0,0,0,6.5,6.5h2"/><path d="M23.75,40.75v.5a6.5,6.5,0,0,0,6.5,6.5h3.5a6.5,6.5,0,0,0,6.5-6.5v-6.5a6.5,6.5,0,0,0-6.5-6.5h-2"/><line x1="32" y1="11.25" x2="32" y2="15.25"/><line x1="32" y1="48.75" x2="32" y2="52.75"/></g></svg>';

/** The gold brand hexagon for the "Open in Nimiq Pay" row. The gradient id is
 *  minted per instance (rule 3: never reuse a gradient id on one page). */
let hexUid = 0;
function goldHex(): string {
  const id = `nq-cc-hex-${(hexUid += 1)}`;
  return (
    '<svg class="nq-cc-hexlogo" viewBox="0 0 20 18" aria-hidden="true"><g fill="none">' +
    `<path fill="url(#${id})" d="M19.964 8.156 15.758.844A1.69 1.69 0 0014.299 0H5.887c-.6 0-1.156.32-1.456.844L.225 8.156c-.3.523-.3 1.165 0 1.688l4.206 7.312c.3.523.856.844 1.456.844h8.412c.6 0 1.156-.32 1.456-.844l4.206-7.312a1.69 1.69 0 00.003-1.688"/>` +
    `<defs><radialGradient id="${id}" cx="0" cy="0" r="1" gradientTransform="matrix(20.1956 0 0 20.2552 15.188 17.766)" gradientUnits="userSpaceOnUse">` +
    '<stop stop-color="#ec991c"/><stop offset="1" stop-color="#e9b213"/></radialGradient></defs></g></svg>'
  );
}

function shortLabel(account: { label?: string; address: string }, fallback: string): string {
  const local = account.address ? storedLabel(account.address) : null;
  if (local) return local;
  if (account.label) return account.label;
  const addr = account.address?.trim() ?? '';
  if (!addr) return fallback;
  return `${addr.slice(0, 7)}…${addr.slice(-4)}`;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  parent?: HTMLElement,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (parent) parent.appendChild(node);
  return node;
}


/** Keep a grid's bottom fade honest: on while there is more to scroll to, off at
 *  the end, and off entirely when nothing overflows. Re-measured on scroll and
 *  whenever the grid's contents change, since the language and currency lists
 *  are built after the wrapper exists. */
function wireScrollFade(wrap: HTMLElement, grid: HTMLElement): void {
  const more = document.createElement('div');
  more.className = 'nq-cc-grid-more';
  more.setAttribute('aria-hidden', 'true');
  more.innerHTML =
    '<svg viewBox="0 0 12 8" fill="none" aria-hidden="true">' +
    '<path d="M1 1.5 6 6.5l5-5" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round"/></svg>';
  wrap.appendChild(more);
  const sync = (): void => {
    const overflows = grid.scrollHeight - grid.clientHeight > 2;
    wrap.toggleAttribute('data-no-scroll', !overflows);
    wrap.toggleAttribute(
      'data-at-end',
      overflows && grid.scrollTop + grid.clientHeight >= grid.scrollHeight - 2,
    );
  };
  grid.addEventListener('scroll', sync, { passive: true });
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(sync).observe(grid);
  sync();
}

/** Mount the mini wallet into `container`. Owns its state + listeners.
 *
 *  NAMING (2026-08-13): the fleet calls this the **mini wallet**, and so does
 *  everything written about it. `mountCornerControl` is kept as an alias below
 *  because 25 apps import it by that name and a rename that breaks them all to
 *  save a word is not a rename worth doing. New code should use this one. */
export function mountMiniWallet(
  container: HTMLElement,
  options: CornerControlOptions,
): CornerControlHandle {
  const { wallet, i18n } = options;
  const languages = options.languages ?? FEATURED_LANGUAGES;
  const showReceive = options.receive !== false;
  const hasAssets = !!options.assets;
  // The asset stack carries its own balances, so it satisfies the same "there
  // is a balance to show" gate the single NIM line used to. Both are true only
  // while a host is migrating; the stack wins the account row either way.
  const hasBalance = typeof options.getBalanceLuna === 'function' || hasAssets;
  // Currency choice stands on its own: a wallet-less page (the language-only
  // corner from v0.5.0) still wants to offer it, so this is gated on the fiat
  // feed alone. It used to require hasBalance, which made the picker
  // unreachable on exactly those pages.
  const hasFiat = !!options.fiat && options.fiat.currencies.length > 0;
  if (options.injectStyles !== false) ensureStyles();

  let fiatTicker = options.fiat?.default ?? 'USD';
  try {
    const stored = localStorage.getItem(FIAT_STORE_KEY);
    if (stored && options.fiat?.currencies.includes(stored)) fiatTicker = stored;
  } catch { /* storage unavailable */ }
  if (options.fiat && !options.fiat.currencies.includes(fiatTicker)) {
    fiatTicker = options.fiat.currencies[0]!;
  }

  const root = el('div', 'nq-cc');
  // No wallet → the wallet is not merely ambient (mini-app) but absent, and the
  // menu's own when-hub / when-connected gates already collapse it to the
  // language section alone. Reuse that state rather than inventing a third mode.
  root.dataset.mode = !wallet || wallet.mode === 'miniapp' ? 'miniapp' : 'hub';
  // ...but the FACE is not shared: mini-app recedes into the host wallet's
  // chrome, a wallet-less page keeps the outline pill (see the data-face rules).
  if (!wallet) root.dataset.face = 'lang';
  if (options.network === 'test') root.dataset.testnet = '';
  // Before the first paint, and on the ROOT rather than the document, so two
  // mini wallets on one page can wear different brands and neither leaks.
  if (options.theme) applyTheme(root, options.theme);
  container.appendChild(root);

  const langOf = (id: string): ShellLanguage =>
    languages.find((l) => l.id === id) ?? languages[0]!;
  const nativeName = (lang: ShellLanguage): string => NATIVE_NAMES[lang.id] ?? lang.name;

  // ---- faces ----------------------------------------------------------------
  const face = el('button', 'nq-cc-face', root);
  face.type = 'button';
  face.setAttribute('aria-haspopup', 'menu');
  face.setAttribute('aria-expanded', 'false');

  const faceFlag = el('button', 'nq-cc-face-flag', root);
  faceFlag.type = 'button';
  faceFlag.setAttribute('aria-haspopup', 'menu');
  faceFlag.setAttribute('aria-expanded', 'false');

  function renderFace(): void {
    face.textContent = '';
    const account = wallet?.account ?? null;
    if (account) {
      root.dataset.connected = '';
      const icon = el('span', 'nq-cc-face-icon', face);
      if (options.identicon) icon.appendChild(options.identicon(account.address, 28));
      else icon.innerHTML = PLACEHOLDER_HEX;
      const label = el('span', 'nq-cc-face-label', face);
      label.textContent = shortLabel(account, i18n.t('shell.account'));
    } else {
      delete root.dataset.connected;
      face.insertAdjacentHTML('beforeend', WALLET_ICON);
      const label = el('span', 'nq-cc-face-label', face);
      label.textContent = i18n.t('shell.connectWallet');
    }
    face.insertAdjacentHTML('beforeend', CARET);
  }

  function renderFaceFlag(): void {
    faceFlag.textContent = '';
    const lang = langOf(i18n.getLanguage());
    faceFlag.setAttribute('aria-label', i18n.t('shell.language'));
    faceFlag.appendChild(buildFlagHex(lang.flag, { size: 24 }));
    faceFlag.insertAdjacentHTML('beforeend', CARET);
  }

  // ---- menu skeleton --------------------------------------------------------
  const menu = el('div', 'nq-cc-menu', root);
  menu.hidden = true;

  // receive + send views (each behind its action button, like the wallet)
  const viewReceive = el('div', 'nq-cc-view-receive', menu);
  const viewSend = el('div', 'nq-cc-view-send', menu);
  const viewMain = el('div', 'nq-cc-view-main', menu);

  // translatable text registry: node -> i18n key
  const i18nNodes: Array<[HTMLElement, string]> = [];
  function tNode(node: HTMLElement, key: string): void {
    i18nNodes.push([node, key]);
    node.textContent = i18n.t(key);
  }
  /** Re-stated after every language change. The receive view's back label and
   *  chain warning are interpolated per asset, so the plain key-to-text pass
   *  above would overwrite them with the un-suffixed string and blank the
   *  warning. Assigned once the receive view exists. */
  let repaintReceive: () => void = () => {};
  function applyLang(): void {
    for (const [node, key] of i18nNodes) node.textContent = i18n.t(key);
    repaintReceive();
  }

  // ---- signed-out section (hub only) ---------------------------------------
  const signedOut = el('div', 'nq-cc-section nq-cc-when-out nq-cc-when-hub', viewMain);
  const connectBtn = el('button', 'nq-cc-connect', signedOut);
  connectBtn.type = 'button';
  tNode(connectBtn, 'shell.connectWallet');
  connectBtn.addEventListener('click', async () => {
    if (!wallet) return; // language-only: this button is never rendered
    connectBtn.disabled = true;
    connectBtn.textContent = i18n.t('shell.connecting');
    try {
      await wallet.connect();
      setOpen(false);
      connectBtn.textContent = i18n.t('shell.connectWallet');
    } catch {
      connectBtn.textContent = i18n.t('shell.retry');
    } finally {
      connectBtn.disabled = false;
    }
  });
  if (options.onboard) {
    const onboardBtn = el('button', 'nq-cc-onboard', signedOut);
    onboardBtn.type = 'button';
    tNode(onboardBtn, 'shell.newToNimiq');
    onboardBtn.addEventListener('click', () => options.onboard!());
  }
  el('div', 'nq-cc-divider nq-cc-when-out nq-cc-when-hub', viewMain);

  // ---- mini wallet block (hub + connected) ---------------------------------
  const walletSection = el('div', 'nq-cc-section nq-cc-wallet nq-cc-when-connected nq-cc-when-hub', viewMain);
  const accountRow = el('div', 'nq-cc-account', walletSection);
  const identiconSlot = el('span', 'nq-cc-identicon', accountRow);
  // the name IS the rename affordance (tap to edit) — always on, local-first
  const nameEl = el('button', 'nq-cc-name', accountRow);
  nameEl.type = 'button';
  nameEl.addEventListener('click', () => startRename(nameEl));
  const balanceStack = el('div', 'nq-cc-balance', accountRow);
  balanceStack.hidden = true;
  const balanceNim = el('span', 'nq-cc-balance-nim', balanceStack);
  const balanceFiat = el('span', 'nq-cc-balance-fiat', balanceStack);

  // Multi-asset: the per-asset stack sits under the account row and above the
  // action bar, and the account row's figure becomes the fiat total. Mounted
  // once here rather than per render, so balances survive a name change.
  let assetList: AssetListHandle | null = null;
  if (hasAssets) {
    assetList = mountAssetList(walletSection, {
      assets: options.assets!,
      fiatTicker: () => fiatTicker,
      rate: hasFiat
        ? (asset) => options.fiat!.rate(fiatTicker, asset)
        : undefined,
      // The corner reads on menu-open (refreshBalance below), so it opts out of
      // the list's own mount read. Leaving it on would hit a Polygon RPC on
      // every page load of every app, for a panel most visitors never open.
      autoRefresh: false,
      // Tapping a row receives THAT asset. Only offered when the receive flow
      // is on at all, so `receive: false` does not leave rows that look
      // pressable and do nothing.
      onSelect: showReceive ? (asset) => openReceive(asset) : undefined,
    });
  }

  function startRename(btn: HTMLElement): void {
    if (btn.querySelector('input')) return;
    const current = btn.textContent ?? '';
    btn.textContent = '';
    const inp = document.createElement('input');
    inp.className = 'nq-cc-name-input';
    inp.value = current;
    inp.maxLength = 24;
    btn.appendChild(inp);
    inp.focus();
    inp.select();
    const commit = (): void => {
      const value = inp.value.trim() || current;
      btn.textContent = value;
      if (value !== current) {
        if (wallet?.account) setStoredLabel(wallet.account.address, value);
        renderFace();
        if (options.onRename) void options.onRename(value);
      }
    };
    inp.addEventListener('blur', commit);
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') inp.blur();
      if (e.key === 'Escape') { inp.value = current; inp.blur(); }
    });
  }

  // action bar (wallet MobileActionBar order: Receive LEFT, Send RIGHT, scan).
  // Send is ALWAYS there: the built-in send view makes the menu a real mini
  // wallet (recipient + amount here, the wallet only for the approval); an
  // options.send override redirects it to an app-specific flow instead.
  {
    const actions = el('div', 'nq-cc-actions', walletSection);
    if (showReceive) {
      const btn = el('button', 'nq-cc-receive', actions);
      btn.type = 'button';
      btn.insertAdjacentHTML('beforeend', ARROW.replace('%CLS%', 'nq-cc-arrow-down'));
      const span = el('span', undefined, btn);
      tNode(span, 'shell.receive');
      btn.addEventListener('click', () => openReceive());
    }
    {
      const btn = el('button', 'nq-cc-send', actions);
      btn.type = 'button';
      btn.insertAdjacentHTML('beforeend', ARROW.replace('%CLS%', 'nq-cc-arrow-up'));
      const span = el('span', undefined, btn);
      tNode(span, 'shell.send');
      btn.addEventListener('click', () => {
        if (options.send) {
          // app override CLOSES the menu — its handoff happens underneath,
          // and an open menu on top reads as a dead button
          setOpen(false);
          options.send();
        } else {
          openSend();
        }
      });
    }
    if (options.scan) {
      const btn = el('button', 'nq-cc-scan', actions);
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Scan QR code');
      btn.insertAdjacentHTML('beforeend', SCAN_QR);
      btn.addEventListener('click', () => { setOpen(false); options.scan!(); });
    }
  }
  el('div', 'nq-cc-divider nq-cc-when-connected nq-cc-when-hub', viewMain);

  // ---- cashlink row (opt-in, hub + connected) ------------------------------
  if (options.createCashlink) {
    const row = el('button', 'nq-cc-row nq-cc-when-connected nq-cc-when-hub', viewMain);
    row.type = 'button';
    const slot = el('span', 'nq-cc-cashlink-slot', row);
    slot.innerHTML = CASHLINK_ICON;
    const label = el('span', 'nq-cc-strong', row);
    tNode(label, 'shell.createCashlink');
    row.addEventListener('click', () => { setOpen(false); options.createCashlink!(); });
    el('div', 'nq-cc-divider nq-cc-when-connected nq-cc-when-hub', viewMain);
  }

  // ---- language accordion ---------------------------------------------------
  const langSection = el('div', 'nq-cc-section', viewMain);
  const langAcc = el('button', 'nq-cc-acc', langSection);
  langAcc.type = 'button';
  langAcc.setAttribute('aria-expanded', 'false');
  const langLabel = el('span', 'nq-cc-label', langAcc);
  tNode(langLabel, 'shell.language');
  const langValueWrap = el('span', 'nq-cc-acc-value', langAcc);
  const langFlagSlot = el('span', undefined, langValueWrap);
  const langValue = el('span', 'nq-cc-strong', langValueWrap);
  langAcc.insertAdjacentHTML('beforeend', CARET);
  const langBody = el('div', 'nq-cc-acc-body', langSection);
  const langGridWrap = el('div', 'nq-cc-grid-wrap', langBody);
  const langGrid = el('div', 'nq-cc-grid nq-cc-cols-2', langGridWrap);
  wireScrollFade(langGridWrap, langGrid);
  langGrid.setAttribute('role', 'listbox');
  langGrid.setAttribute('aria-label', i18n.t('shell.language'));

  const langCards = new Map<string, HTMLButtonElement>();
  for (const lang of languages) {
    const card = el('button', 'nq-cc-card', langGrid);
    card.type = 'button';
    card.setAttribute('role', 'option');
    const art = el('span', 'nq-cc-card-art', card);
    art.appendChild(buildFlagHex(lang.flag, { size: 26 }));
    const name = el('span', 'nq-cc-card-name', card);
    name.textContent = nativeName(lang);
    card.addEventListener('click', () => {
      i18n.setLanguage(lang.id);
      window.setTimeout(() => collapse(langAcc, langBody), 260);
    });
    langCards.set(lang.id, card);
  }

  function renderLangValue(): void {
    const lang = langOf(i18n.getLanguage());
    langFlagSlot.textContent = '';
    langFlagSlot.appendChild(buildFlagHex(lang.flag, { size: 24 }));
    langValue.textContent = nativeName(lang);
    for (const [id, card] of langCards) {
      const active = id === lang.id;
      card.classList.toggle('nq-cc-current', active);
      card.setAttribute('aria-selected', String(active));
    }
  }

  // ---- fiat accordion (needs balance + fiat feed) ---------------------------
  let fiatFlagSlot: HTMLElement | null = null;
  let fiatValue: HTMLElement | null = null;
  const fiatCards = new Map<string, HTMLButtonElement>();
  if (hasFiat) {
    // With a balance the row belongs to the signed-in block and follows it.
    // Without one there is nothing to be signed in TO, so it is always visible.
    const gate = hasBalance ? ' nq-cc-when-connected' : '';
    el('div', `nq-cc-divider${gate}`, viewMain);
    const section = el('div', `nq-cc-section${gate}`, viewMain);
    const acc = el('button', 'nq-cc-acc', section);
    acc.type = 'button';
    acc.setAttribute('aria-expanded', 'false');
    const label = el('span', 'nq-cc-label', acc);
    tNode(label, 'shell.amountsIn');
    const valueWrap = el('span', 'nq-cc-acc-value', acc);
    fiatFlagSlot = el('span', undefined, valueWrap);
    fiatValue = el('span', 'nq-cc-strong', valueWrap);
    acc.insertAdjacentHTML('beforeend', CARET);
    const body = el('div', 'nq-cc-acc-body', section);
    const wrap = el('div', 'nq-cc-grid-wrap', body);
    const grid = el('div', 'nq-cc-grid nq-cc-cols-3', wrap);
    wireScrollFade(wrap, grid);
    grid.setAttribute('role', 'listbox');
    grid.setAttribute('aria-label', i18n.t('shell.amountsIn'));
    for (const ticker of options.fiat!.currencies) {
      const card = el('button', 'nq-cc-card', grid);
      card.type = 'button';
      card.setAttribute('role', 'option');
      const art = el('span', 'nq-cc-card-art', card);
      const flag = FIAT_FLAGS[ticker];
      if (flag) art.appendChild(buildFlagHex(flag, { size: 26 }));
      const tick = el('span', 'nq-cc-card-ticker', card);
      tick.textContent = ticker;
      card.addEventListener('click', () => {
        if (ticker === fiatTicker) { window.setTimeout(() => collapse(acc, body), 260); return; }
        fiatTicker = ticker;
        try { localStorage.setItem(FIAT_STORE_KEY, ticker); } catch { /* ignore */ }
        renderFiatValue();
        if (hasBalance) void refreshBalance(true);
        options.fiat!.onChange?.(ticker);
        window.setTimeout(() => collapse(acc, body), 260);
      });
      fiatCards.set(ticker, card);
    }
    wireAccordion(acc, body);
  }

  function renderFiatValue(): void {
    if (!fiatFlagSlot || !fiatValue) return;
    fiatFlagSlot.textContent = '';
    const flag = FIAT_FLAGS[fiatTicker];
    if (flag) fiatFlagSlot.appendChild(buildFlagHex(flag, { size: 24 }));
    fiatValue.textContent = fiatTicker;
    for (const [ticker, card] of fiatCards) {
      const active = ticker === fiatTicker;
      card.classList.toggle('nq-cc-current', active);
      card.setAttribute('aria-selected', String(active));
    }
  }

  // ---- Open in Nimiq Pay (hub only) ----------------------------------------
  if (options.openInPay) {
    el('div', 'nq-cc-divider nq-cc-when-hub', viewMain);
    const row = el('button', 'nq-cc-row nq-cc-when-hub', viewMain);
    row.type = 'button';
    row.insertAdjacentHTML('beforeend', goldHex());
    const label = el('span', 'nq-cc-strong', row);
    tNode(label, 'shell.openInPay');
    row.addEventListener('click', () => {
      setOpen(false);
      const target = options.openInPay!;
      window.location.href = typeof target === 'function' ? target() : target;
    });
  }

  // ---- Report a bug ---------------------------------------------------------
  // No nq-cc-when-* gate: unlike the wallet rows above, this one is about the
  // PAGE, not the account, so it shows connected or not, hub or mini-app.
  if (options.reportBug) {
    // Hooks go in at MOUNT, not when the sheet opens: by the time someone taps
    // "Report a bug" the error they are reporting has already happened, and the
    // console error that explains it is the one nobody can retype.
    if (typeof options.reportBug === 'object' && options.reportBug.bot) {
      installReportCapture(options.reportBug.bot.service ?? 'https://bot.nimiq.tech');
    }
    el('div', 'nq-cc-divider', viewMain);
    const row = el('button', 'nq-cc-row nq-cc-report', viewMain);
    row.type = 'button';
    const glyph = el('span', 'nq-cc-cashlink-slot', row);
    glyph.insertAdjacentHTML('beforeend', BUG_ICON);
    const label = el('span', 'nq-cc-strong', row);
    tNode(label, 'shell.reportBug');
    row.addEventListener('click', () => {
      // Close first: the sheet lands on top, and a menu left open underneath
      // shows through its scrim.
      setOpen(false);
      const target = options.reportBug!;
      if (typeof target === 'function') target();
      // Forward the brand: the sheet portals to body, so it cannot inherit the
      // vars stamped on this root and has to be handed them.
      else openReportBugSheet(document, i18n, options.theme ? { ...target, theme: target.theme ?? options.theme } : target);
    });
  }

  // ---- switch account -------------------------------------------------------
  // Connecting again IS the switcher: chooseAddress reopens the Hub's own
  // account picker, which is the right screen for this and one we do not have
  // to build. There is deliberately no in-menu account list, because a fleet
  // app cannot enumerate the user's accounts (LIST is not third-party callable)
  // and a worse copy of a screen the Hub already ships is not worth owning.
  //
  // Hub only. Inside Nimiq Pay the account is the host wallet's, not ours.
  if (wallet && options.switchAccount !== false) {
    const switchRow = el('button', 'nq-cc-row nq-cc-when-connected nq-cc-when-hub', viewMain);
    switchRow.type = 'button';
    // Same glyph slot every other row uses. Without it this row's label starts
    // where the others' ICONS start, so it hangs ~20px left of Report a bug and
    // the cashlink row and the column reads as broken.
    const switchGlyph = el('span', 'nq-cc-cashlink-slot', switchRow);
    switchGlyph.insertAdjacentHTML('beforeend', SWITCH_ICON);
    const switchLabel = el('span', 'nq-cc-strong', switchRow);
    tNode(switchLabel, 'shell.switchAccount');
    switchRow.addEventListener('click', async () => {
      setOpen(false);
      try {
        // Cancelling the Hub picker resolves null and MUST be a no-op: the
        // current account stays connected. Treating it as a disconnect would
        // make an exploratory tap destructive, and this row sits one line above
        // the actual Disconnect.
        await wallet.connect();
      } catch {
        /* the picker was dismissed, or the popup was blocked. Either way the
           account we already had is still the account we have. */
      }
    });
  }

  // ---- footer ---------------------------------------------------------------
  el('div', 'nq-cc-divider nq-cc-footer-divider', viewMain);
  const footer = el('div', 'nq-cc-footer', viewMain);
  const disconnectBtn = el('button', 'nq-cc-disconnect nq-cc-when-connected nq-cc-when-hub', footer);
  disconnectBtn.type = 'button';
  tNode(disconnectBtn, 'shell.disconnect');
  disconnectBtn.addEventListener('click', () => {
    wallet?.disconnect();
    setOpen(false);
  });
  const netGroup = el('span', 'nq-cc-net-group', footer);
  const netLabel = el('span', undefined, netGroup);
  tNode(netLabel, 'shell.network');
  const badge = el('span', 'nq-cc-badge', netGroup);
  badge.textContent = 'Testnet';

  /** A sub-view header: a back CHEVRON on the left, the view's name centred.
   *
   *  The name used to BE the back button ("< Send"), which asked the one
   *  control on the screen to mean two things at once, and the one it looked
   *  like was "send". A title is not an action. The chevron is the action, the
   *  centred name says where you are, and the two stop competing.
   *
   *  Three columns rather than a flex row: the title is centred in the CARD, so
   *  it does not shift by the width of the chevron beside it. */
  function viewHeader(parent: HTMLElement, titleKey: string, onBack: () => void): HTMLElement {
    const head = el('div', 'nq-cc-view-head', parent);
    const btn = el('button', 'nq-cc-back', head);
    btn.type = 'button';
    btn.setAttribute('aria-label', i18n.t('shell.back'));
    btn.insertAdjacentHTML('beforeend', CHEVRON_LEFT);
    const title = el('span', 'nq-cc-view-title', head);
    tNode(title, titleKey);
    btn.addEventListener('click', onBack);
    // The i18n subscription retranslates tNode content, but an aria-label is an
    // attribute and is not one of those nodes.
    backLabels.push(btn);
    return title;
  }
  const backLabels: HTMLElement[] = [];

  // ---- receive view content -------------------------------------------------
  // The title carries the asset when one is being received, so repaintReceive
  // holds it: "Receive USDC" rather than a bare "Receive" over a Polygon address.
  const receiveTitle = viewHeader(
    viewReceive, 'shell.receive', () => root.classList.remove('nq-cc-show-receive'),
  );
  el('div', 'nq-cc-divider', viewReceive);
  const receiveBody = el('div', 'nq-cc-receive-body', viewReceive);
  const qrSlot = el('div', 'nq-cc-qr', receiveBody);
  const copyWrap = el('span', 'nq-cc-copy-wrap', receiveBody);
  const addressBtn = el('button', 'nq-cc-address', copyWrap);
  addressBtn.type = 'button';
  addressBtn.title = i18n.t('shell.copyAddress');
  const copyTip = el('span', 'nq-cc-copy-tooltip', copyWrap);
  copyTip.setAttribute('aria-hidden', 'true');
  tNode(copyTip, 'shell.copied');
  const hint = el('p', 'nq-cc-receive-hint', receiveBody);
  tNode(hint, 'shell.tapToCopy');
  // The wrong-chain guard. Below the address rather than above it, because it
  // is the last thing read before the address is copied, and it is only ever
  // filled for a specific asset (the account's own NIM address needs no
  // warning, and a warning on every screen is a warning nobody reads).
  const netWarn = el('p', 'nq-cc-net-warn', receiveBody);
  netWarn.hidden = true;

  /** Whichever address the receive view is currently showing. Defaults to the
   *  account, and is repointed per asset by openReceive. Copy must read THIS,
   *  not the account, or tapping a USDT address copies the NIM one. */
  let receiveAddress: string | null = null;

  let copyTimer: ReturnType<typeof setTimeout> | undefined;
  addressBtn.addEventListener('click', () => {
    const addr = receiveAddress ?? wallet?.account?.address;
    if (!addr) return;
    try { void navigator.clipboard.writeText(addr); } catch { /* clipboard unavailable */ }
    copyWrap.classList.add('nq-cc-copied', 'nq-cc-copied-hold');
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => copyWrap.classList.remove('nq-cc-copied'), 800);
  });
  addressBtn.addEventListener('blur', () => copyWrap.classList.remove('nq-cc-copied-hold'));

  // ---- send view content ----------------------------------------------------
  viewHeader(viewSend, 'shell.send', () => closeSend());
  el('div', 'nq-cc-divider', viewSend);
  const sendBody = el('div', 'nq-cc-send-body', viewSend);
  // The label row carries the recipient identicon, because the identicon is the
   // only thing on this screen that tells you at a GLANCE that you are paying
   // the person you meant to. Reading 36 characters back is not something people
   // do; recognising a face they have seen before is. It appears the moment the
   // address is a real one and goes again if you edit it back into nonsense, so
   // its presence IS the validity signal.
  const recipientHead = el('div', 'nq-cc-field-head', sendBody);
  const recipientIcon = el('span', 'nq-cc-recipient-icon', recipientHead);
  const recipientLabel = el('label', 'nq-cc-field-label', recipientHead);
  tNode(recipientLabel, 'shell.recipient');

  // Nine four-char blocks in a 3x3 grid, the wallet's own send-modal field.
  const recipientWrap = el('div', 'nq-cc-addr-field', sendBody);
  el('span', 'nq-cc-addr-rules', recipientWrap);
  const recipientInput = el('textarea', 'nq-cc-addr-input', recipientWrap);
  recipientInput.rows = 3;
  recipientInput.placeholder = formatAddressBlocks('NQ00000000000000000000000000000000000');
  recipientInput.autocomplete = 'off';
  recipientInput.spellcheck = false;
  recipientInput.setAttribute('aria-label', i18n.t('shell.recipient'));
  // Format as they type, and after a paste, which is how most addresses arrive.
  recipientInput.addEventListener('input', () => reformatInPlace(recipientInput));
  // Enter would add a fourth line to a three-line field.
  recipientInput.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') e.preventDefault();
  });
  // Saved recipients. Chips rather than a dropdown: there are only ever a
  // handful of people you pay repeatedly, and a select would hide them behind a
  // tap while a row of names is readable at a glance.
  //
  // Picking FILLS the field rather than bypassing it, so the address stays on
  // screen and checkable before confirming. Handing an address straight to the
  // signer because a name was tapped removes the last chance to notice it is
  // the wrong one.
  const contactsRow = el('div', 'nq-cc-contacts', sendBody);
  contactsRow.hidden = true;

  /** After a send lands, offer to save a recipient the book does not hold.
   *
   *  A prompt() rather than a bespoke sheet, deliberately: naming a contact is
   *  one short string, the send has already succeeded so nothing is at stake,
   *  and a second modal on top of the sent state would be a lot of component
   *  for a rename box. Hosts wanting their own flow leave `add` unwired and
   *  save from their own screens. */
  async function offerToSave(address: string): Promise<void> {
    const add = options.contacts?.add;
    if (!add) return;
    const compact = address.replace(/\s+/g, '').toUpperCase();
    try {
      const known = (await options.contacts!.list()) ?? [];
      if (known.some((c) => c.address.replace(/\s+/g, '').toUpperCase() === compact)) return;
      const label = window.prompt(i18n.t('shell.saveContact'))?.trim();
      if (!label) return;
      await add({ label, address, asset: 'NIM' });
    } catch {
      /* the host's book refused the read or the write. The money already moved,
         so this must never surface as a send failure. */
    }
  }

  async function renderContacts(): Promise<void> {
    if (!options.contacts) return;
    let entries: ShellContact[] = [];
    try {
      entries = (await options.contacts.list()) ?? [];
    } catch {
      // The host's address book is the host's problem. A send view that
      // refuses to open because a contacts read failed is worse than one
      // without chips.
      entries = [];
    }
    // Only contacts for the asset being sent. Offering a Polygon address while
    // sending NIM is offering a mistake; an entry with no asset is NIM, which
    // is what the built-in send view moves.
    const usable = entries.filter((c) => (c.asset ?? 'NIM') === 'NIM');
    contactsRow.textContent = '';
    contactsRow.hidden = usable.length === 0;
    for (const contact of usable) {
      const chip = el('button', 'nq-cc-contact', contactsRow);
      chip.type = 'button';
      chip.textContent = contact.label;
      chip.title = contact.address;
      chip.addEventListener('click', () => {
        recipientInput.value = formatAddressBlocks(contact.address);
        validateSend();
        recipientInput.focus();
        // Caret to the START. The grid shows all nine blocks at once now, so
        // this is no longer about scrolling the first ones back into view; it
        // is so the field reads from its beginning, which is the half people
        // actually recognise, rather than parking mid-address.
        recipientInput.setSelectionRange(0, 0);
      });
    }
  }
  const amountLabel = el('label', 'nq-cc-field-label', sendBody);
  tNode(amountLabel, 'shell.amount');
  const amountRow = el('div', 'nq-cc-amount-row', sendBody);
  const amountInput = el('input', 'nq-cc-input', amountRow);
  amountInput.placeholder = '0';
  amountInput.inputMode = 'decimal';
  amountInput.autocomplete = 'off';
  const amountSuffix = el('span', 'nq-cc-amount-suffix', amountRow);
  amountSuffix.textContent = 'NIM';
  const availableHint = el('p', 'nq-cc-send-hint', sendBody);
  const sendError = el('p', 'nq-cc-send-error', sendBody);
  const sendConfirm = el('button', 'nq-cc-send-confirm', sendBody);
  sendConfirm.type = 'button';
  tNode(sendConfirm, 'shell.send');
  const sendDone = el('div', 'nq-cc-send-done', viewSend);
  sendDone.insertAdjacentHTML(
    'beforeend',
    '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>' +
      '<path d="M7.5 12.5l3 3 6-6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>',
  );
  const sendDoneLabel = el('span', undefined, sendDone);
  tNode(sendDoneLabel, 'shell.sent');

  // 36 chars in Nimiq's base32 alphabet (no I, O, W, Z), NQ + check + 8 blocks
  const NIM_ADDRESS_RE = /^NQ\d{2}[0-9A-HJ-NP-VXY]{32}$/;

  /** Draw (or clear) the recipient identicon. Only ever called with an address
   *  that already passed the shape check, so it never renders a face for
   *  something half-typed: a face appearing early would be read as "this is
   *  who you are paying" while the address is still wrong.
   *
   *  A host that wired no `identicon` renderer gets nothing rather than the
   *  neutral hexagon the account face falls back to. The hexagon is a
   *  PLACEHOLDER, and a placeholder here would say "identity confirmed" while
   *  showing no identity at all. */
  let recipientIconFor = '';
  function renderRecipientIcon(address: string | null): void {
    if (!options.identicon || recipientIconFor === (address ?? '')) return;
    recipientIconFor = address ?? '';
    recipientIcon.textContent = '';
    // visibility, not hidden: the slot holds its width either way, so the label
    // beside it does not jump sideways the moment the address becomes valid.
    recipientIcon.style.visibility = address ? '' : 'hidden';
    if (address) recipientIcon.appendChild(options.identicon(address, 36));
  }
  const compactRecipient = (): string => significantChars(recipientInput.value);
  const amountNim = (): number => {
    const n = Number(amountInput.value.replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };
  function validateSend(): void {
    const okAddress = NIM_ADDRESS_RE.test(compactRecipient());
    renderRecipientIcon(okAddress ? compactRecipient() : null);
    const nim = amountNim();
    const okAmount = nim > 0 && (balanceLuna === null || nim <= lunaToNim(balanceLuna));
    sendConfirm.disabled = !(okAddress && okAmount);
  }
  recipientInput.addEventListener('input', validateSend);
  amountInput.addEventListener('input', validateSend);

  function openSend(): void {
    if (!wallet?.account) return;
    sendError.textContent = '';
    viewSend.classList.remove('nq-cc-sent');
    availableHint.textContent =
      balanceLuna !== null ? `${i18n.t('shell.available')}: ${fmtNim(balanceLuna)} NIM` : '';
    validateSend();
    root.classList.add('nq-cc-show-send');
    recipientInput.focus();
    // Read on open, not at mount: the host's book can change between sends, and
    // a list captured at mount goes stale in a long-lived page.
    void renderContacts();
  }
  function closeSend(): void {
    root.classList.remove('nq-cc-show-send');
  }

  sendConfirm.addEventListener('click', async () => {
    if (!wallet) return; // language-only: the send view is never reachable
    const compact = compactRecipient();
    const spaced = compact.replace(/(.{4})(?=.)/g, '$1 ');
    sendConfirm.disabled = true;
    sendError.textContent = '';
    sendConfirm.textContent = i18n.t('shell.sending');
    try {
      const result = await wallet.pay({
        recipient: spaced,
        valueLuna: nimToLuna(amountNim()),
      });
      if (result) {
        viewSend.classList.add('nq-cc-sent');
        // Offer to save BEFORE the fields are cleared, and only for an address
        // the book does not already hold. Asked after the send rather than
        // before it, because a prompt between "Send" and the money moving is an
        // obstacle at the worst possible moment.
        void offerToSave(spaced);
        recipientInput.value = '';
        amountInput.value = '';
        balanceFetchedAt = 0; // the balance just changed — refetch on next look
        window.setTimeout(() => {
          closeSend();
          void refreshBalance(true);
        }, 1800);
      } else {
        // mobile redirect flow: the page is navigating to the wallet
        closeSend();
      }
    } catch (err) {
      // a user closing the wallet dialog is a normal outcome, not an error
      if (!/cancel|denied|rejected|closed|dismiss/i.test(String(err))) {
        sendError.textContent = i18n.t('shell.sendFailed');
      }
    } finally {
      sendConfirm.textContent = i18n.t('shell.send');
      validateSend();
    }
  });

  let qrFor = '';

  /** The asset the receive view is showing, or null for the account's own NIM
   *  address. Held so a language switch can restate the label and warning. */
  let receiveAsset: ShellAsset | null = null;
  repaintReceive = (): void => {
    receiveTitle.textContent = receiveAsset
      ? `${i18n.t('shell.receive')} ${receiveAsset.ticker}`
      : i18n.t('shell.receive');
    netWarn.hidden = !receiveAsset;
    netWarn.textContent = receiveAsset
      ? i18n.t('shell.networkOnly', {
          ticker: receiveAsset.ticker,
          network: receiveAsset.network,
        })
      : '';
  };

  /** Show the receive view. With an asset, it shows THAT asset's address, chain
   *  and QR payload; without one, the account's own NIM address as before.
   *
   *  An asset with no address of ITS OWN is refused rather than falling back to
   *  the account address. The fallback looked harmless and was the opposite: it
   *  printed "Send USDT on Polygon only" over a NIM address, and the warning
   *  made that pairing read as deliberate. The row is also left unselectable
   *  (see asset-list), so this is the second of two guards on the same hazard. */
  function openReceive(asset?: ShellAsset): void {
    const account = wallet?.account ?? null;
    if (!account) return;
    if (asset && !asset.address) return;
    const address = asset?.address ?? account.address;
    if (!address) return;
    root.classList.add('nq-cc-show-receive');

    const compact = address.replace(/\s+/g, '');
    receiveAddress = compact;

    addressBtn.textContent = '';
    const grid = addressGrid(compact);
    // The column count is the format's, not a constant: NIM is three columns of
    // four, everything else is one column of three rows.
    addressBtn.style.setProperty('--nq-cc-addr-cols', String(grid.columns));
    for (const block of grid.cells) {
      const span = el('span', undefined, addressBtn);
      span.textContent = block;
    }

    receiveAsset = asset ?? null;
    repaintReceive();

    // `nimiq:` is correct for NIM and wrong for every other chain, so it is only
    // applied to the account address. An asset says what it wants via `uri`, and
    // the default is the bare address, which every scanner understands.
    const payload = asset ? (asset.uri?.(compact) ?? compact) : `nimiq:${compact}`;
    if (qrFor !== payload) {
      qrSlot.textContent = '';
      // The host's renderer wins; without one this is the wallet's own QR
      // rather than nothing, which is what it used to be.
      qrSlot.appendChild(options.qr ? options.qr(payload, 164) : nimiqQr(payload, 164, qrSlot));
      qrFor = payload;
    }
  }

  // ---- accordions -----------------------------------------------------------
  function wireAccordion(acc: HTMLElement, body: HTMLElement): void {
    acc.addEventListener('click', () => {
      const open = body.classList.toggle('nq-cc-open');
      acc.setAttribute('aria-expanded', String(open));
    });
  }
  function collapse(acc: HTMLElement, body: HTMLElement): void {
    body.classList.remove('nq-cc-open');
    acc.setAttribute('aria-expanded', 'false');
  }
  wireAccordion(langAcc, langBody);

  // ---- balance --------------------------------------------------------------
  let balanceFetchedAt = 0;
  let balanceLuna: number | null = null;
  async function refreshBalance(force = false): Promise<void> {
    const account = wallet?.account ?? null;
    if (!hasBalance || !account) return;
    if (assetList) {
      // The stack owns the rows; the account row shows their fiat total. It is
      // painted AFTER the refresh rather than per row, so the headline figure
      // never counts a half-filled list and jumps as the slow chains land.
      await assetList.refresh(force);
      const total = assetList.total();
      balanceStack.hidden = total === null;
      balanceNim.textContent = total === null ? '' : fmtFiat(total, fiatTicker);
      balanceFiat.hidden = true;
      // Keep the NIM figure the Send view caps against in sync with the stack.
      const nimUnits = assetList.units('NIM');
      if (nimUnits !== null) balanceLuna = Number(nimUnits);
      if (!options.getBalanceLuna) return;
    }
    const now = Date.now();
    if (!force && now - balanceFetchedAt < 30_000 && balanceLuna !== null) {
      renderBalance();
      return;
    }
    try {
      balanceLuna = await options.getBalanceLuna!(account.address);
      balanceFetchedAt = now;
    } catch { /* keep the last known value */ }
    renderBalance();
    if (hasFiat && !assetList && balanceLuna !== null) {
      try {
        const rate = await options.fiat!.rate(fiatTicker);
        if (rate !== null && wallet?.account) {
          balanceFiat.textContent = fmtFiat(lunaToNim(balanceLuna) * rate, fiatTicker);
          balanceFiat.hidden = false;
        } else {
          balanceFiat.hidden = true;
        }
      } catch {
        balanceFiat.hidden = true;
      }
    }
  }
  function renderBalance(): void {
    // With a stack mounted, the account row belongs to its fiat total and this
    // NIM line would clobber it. balanceLuna is still tracked, for the Send cap.
    if (assetList) return;
    if (balanceLuna === null) { balanceStack.hidden = true; return; }
    balanceStack.hidden = false;
    balanceNim.textContent = `${fmtNim(balanceLuna)} NIM`;
    if (!hasFiat) balanceFiat.hidden = true;
  }

  // ---- wallet block render --------------------------------------------------
  function renderWalletBlock(): void {
    const account = wallet?.account ?? null;
    if (!account) return;
    identiconSlot.textContent = '';
    if (options.identicon) identiconSlot.appendChild(options.identicon(account.address, 40));
    else identiconSlot.innerHTML = PLACEHOLDER_HEX;
    nameEl.textContent = shortLabel(account, i18n.t('shell.account'));
    qrFor = '';
    void refreshBalance();
  }

  // ---- open / close ---------------------------------------------------------
  /** Nudge the card back on-screen when the trigger is not the rightmost thing
   *  in its header. The menu hangs off the corner (`right:0`), which only lands
   *  on-screen when the mount slot is at least a card-width from the left edge.
   *  nimiq.ninja puts an "Open the wallet" CTA to the right of the pill, so at
   *  430px the card started 14px past the left edge, and at 360px, 36px past.
   *  Shifting beats re-anchoring to the left: the card stays under its own
   *  trigger, which is what the corner is for. */
  function clampMenu(): void {
    menu.style.setProperty('--nq-cc-menu-shift', '0px');
    const r = menu.getBoundingClientRect();
    const shift = menuShift(r.left, r.right, window.innerWidth);
    if (shift) menu.style.setProperty('--nq-cc-menu-shift', `${shift}px`);
  }
  function setOpen(open: boolean): void {
    menu.hidden = !open;
    face.setAttribute('aria-expanded', String(open));
    faceFlag.setAttribute('aria-expanded', String(open));
    if (open) {
      clampMenu();
      window.addEventListener('resize', clampMenu);
      document.addEventListener('click', onDocClick, true);
      document.addEventListener('keydown', onKeydown);
      void refreshBalance();
    } else {
      root.classList.remove('nq-cc-show-receive');
      root.classList.remove('nq-cc-show-send');
      window.removeEventListener('resize', clampMenu);
      document.removeEventListener('click', onDocClick, true);
      document.removeEventListener('keydown', onKeydown);
    }
  }
  function onDocClick(e: MouseEvent): void {
    if (!root.contains(e.target as Node)) setOpen(false);
  }
  function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') setOpen(false);
  }
  const toggle = (): void => setOpen(menu.hidden);
  face.addEventListener('click', toggle);
  faceFlag.addEventListener('click', toggle);

  // ---- boot + subscriptions -------------------------------------------------
  renderFace();
  renderFaceFlag();
  renderLangValue();
  renderFiatValue();
  // Announce the restored/default ticker so a host renders in the right currency
  // on first paint, rather than flashing USD until the visitor touches the menu.
  if (hasFiat) options.fiat!.onChange?.(fiatTicker);
  if (wallet?.account) renderWalletBlock();

  // Every balance on screen belongs to ONE address. When that address changes,
  // all of it stops being true at once: the NIM figure, the asset stack, the
  // fiat total, and the receive screen if it happens to be open. Keeping any of
  // it would show one account's money under another account's name, which is
  // worse than showing nothing, and the list's keep-the-last-value rule (right
  // for a flaky RPC) would otherwise do exactly that.
  let shownAddress: string | null = wallet?.account?.address ?? null;
  const unsubWallet = wallet
    ? wallet.onAccountChange(() => {
      const next = wallet.account?.address ?? null;
      if (next !== shownAddress) {
        shownAddress = next;
        balanceLuna = null;
        balanceFetchedAt = 0;
        assetList?.clear();
        // A receive screen left open now shows the previous account's address.
        // Closed AND emptied: leaving the old address in the DOM behind a
        // hidden class is a stale address waiting for the next thing that
        // reveals the view without repainting it.
        root.classList.remove('nq-cc-show-receive');
        receiveAsset = null;
        receiveAddress = null;
        qrFor = '';
        addressBtn.textContent = '';
        qrSlot.textContent = '';
      }
      renderFace();
      if (wallet.account) { renderWalletBlock(); void refreshBalance(true); }
      else { balanceStack.hidden = true; }
    })
    : () => { /* language-only: no wallet to subscribe to */ };
  const unsubLang = i18n.onChange(() => {
    applyLang();
    for (const btn of backLabels) btn.setAttribute('aria-label', i18n.t('shell.back'));
    renderLangValue();
    renderFaceFlag();
    renderFace();
  });

  return {
    el: root,
    get fiatTicker() { return hasFiat ? fiatTicker : null; },
    open: () => setOpen(true),
    close: () => setOpen(false),
    destroy() {
      unsubWallet();
      unsubLang();
      setOpen(false);
      // Before root.remove(): the list has in-flight chain reads that must see
      // the destroyed flag, or a slow RPC repaints a detached node.
      assetList?.destroy();
      root.remove();
    },
  };
}

/** Back-compat alias for {@link mountMiniWallet}.
 *
 *  The component was shipped as "corner control" (locked 2026-07-23) and 25
 *  fleet apps import that name. The fleet calls the thing a mini wallet, so the
 *  canonical export follows the fleet; this stays so no app has to change a
 *  line to take a version bump. */
export const mountCornerControl = mountMiniWallet;
