// Profile widget — renders the connected account into a container: identicon +
// label + address + (optional injected) balance. Re-renders on account change.
//
// The identicon uses @nimiq/iqons (Iqons.toDataUrl) if it's available — it's an
// optional peer dependency, dynamically imported, so apps that don't want it (or
// run where it can't load) just get the hexagon placeholder. Balance is NOT
// fetched here (the shell does no chain reads — that's nimiq-settlement's job);
// pass a `getBalance` and the widget renders and refreshes it.

import type { Account, Wallet } from '../wallet';
import type { I18n } from '../i18n';

// Inline hexagon placeholder (the Nimiq identicon "no address" state).
const PLACEHOLDER_SVG =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg width="64" height="64" viewBox="0 -4 64 64" xmlns="http://www.w3.org/2000/svg">' +
      '<path opacity=".1" d="M62.3 25.4L49.2 2.6A5.3 5.3 0 0 0 44.6 0H18.4c-1.9 0-3.6 1-4.6 2.6L.7 25.4c-1 1.6-1 3.6 0 5.2l13.1 22.8c1 1.6 2.7 2.6 4.6 2.6h26.2c1.9 0 3.6-1 4.6-2.6l13-22.8c1-1.6 1-3.6.1-5.2z" fill="#1F2348"/></svg>',
  );

export interface ProfileWidgetOptions {
  /** The wallet to bind to. The widget subscribes to onAccountChange. */
  wallet: Wallet;
  /** i18n for the widget's labels (Address / Balance / Disconnect / Copy …). */
  i18n: I18n;
  /** Optional balance supplier. Called on render with the current address;
   *  return a pre-formatted string (e.g. "1,234.5 NIM"). The shell does no
   *  chain reads itself. */
  getBalance?: (address: string) => Promise<string> | string;
  /** Show a Disconnect button wired to wallet.disconnect(). Default true. */
  showDisconnect?: boolean;
  /** Show a Copy-address button. Default true. */
  showCopy?: boolean;
  /** Identicon pixel size. Default 48. */
  identiconSize?: number;
  /** Inject the widget's <style> once. Default true. */
  injectStyles?: boolean;
}

export interface ProfileWidgetHandle {
  el: HTMLDivElement;
  /** Force a re-render (e.g. after balance might have changed). */
  refresh(): void;
  destroy(): void;
}

const STYLE_ID = 'nimiq-shell-profile-style';

function ensureStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.nq-profile { display:flex; align-items:center; gap:12px; font-family:'Mulish',system-ui,sans-serif; }
.nq-profile__icon { flex-shrink:0; border-radius:50%; overflow:hidden; background:#fff; }
.nq-profile__icon img { display:block; width:100%; height:100%; }
.nq-profile__body { min-width:0; display:flex; flex-direction:column; gap:2px; }
.nq-profile__label { font-weight:700; font-size:15px; color:#1f2348; line-height:1.2; }
.nq-profile__addr { font-size:12px; color:#5f6370; font-family:ui-monospace,monospace; word-break:break-all; }
.nq-profile__bal { font-size:13px; color:#1f2348; font-weight:600; }
.nq-profile__actions { display:flex; gap:8px; margin-left:auto; flex-shrink:0; }
.nq-profile__btn { font:inherit; font-size:13px; font-weight:600; padding:6px 12px; border-radius:500px;
  border:1px solid #e5e7ef; background:#fff; color:#1f2348; cursor:pointer; }
.nq-profile__btn:hover { background:#f4f5f9; }
`;
  document.head.appendChild(style);
}

/** Resolve an identicon data URL via @nimiq/iqons when available, else the
 *  hexagon placeholder. Best-effort, never throws. */
async function identiconUrl(address: string | null): Promise<string> {
  if (!address) return PLACEHOLDER_SVG;
  try {
    // @nimiq/iqons is an OPTIONAL peer dependency. The computed specifier keeps
    // tsc from trying to statically resolve it (consumers that want identicons
    // install it; the rest get the placeholder). Bun/bundlers resolve it at run.
    const spec = '@nimiq/iqons';
    const mod: any = await import(/* @vite-ignore */ spec);
    const Iqons = mod.default ?? mod;
    if (Iqons && typeof Iqons.toDataUrl === 'function') {
      return await Iqons.toDataUrl(address);
    }
  } catch {
    // @nimiq/iqons not installed / unreachable — fall through to placeholder.
  }
  return PLACEHOLDER_SVG;
}

/** Mount the profile widget into `container`. */
export function mountProfileWidget(
  container: HTMLElement,
  options: ProfileWidgetOptions,
): ProfileWidgetHandle {
  const { wallet, i18n } = options;
  const size = options.identiconSize ?? 48;
  const showDisconnect = options.showDisconnect !== false;
  const showCopy = options.showCopy !== false;
  if (options.injectStyles !== false) ensureStyles();

  const root = document.createElement('div');
  root.className = 'nq-profile';
  container.appendChild(root);

  // A monotonically increasing render token guards against a slow identicon /
  // balance promise from a stale account overwriting a newer render.
  let renderToken = 0;

  async function render(): Promise<void> {
    const token = ++renderToken;
    const account: Account | null = wallet.account;
    root.textContent = '';

    const icon = document.createElement('span');
    icon.className = 'nq-profile__icon';
    icon.style.width = `${size}px`;
    icon.style.height = `${size}px`;
    const img = document.createElement('img');
    img.src = PLACEHOLDER_SVG;
    img.alt = 'identicon';
    icon.appendChild(img);
    root.appendChild(icon);

    const body = document.createElement('div');
    body.className = 'nq-profile__body';
    const label = document.createElement('span');
    label.className = 'nq-profile__label';
    label.textContent = account
      ? account.label || i18n.t('shell.account')
      : i18n.t('shell.notConnected');
    body.appendChild(label);

    if (account) {
      const addr = document.createElement('span');
      addr.className = 'nq-profile__addr';
      addr.textContent = account.address;
      body.appendChild(addr);

      if (options.getBalance) {
        const bal = document.createElement('span');
        bal.className = 'nq-profile__bal';
        bal.textContent = '…';
        body.appendChild(bal);
        Promise.resolve(options.getBalance(account.address))
          .then((text) => {
            if (token === renderToken) bal.textContent = text;
          })
          .catch(() => {
            if (token === renderToken) bal.textContent = '';
          });
      }
    }
    root.appendChild(body);

    if (account && (showCopy || showDisconnect)) {
      const actions = document.createElement('div');
      actions.className = 'nq-profile__actions';
      if (showCopy) {
        const copy = document.createElement('button');
        copy.type = 'button';
        copy.className = 'nq-profile__btn';
        copy.textContent = i18n.t('shell.copyAddress');
        copy.addEventListener('click', async () => {
          try {
            await navigator.clipboard?.writeText(account.address);
            const prev = copy.textContent;
            copy.textContent = i18n.t('shell.copied');
            setTimeout(() => {
              copy.textContent = prev;
            }, 1200);
          } catch {
            // clipboard blocked — no-op
          }
        });
        actions.appendChild(copy);
      }
      if (showDisconnect) {
        const dc = document.createElement('button');
        dc.type = 'button';
        dc.className = 'nq-profile__btn';
        dc.textContent = i18n.t('shell.disconnect');
        dc.addEventListener('click', () => wallet.disconnect());
        actions.appendChild(dc);
      }
      root.appendChild(actions);
    }

    // Swap in the real identicon once resolved (placeholder shows meanwhile).
    const url = await identiconUrl(account?.address ?? null);
    if (token === renderToken) img.src = url;
  }

  void render();
  const unsubWallet = wallet.onAccountChange(() => void render());
  const unsubLang = i18n.onChange(() => void render());

  return {
    el: root,
    refresh() {
      void render();
    },
    destroy() {
      unsubWallet();
      unsubLang();
      root.remove();
    },
  };
}
