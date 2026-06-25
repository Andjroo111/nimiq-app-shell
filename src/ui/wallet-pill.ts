// Wallet pill — the fleet-standard wallet control, in both states, hashmark-style.
//
//   • Disconnected → an OUTLINE pill (transparent, hairline border, wallet glyph
//     + "Connect wallet"). Click → wallet.connect() with connecting/retry labels.
//   • Connected → a compact pill (identicon placeholder + short label + caret)
//     that opens a white dropdown hosting the shared mountProfileWidget (address +
//     copy + disconnect).
//
// Theme-adaptive: the pill uses currentColor so it reads on a navy or a light
// header; the dropdown is always a white card (so the profile widget's dark text
// is correct). Self-injects its styles. Promotes nimiq.life's mountWalletPill.

import type { I18n } from '../i18n';
import type { Wallet } from '../wallet';
import { mountProfileWidget, type ProfileWidgetHandle } from './profile';

export interface WalletPillOptions {
  wallet: Wallet;
  i18n: I18n;
  /** Inject the component's <style> once. Default true. */
  injectStyles?: boolean;
}

export interface WalletPillHandle {
  el: HTMLDivElement;
  destroy(): void;
}

const STYLE_ID = 'nimiq-shell-walletpill-style';

function ensureStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.nq-wallet { position:relative; font-family:'Mulish',system-ui,sans-serif; }
.nq-connect { display:inline-flex; align-items:center; gap:8px; height:40px; padding:0 16px;
  border:1px solid color-mix(in srgb, currentColor 22%, transparent); border-radius:999px;
  background:transparent; color:inherit; font:inherit; font-size:14px; font-weight:700; line-height:1; cursor:pointer;
  transition:border-color .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)), background-color .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)), transform .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-connect:hover { border-color: color-mix(in srgb, currentColor 45%, transparent); background: color-mix(in srgb, currentColor 6%, transparent); transform:translateY(-1px); }
.nq-connect:active { transform:translateY(0); }
.nq-connect:disabled { opacity:.7; cursor:default; transform:none; }
.nq-connect:focus-visible { outline:2px solid #0582ca; outline-offset:3px; }
.nq-connect__icon { width:18px; height:18px; flex-shrink:0; opacity:.85; }
.nq-wallet__btn { display:inline-flex; align-items:center; gap:8px; height:40px; padding:4px 12px 4px 5px;
  border:1px solid color-mix(in srgb, currentColor 22%, transparent); border-radius:999px;
  background:transparent; color:inherit; font:inherit; font-size:13px; font-weight:700; cursor:pointer;
  transition:border-color .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)), background-color .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-wallet__btn:hover { border-color: color-mix(in srgb, currentColor 40%, transparent); background: color-mix(in srgb, currentColor 6%, transparent); }
.nq-wallet__btn:focus-visible { outline:2px solid #0582ca; outline-offset:3px; }
.nq-wallet__icon { width:28px; height:28px; flex-shrink:0; border-radius:50%; background: color-mix(in srgb, currentColor 12%, transparent); }
.nq-wallet__label { white-space:nowrap; font-family:ui-monospace,'Fira Mono',monospace; letter-spacing:.02em; }
.nq-wallet__caret { width:10px; height:6px; flex-shrink:0; color:currentColor; opacity:.6; }
.nq-wallet__menu { position:absolute; top:calc(100% + 10px); right:0; z-index:40; min-width:280px; max-width:92vw;
  padding:16px; background:#fff; border-radius:12px; box-shadow:0 12px 36px rgba(13,11,36,.28); }
@media (max-width:560px){
  .nq-wallet { position:static; }
  .nq-wallet__menu { left:clamp(16px,4vw,28px); right:clamp(16px,4vw,28px); min-width:0; max-width:none; }
}
`;
  document.head.appendChild(style);
}

// Hexagon placeholder for the connected-pill identicon (@nimiq/iqons is optional).
const PLACEHOLDER_SVG =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg width="64" height="64" viewBox="0 -4 64 64" xmlns="http://www.w3.org/2000/svg">' +
      '<path opacity=".25" d="M62.3 25.4L49.2 2.6A5.3 5.3 0 0 0 44.6 0H18.4c-1.9 0-3.6 1-4.6 2.6L.7 25.4c-1 1.6-1 3.6 0 5.2l13.1 22.8c1 1.6 2.7 2.6 4.6 2.6h26.2c1.9 0 3.6-1 4.6-2.6l13-22.8c1-1.6 1-3.6.1-5.2z" fill="currentColor"/></svg>',
  );

const WALLET_ICON =
  '<svg class="nq-connect__icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
  '<rect x="2" y="5" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>' +
  '<path d="M2 9h16" stroke="currentColor" stroke-width="1.5"/>' +
  '<circle cx="6" cy="13" r="1" fill="currentColor"/></svg>';

const CARET =
  '<svg class="nq-wallet__caret" viewBox="0 0 10 6" aria-hidden="true">' +
  '<path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function shortLabel(account: { label?: string; address: string }, fallback: string): string {
  if (account.label) return account.label;
  const addr = account.address?.trim() ?? '';
  if (!addr) return fallback;
  return `${addr.slice(0, 7)}…${addr.slice(-4)}`;
}

/** Mount the wallet pill into `container`. Owns its own state + listeners. */
export function mountWalletPill(
  container: HTMLElement,
  options: WalletPillOptions,
): WalletPillHandle {
  const { wallet, i18n } = options;
  if (options.injectStyles !== false) ensureStyles();

  const root = document.createElement('div');
  root.className = 'nq-wallet';
  container.appendChild(root);

  let profileHandle: ProfileWidgetHandle | null = null;
  let menuOpen = false;

  function teardownConnected(): void {
    profileHandle?.destroy();
    profileHandle = null;
    document.removeEventListener('click', onDocClick, true);
    document.removeEventListener('keydown', onKeydown);
    menuOpen = false;
  }
  function onDocClick(e: MouseEvent): void {
    if (!root.contains(e.target as Node)) closeMenu();
  }
  function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') closeMenu();
  }
  function closeMenu(): void {
    if (!menuOpen) return;
    menuOpen = false;
    render();
  }

  function renderConnect(): void {
    const btn = document.createElement('button');
    btn.className = 'nq-connect';
    btn.type = 'button';
    btn.innerHTML = WALLET_ICON + `<span>${i18n.t('shell.connectWallet')}</span>`;
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.innerHTML = WALLET_ICON + `<span>${i18n.t('shell.connecting')}</span>`;
      try {
        await wallet.connect();
      } catch {
        btn.disabled = false;
        btn.innerHTML = WALLET_ICON + `<span>${i18n.t('shell.retry')}</span>`;
      }
    });
    root.appendChild(btn);
  }

  function renderConnected(): void {
    const account = wallet.account!;
    const btn = document.createElement('button');
    btn.className = 'nq-wallet__btn';
    btn.type = 'button';
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-expanded', String(menuOpen));

    const icon = document.createElement('img');
    icon.className = 'nq-wallet__icon';
    icon.src = PLACEHOLDER_SVG;
    icon.alt = '';
    btn.appendChild(icon);

    const label = document.createElement('span');
    label.className = 'nq-wallet__label';
    label.textContent = shortLabel(account, i18n.t('shell.account'));
    btn.appendChild(label);
    btn.insertAdjacentHTML('beforeend', CARET);

    btn.addEventListener('click', () => {
      menuOpen = !menuOpen;
      render();
    });
    root.appendChild(btn);

    if (menuOpen) {
      const menu = document.createElement('div');
      menu.className = 'nq-wallet__menu';
      root.appendChild(menu);
      profileHandle = mountProfileWidget(menu, {
        wallet,
        i18n,
        identiconSize: 40,
        showCopy: true,
        showDisconnect: true,
      });
      document.addEventListener('click', onDocClick, true);
      document.addEventListener('keydown', onKeydown);
    }
  }

  function render(): void {
    teardownConnected();
    root.textContent = '';
    if (wallet.account) renderConnected();
    else renderConnect();
  }

  render();
  const unsubWallet = wallet.onAccountChange(() => {
    menuOpen = false;
    render();
  });
  const unsubLang = i18n.onChange(() => {
    if (!wallet.account) render();
  });

  return {
    el: root,
    destroy() {
      unsubWallet();
      unsubLang();
      teardownConnected();
      root.remove();
    },
  };
}
