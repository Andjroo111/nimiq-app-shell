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
import { SHELL_LANGUAGES, type ShellLanguage } from '../locales';
import { buildFlagHex } from './flag-hex';
import { fmtNim, fmtFiat, lunaToNim, nimToLuna } from '../format/nim';

export interface CornerControlOptions {
  /** The app's wallet. OMIT IT on pages that have no wallet concept at all
   *  (a kid app on device pairing, a portal chooser): the corner then renders
   *  language-only — the same flag face and single-section menu it shows inside
   *  Nimiq Pay — instead of offering a Connect button the page can't honour. */
  wallet?: Wallet;
  i18n: I18n;
  /** Languages to offer. Default: the 5 the shell ships strings for. */
  languages?: ShellLanguage[];
  /** Identicon renderer for the face + wallet block (self-sized element). */
  identicon?: (address: string, sizePx: number) => HTMLElement;
  /** QR renderer for the receive view. Without it the receive view shows the
   *  address grid only. */
  qr?: (text: string, sizePx: number) => HTMLElement;
  /** Show the Receive flow (address + QR behind the Receive button). Default true. */
  receive?: boolean;
  /** Wire the Send button (e.g. a checkout flow). Button hidden when absent. */
  send?: () => void;
  /** Wire the QR-scan button. Hidden when absent. */
  scan?: () => void;
  /** Wire the opt-in "Create a Cashlink" row (HubApi.createCashlink). Hidden when absent. */
  createCashlink?: () => void;
  /** Wire the signed-out "New to Nimiq? Create a wallet" line (HubApi.onboard).
   *  Hidden when absent. */
  onboard?: () => void;
  /** Tap-name-to-rename is BUILT IN: the new label persists locally per address
   *  (localStorage) and shows on the face + menu. This hook is an optional
   *  EXTRA — called with the committed label for hosts that can sync it further
   *  (see header note on why Hub rename can't be the default). */
  onRename?: (label: string) => void | Promise<void>;
  /** Balance source in luna. Without it the balance stack is hidden. */
  getBalanceLuna?: (address: string) => Promise<number>;
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
    /** Price of 1 NIM in `ticker`, or null when unknown. Only called when a
     *  balance is being rendered; a fiat-only host may return null. */
    rate: (ticker: string) => Promise<number | null>;
    /** Called whenever the visitor picks a different ticker, and once at mount
     *  with the restored/default one, so a host can price its own UI. */
    onChange?: (ticker: string) => void;
  };
  /** 'test' renders the network row (mainnet says nothing). Default 'main'. */
  network?: 'main' | 'test';
  /** "Open in Nimiq Pay" deeplink URL (standalone web only). Hidden when
   *  absent. Pass a function for URLs that depend on late state (e.g. an auth
   *  token that must ride along) — it is called at click time. */
  openInPay?: string | (() => string);
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
};

/** Fiat ticker → bundled flag artwork (the wallet pairs currencies with country
 *  flags; we clip them into the brand hexagon). Unknown tickers render text-only. */
export const FIAT_FLAGS: Record<string, string> = {
  USD: 'us', EUR: 'eu', GBP: 'gb', MXN: 'mx', BRL: 'br', CNY: 'cn', INR: 'in',
  JPY: 'jp', CHF: 'ch', CAD: 'ca', AUD: 'au', KRW: 'kr', TRY: 'tr', VND: 'vn',
};

function ensureStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  // Ported from the registry corner-control.css (locked 2026-07-23): brand
  // values fixed (navy connect, light-blue send, Copyable blues); the menu
  // surface is themeable the langpill/walletpill way (--nq-cc-* vars).
  style.textContent = `
.nq-cc { position:relative; display:inline-block; font-family:'Mulish','Muli',system-ui,sans-serif; }
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

/* face (mini-app mode): flag only — the wallet is ambient */
.nq-cc-face-flag { display:none; align-items:center; gap:7px; height:38px; padding:0 10px;
  border:none; border-radius:8px; background:none; cursor:pointer; color:inherit;
  transition:background .2s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-face-flag:hover { background: color-mix(in srgb, currentColor 8%, transparent); }
.nq-cc-face-flag:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:2px; }
.nq-cc[data-mode="miniapp"] .nq-cc-face { display:none; }
.nq-cc[data-mode="miniapp"] .nq-cc-face-flag { display:inline-flex; }

/* menu */
/* stays a compact card hanging off the corner on EVERY viewport (Andjroo,
   mobile review 7/23: full-width phone sheet rejected — "it should just come
   out of the corner"); max-width only guards sub-300px screens */
.nq-cc-menu { position:absolute; top:calc(100% + 8px); right:0; z-index:60; width:272px;
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
  font-weight:700; color:#fff; cursor:pointer; background-color:#1f2348;
  background-image:radial-gradient(100% 100% at 100% 100%, #260133, #1f2348); }
.nq-cc-connect:hover { background-image:radial-gradient(100% 100% at 100% 100%, #180021, #151833); }
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
  font-family:inherit; font-size:14px; font-weight:600; color:#1f2348; background:#fff;
  box-shadow:inset 0 0 0 2px rgba(31,35,72,.1); }
.nq-cc-name-input:focus { outline:none; box-shadow:inset 0 0 0 2px #0582ca; }
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
.nq-cc-receive:hover, .nq-cc-receive:focus-visible { background:rgba(31,35,72,.12); }
.nq-cc-receive:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:2px; }
.nq-cc-send { flex:1; display:inline-flex; align-items:center; justify-content:center; gap:7px; height:32px;
  border:none; border-radius:500px; cursor:pointer; font-family:inherit; font-size:13px; font-weight:700;
  color:#fff; background-color:#0582ca; background-image:radial-gradient(100% 100% at 100% 100%, #265dd7, #0582ca); }
.nq-cc-send:hover { background-image:radial-gradient(100% 100% at 100% 100%, #1f4fbc, #0473b3); }
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

/* send view: the mini-wallet send — recipient + amount here, the user's own
   wallet only appears for the approval (Hub checkout / Nimiq Pay confirm) */
.nq-cc-view-send { display:none; }
.nq-cc.nq-cc-show-send .nq-cc-view-main { display:none; }
.nq-cc.nq-cc-show-send .nq-cc-view-send { display:block; }
.nq-cc-send-body { display:flex; flex-direction:column; gap:8px; padding:10px 8px 8px; }
.nq-cc-field-label { font-size:12px; font-weight:600; color:var(--nq-cc-menu-muted, rgba(31,35,72,.5)); }
/* inputs: inset box-shadow border, never border (rule 1) */
.nq-cc-input { width:100%; border:none; border-radius:8px; padding:9px 10px; font-family:inherit;
  font-size:14px; font-weight:600; color:#1f2348; background:#fff;
  box-shadow:inset 0 0 0 2px rgba(31,35,72,.12); }
.nq-cc-input:focus { outline:none; box-shadow:inset 0 0 0 2px #0582ca; }
.nq-cc-input::placeholder { color:rgba(31,35,72,.3); font-weight:600; }
.nq-cc-input-addr { font-family:'Fira Mono',ui-monospace,monospace; font-size:12px;
  letter-spacing:.02em; text-transform:uppercase; }
.nq-cc-amount-row { position:relative; }
.nq-cc-amount-row .nq-cc-input { padding-right:44px; }
.nq-cc-amount-suffix { position:absolute; right:11px; top:50%; transform:translateY(-50%);
  font-size:13px; font-weight:700; color:rgba(31,35,72,.45); pointer-events:none; }
.nq-cc-send-hint { font-size:12px; font-weight:600; color:var(--nq-cc-menu-muted, rgba(31,35,72,.5)); }
.nq-cc-send-hint:empty { display:none; }
.nq-cc-send-confirm { width:100%; height:36px; border:none; border-radius:500px; margin-top:2px;
  font-family:inherit; font-size:14px; font-weight:700; color:#fff; cursor:pointer;
  background-color:#0582ca; background-image:radial-gradient(100% 100% at 100% 100%, #265dd7, #0582ca); }
.nq-cc-send-confirm:hover:not(:disabled) { background-image:radial-gradient(100% 100% at 100% 100%, #1f4fbc, #0473b3); }
.nq-cc-send-confirm:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:3px; }
.nq-cc-send-confirm:disabled { opacity:.4; cursor:default; }
.nq-cc-send-error { font-size:12px; font-weight:600; color:#d94432; text-align:center; }
.nq-cc-send-error:empty { display:none; }
.nq-cc-send-done { display:none; flex-direction:column; align-items:center; gap:6px;
  padding:16px 0 10px; color:#13b59d; font-size:14px; font-weight:700; }
.nq-cc-view-send.nq-cc-sent .nq-cc-send-body { display:none; }
.nq-cc-view-send.nq-cc-sent .nq-cc-send-done { display:flex; }
.nq-cc-back { display:flex; align-items:center; gap:6px; width:100%; padding:7px 10px; border:none;
  border-radius:6px; background:none; font-family:inherit; font-size:15px;
  color:var(--nq-cc-menu-muted, rgba(31,35,72,.6)); text-align:left; cursor:pointer;
  transition:background .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-back:hover { background:var(--nq-cc-menu-hover, rgba(31,35,72,.06)); }
.nq-cc-back:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:-2px; }
.nq-cc-receive-body { display:flex; flex-direction:column; align-items:center; padding:10px 8px 8px; }
.nq-cc-qr { display:block; width:164px; height:164px; }
.nq-cc-qr:empty { display:none; }
.nq-cc-qr > * { display:block; width:100%; height:100%; }
.nq-cc-receive-hint { font-size:12px; font-weight:600; color:var(--nq-cc-menu-muted, rgba(31,35,72,.45)); margin:8px 0 2px; }

/* tap-to-copy address: upstream Copyable verbatim — light-blue tooltip, tinted
   field, and the blue HOLDS after copy until focus leaves */
.nq-cc-copy-wrap { position:relative; display:block; margin-top:10px; width:100%; }
.nq-cc-address { display:grid; grid-template-columns:repeat(3, 1fr); gap:3px 0; justify-items:center;
  width:100%; padding:8px 6px; border:none; border-radius:6px; background:rgba(31,35,72,.04); cursor:pointer;
  font-family:'Fira Mono',ui-monospace,monospace; font-size:12px; color:var(--nq-cc-menu-muted, rgba(31,35,72,.7));
  transition:background .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)), color .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-address:hover, .nq-cc-address:focus,
.nq-cc-copy-wrap.nq-cc-copied .nq-cc-address, .nq-cc-copy-wrap.nq-cc-copied-hold .nq-cc-address {
  background:rgba(5,130,202,.08); color:#0582ca; }
.nq-cc-address:focus-visible { outline:2px solid #0582ca; outline-offset:2px; }
.nq-cc-copy-tooltip { position:absolute; left:50%; bottom:calc(100% + 10px);
  transform:translateX(-50%) translateY(4px); padding:8px 12px; border-radius:4px;
  background-image:radial-gradient(100% 100% at 100% 100%, #265dd7, #0582ca); color:#fff; font-size:13px;
  font-weight:600; line-height:1.1; white-space:nowrap; pointer-events:none; opacity:0; z-index:30;
  box-shadow:0 2px 2.5px rgba(31,35,72,.02), 0 7px 8.5px rgba(31,35,72,.04), 0 18px 38px rgba(31,35,72,.07);
  transition:opacity .3s var(--nimiq-ease, cubic-bezier(.25,0,0,1)), transform .3s var(--nimiq-ease, cubic-bezier(.25,0,0,1));
  transition-delay:.2s; }
.nq-cc-copy-tooltip::after { content:''; position:absolute; left:50%; top:calc(100% - 1px); width:14px; height:7px;
  margin-left:-7px; transform:scaleY(-1);
  background-image:radial-gradient(100% 100% at 100% 100%, #265dd7, #0582ca);
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
   ::-webkit-scrollbar — they live in the Firefox-only @supports block. */
.nq-cc-grid-wrap { position:relative; margin-top:6px; }
.nq-cc-grid { display:grid; gap:4px; padding:4px; padding-right:8px; max-height:196px; overflow-y:auto;
  background:rgba(31,35,72,.04); border-radius:6px; }
.nq-cc-grid.nq-cc-cols-2 { grid-template-columns:1fr 1fr; }
.nq-cc-grid.nq-cc-cols-3 { grid-template-columns:repeat(3, 1fr); }
.nq-cc-grid::-webkit-scrollbar { width:11px; }
.nq-cc-grid::-webkit-scrollbar-track { background:transparent; margin:4px 0; }
.nq-cc-grid::-webkit-scrollbar-thumb { background:rgba(31,35,72,.28); border-radius:500px;
  border:3px solid transparent; background-clip:padding-box; }
.nq-cc-grid::-webkit-scrollbar-thumb:hover { background-color:rgba(31,35,72,.45); }
@supports (-moz-appearance: none) {
  .nq-cc-grid { scrollbar-width:thin; scrollbar-color:rgba(31,35,72,.28) transparent; }
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
.nq-cc-disconnect:hover { color:#d94432; }
.nq-cc-disconnect:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:2px; border-radius:3px; }
.nq-cc-badge { font-size:12px; line-height:1; font-weight:700; letter-spacing:.09em; text-transform:uppercase;
  color:#fc8702; background:rgba(31,35,72,.07); padding:5px 8px; border-radius:4px; }
/* no footer at all when there is nothing to show */
.nq-cc:not([data-testnet]):not([data-connected]) .nq-cc-footer,
.nq-cc:not([data-testnet]):not([data-connected]) .nq-cc-footer-divider,
.nq-cc[data-mode="miniapp"]:not([data-testnet]) .nq-cc-footer,
.nq-cc[data-mode="miniapp"]:not([data-testnet]) .nq-cc-footer-divider { display:none; }

`;
  document.head.appendChild(style);
}

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

/** Mount the fleet corner control into `container`. Owns its state + listeners. */
export function mountCornerControl(
  container: HTMLElement,
  options: CornerControlOptions,
): CornerControlHandle {
  const { wallet, i18n } = options;
  const languages = options.languages ?? SHELL_LANGUAGES;
  const showReceive = options.receive !== false;
  const hasBalance = typeof options.getBalanceLuna === 'function';
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
  if (options.network === 'test') root.dataset.testnet = '';
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
  function applyLang(): void {
    for (const [node, key] of i18nNodes) node.textContent = i18n.t(key);
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

  // ---- receive view content -------------------------------------------------
  const backBtn = el('button', 'nq-cc-back', viewReceive);
  backBtn.type = 'button';
  backBtn.appendChild(document.createTextNode('‹ '));
  const backLabel = el('span', 'nq-cc-strong', backBtn);
  tNode(backLabel, 'shell.receive');
  backBtn.addEventListener('click', () => root.classList.remove('nq-cc-show-receive'));
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

  let copyTimer: ReturnType<typeof setTimeout> | undefined;
  addressBtn.addEventListener('click', () => {
    const addr = wallet?.account?.address;
    if (!addr) return;
    try { void navigator.clipboard.writeText(addr); } catch { /* clipboard unavailable */ }
    copyWrap.classList.add('nq-cc-copied', 'nq-cc-copied-hold');
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => copyWrap.classList.remove('nq-cc-copied'), 800);
  });
  addressBtn.addEventListener('blur', () => copyWrap.classList.remove('nq-cc-copied-hold'));

  // ---- send view content ----------------------------------------------------
  const sendBackBtn = el('button', 'nq-cc-back', viewSend);
  sendBackBtn.type = 'button';
  sendBackBtn.appendChild(document.createTextNode('‹ '));
  const sendBackLabel = el('span', 'nq-cc-strong', sendBackBtn);
  tNode(sendBackLabel, 'shell.send');
  sendBackBtn.addEventListener('click', () => closeSend());
  el('div', 'nq-cc-divider', viewSend);
  const sendBody = el('div', 'nq-cc-send-body', viewSend);
  const recipientLabel = el('label', 'nq-cc-field-label', sendBody);
  tNode(recipientLabel, 'shell.recipient');
  const recipientInput = el('input', 'nq-cc-input nq-cc-input-addr', sendBody);
  recipientInput.placeholder = 'NQ00 0000 0000 0000 0000 0000 0000 0000 0000';
  recipientInput.autocomplete = 'off';
  recipientInput.spellcheck = false;
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
  const compactRecipient = (): string => recipientInput.value.toUpperCase().replace(/[\s-]+/g, '');
  const amountNim = (): number => {
    const n = Number(amountInput.value.replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };
  function validateSend(): void {
    const okAddress = NIM_ADDRESS_RE.test(compactRecipient());
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
  function openReceive(): void {
    const account = wallet?.account ?? null;
    if (!account) return;
    root.classList.add('nq-cc-show-receive');
    const compact = account.address.replace(/\s+/g, '');
    // 9 four-char blocks, 3×3, uppercase Fira Mono (the canonical address grid)
    const blocks = compact.match(/.{1,4}/g) ?? [];
    addressBtn.textContent = '';
    for (const block of blocks) {
      const span = el('span', undefined, addressBtn);
      span.textContent = block;
    }
    if (options.qr && qrFor !== compact) {
      qrSlot.textContent = '';
      qrSlot.appendChild(options.qr(`nimiq:${compact}`, 164));
      qrFor = compact;
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
    if (hasFiat && balanceLuna !== null) {
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
  function setOpen(open: boolean): void {
    menu.hidden = !open;
    face.setAttribute('aria-expanded', String(open));
    faceFlag.setAttribute('aria-expanded', String(open));
    if (open) {
      document.addEventListener('click', onDocClick, true);
      document.addEventListener('keydown', onKeydown);
      void refreshBalance();
    } else {
      root.classList.remove('nq-cc-show-receive');
      root.classList.remove('nq-cc-show-send');
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

  const unsubWallet = wallet
    ? wallet.onAccountChange(() => {
      renderFace();
      if (wallet.account) renderWalletBlock();
      else { balanceLuna = null; balanceStack.hidden = true; }
    })
    : () => { /* language-only: no wallet to subscribe to */ };
  const unsubLang = i18n.onChange(() => {
    applyLang();
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
      root.remove();
    },
  };
}
