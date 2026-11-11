// "Other chains": the mini wallet's EVM section (MetaMask and any other
// browser wallet, on Polygon).
//
// nimiq.markets built this first, as its own DOM pushed into the shell's menu
// after every mount (web/src/components/market/ShellCorner.vue). This is that
// section drawn natively, so a fleet app gets it from one option and markets
// can delete the injection.
//
// Signed out: one row per way to connect. Connected: the wallet's row with the
// short address and a Disconnect, then a USDC and a USDT row whose tap opens
// the shell's own receive view for that token. Rows that cannot do anything yet
// (WalletConnect, Ledger) are plain text marked Soon, never buttons.
//
// THE LOGO IS THE WALLET'S OWN. EIP-6963 has every wallet hand over its icon,
// so the artwork here is whatever the wallet announced. A provider that only
// sits at window.ethereum announced nothing, and gets the neutral wallet glyph
// rather than a logo drawn from memory.

import type { I18n } from '../i18n';
import {
  evmFailure,
  isMobileBrowser,
  metaMaskAppLink,
  shortEvmAddress,
  type EvmConnector,
  type EvmWallet,
} from '../evm';
import { mountAssetList, type AssetListHandle, type ShellAsset } from './asset-list';

export interface EvmSectionOptions {
  evm: EvmWallet;
  i18n: I18n;
  /** Neutral glyph (an SVG string) for a wallet that announced no icon. */
  glyph: string;
  /** Open the receive view for one of this section's tokens. Rows are plain,
   *  unpressable text without it. */
  onReceive?: (asset: ShellAsset) => void;
  /** Called after the EVM account changed and the section repainted. */
  onAccountChange?: () => void;
  /** Leave the page for a URL (the MetaMask app link). Default: location.href. */
  navigate?: (url: string) => void;
  /** The page the MetaMask app link reopens. Default: window.location. */
  location?: Pick<Location, 'host' | 'pathname' | 'search'>;
  /** Default: a user-agent test. */
  isMobile?: () => boolean;
}

export interface EvmSectionHandle {
  el: HTMLDivElement;
  /** Re-read the token balances. A no-op while signed out. */
  refresh(force?: boolean): Promise<void>;
  /** Restate every string after a language change. */
  applyLang(): void;
  /** Was this asset minted by this section? (So the host can tell an EVM
   *  receive view from a Nimiq one.) */
  owns(asset: ShellAsset): boolean;
  destroy(): void;
}

export const EVM_SECTION_CSS = `
/* "Other chains": section label, wallet rows, the Soon rows */
.nq-cc-evm-label { margin:2px 10px 4px; font-size:12px; font-weight:700; letter-spacing:.06em;
  text-transform:uppercase; color:var(--nq-cc-menu-muted, rgba(31,35,72,.6)); }
.nq-cc-evm-row { display:flex; align-items:center; gap:12px; width:100%; padding:7px 10px;
  border:none; border-radius:6px; background:none; font-family:inherit; text-align:left;
  color:var(--nq-cc-menu-fg, var(--nimiq-blue, #1f2348)); }
button.nq-cc-evm-row { cursor:pointer;
  transition:background .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
button.nq-cc-evm-row:hover { background:var(--nq-cc-menu-hover, rgba(31,35,72,.06)); }
button.nq-cc-evm-row:focus-visible { outline:2px solid var(--nq-cc-accent, var(--nimiq-light-blue, #0582ca)); outline-offset:-2px; }
button.nq-cc-evm-row:disabled { cursor:default; }
.nq-cc-evm-row[data-soon] .nq-cc-evm-mark,
.nq-cc-evm-row[data-soon] .nq-cc-evm-id { opacity:.55; }
.nq-cc-evm-mark { display:flex; align-items:center; justify-content:center; flex:none; width:28px; height:28px; }
.nq-cc-evm-mark img { display:block; width:100%; height:100%; border-radius:6px; }
.nq-cc-evm-mark svg { display:block; width:20px; height:20px; }
.nq-cc-evm-id { display:flex; flex-direction:column; gap:1px; min-width:0; }
.nq-cc-evm-name { font-size:14px; font-weight:700; }
.nq-cc-evm-sub { font-size:12px; font-weight:600; color:var(--nq-cc-menu-muted, rgba(31,35,72,.6)); }
.nq-cc-evm-sub:empty { display:none; }
.nq-cc-evm-sub[data-error] { color:var(--nq-cc-danger, #d94432); }
.nq-cc-evm-sub.nq-cc-evm-addr { font-family:'Fira Mono',ui-monospace,monospace; letter-spacing:.02em; }
.nq-cc-evm-pill { margin-left:auto; flex:none; padding:3px 8px; border:none; border-radius:999px;
  font-family:inherit; font-size:12px; font-weight:700; white-space:nowrap;
  background:var(--nq-cc-menu-line, rgba(31,35,72,.08));
  color:var(--nq-cc-menu-muted, rgba(31,35,72,.6)); }
button.nq-cc-evm-pill { cursor:pointer;
  transition:color .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
button.nq-cc-evm-pill:hover { color:var(--nq-cc-danger, #d94432); }
button.nq-cc-evm-pill:focus-visible { outline:2px solid var(--nq-cc-accent, var(--nimiq-light-blue, #0582ca)); outline-offset:2px; }
.nq-cc-evm-assets { padding:0 2px; }
.nq-cc-evm-assets:empty { display:none; }
`;

/** The line under a planned connector's name, for the two the shell knows. */
const PLANNED_NOTE: Record<string, string> = {
  walletconnect: 'shell.evmAnyMobile',
  ledger: 'shell.evmLedgerSub',
};

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

/** Mount the section into `parent`. The caller owns the dividers around it. */
export function mountEvmSection(parent: HTMLElement, options: EvmSectionOptions): EvmSectionHandle {
  const { evm, i18n } = options;
  const isMobile = options.isMobile ?? (() => isMobileBrowser());
  const navigate = options.navigate ?? ((url: string) => { window.location.href = url; });

  const root = el('div', 'nq-cc-section nq-cc-evm', parent);
  const label = el('p', 'nq-cc-evm-label', root);
  const walletRows = el('div', 'nq-cc-evm-wallets', root);
  const assetsHost = el('div', 'nq-cc-evm-assets', root);
  const plannedRows = el('div', 'nq-cc-evm-planned', root);

  /** The row that is mid-connect, and the line a failed attempt left behind. */
  let busy: string | null = null;
  let notice: { id: string; key: string; error: boolean } | null = null;
  let destroyed = false;

  let assets: ShellAsset[] = [];
  const minted = new WeakSet<ShellAsset>();
  let assetList: AssetListHandle | null = null;
  let assetsFor: string | null = null;

  function mark(row: HTMLElement, connector: EvmConnector | undefined): void {
    const slot = el('span', 'nq-cc-evm-mark', row);
    const fallback = (): void => { slot.innerHTML = options.glyph; };
    if (!connector?.icon) { fallback(); return; }
    const img = el('img', undefined, slot);
    img.alt = '';
    img.addEventListener('error', fallback);
    img.src = connector.icon;
  }

  const nameOf = (connector: EvmConnector | undefined): string =>
    connector?.name ?? i18n.t('shell.evmBrowserWallet');

  async function onConnect(connector: EvmConnector): Promise<void> {
    if (busy) return;
    notice = null;
    if (connector.kind === 'install') {
      // A phone browser has no extension to install. The one route is the
      // MetaMask app's own browser, opened on this page.
      if (isMobile()) { navigate(metaMaskAppLink(options.location ?? window.location)); return; }
      notice = { id: connector.id, key: 'shell.evmInstall', error: false };
      render();
      return;
    }
    busy = connector.id;
    render();
    try {
      await evm.connect(connector.id);
    } catch (err) {
      // Closing the wallet prompt is a normal thing to do, so it gets a quiet
      // word and no error colour. Anything else did go wrong.
      const cancelled = evmFailure(err) === 'cancelled';
      notice = {
        id: connector.id,
        key: cancelled ? 'shell.evmCancelled' : 'shell.evmFailed',
        error: !cancelled,
      };
    } finally {
      busy = null;
      if (!destroyed) render();
    }
  }

  function render(): void {
    label.textContent = i18n.t('shell.evmOtherChains');
    walletRows.textContent = '';
    plannedRows.textContent = '';
    const account = evm.account;
    const connectors = evm.connectors;

    if (account) {
      const connector = connectors.find((c) => c.id === account.connector);
      const row = el('div', 'nq-cc-evm-row', walletRows);
      row.dataset.connected = '';
      mark(row, connector);
      const id = el('span', 'nq-cc-evm-id', row);
      el('span', 'nq-cc-evm-name', id).textContent = nameOf(connector);
      const addr = el('span', 'nq-cc-evm-sub nq-cc-evm-addr', id);
      addr.textContent = shortEvmAddress(account.address);
      addr.title = account.address;
      const off = el('button', 'nq-cc-evm-pill nq-cc-evm-disconnect', row);
      off.type = 'button';
      off.textContent = i18n.t('shell.disconnect');
      off.addEventListener('click', () => evm.disconnect());
    }

    for (const connector of connectors) {
      if (connector.kind === 'planned') {
        const row = el('div', 'nq-cc-evm-row', plannedRows);
        row.dataset.soon = '';
        mark(row, connector);
        const id = el('span', 'nq-cc-evm-id', row);
        el('span', 'nq-cc-evm-name', id).textContent = nameOf(connector);
        const noteKey = PLANNED_NOTE[connector.id];
        el('span', 'nq-cc-evm-sub', id).textContent = noteKey ? i18n.t(noteKey) : '';
        el('span', 'nq-cc-evm-pill', row).textContent = i18n.t('shell.evmSoon');
        continue;
      }
      if (account) continue; // one account at a time: disconnect to pick another
      const row = el('button', 'nq-cc-evm-row', walletRows);
      row.type = 'button';
      row.dataset.connector = connector.id;
      row.disabled = busy !== null;
      row.addEventListener('click', () => void onConnect(connector));
      mark(row, connector);
      const id = el('span', 'nq-cc-evm-id', row);
      el('span', 'nq-cc-evm-name', id).textContent = nameOf(connector);
      const sub = el('span', 'nq-cc-evm-sub', id);
      if (notice?.id === connector.id) {
        sub.textContent = i18n.t(notice.key);
        if (notice.error) sub.dataset.error = '';
      } else {
        sub.textContent = i18n.t('shell.evmSub', { network: evm.chain.name });
      }
      el('span', 'nq-cc-evm-pill', row).textContent =
        i18n.t(busy === connector.id ? 'shell.connecting' : 'shell.evmConnect');
    }
  }

  /** The token rows belong to ONE address. A different address gets a fresh
   *  list, so one account's balance never sits under another's name. */
  function syncAssets(): void {
    const address = evm.account?.address ?? null;
    if (address === assetsFor) return;
    assetsFor = address;
    assetList?.destroy();
    assetList = null;
    assets = [];
    if (!address) return;
    assets = evm.tokens.map((token) => {
      const asset: ShellAsset = {
        ticker: token.ticker,
        name: token.name,
        network: evm.chain.name,
        decimals: token.decimals,
        address,
        balance: () => evm.balanceOf(token.address, address),
      };
      minted.add(asset);
      return asset;
    });
    assetList = mountAssetList(assetsHost, {
      assets: () => assets,
      // Read on menu-open and on connect, not at mount: see the corner's own
      // note on why a list inside a closed menu does not read at page load.
      autoRefresh: false,
      onSelect: options.onReceive,
    });
  }

  async function refresh(force = false): Promise<void> {
    if (destroyed || !assetList) return;
    await assetList.refresh(force);
  }

  const unsubAccount = evm.onAccountChange(() => {
    notice = null;
    syncAssets();
    render();
    options.onAccountChange?.();
    void refresh(true);
  });
  // A wallet announcing late adds its row (and swaps the install row out).
  const unsubConnectors = evm.onConnectorsChange(() => render());

  syncAssets();
  render();

  return {
    el: root,
    refresh,
    applyLang: render,
    owns: (asset) => minted.has(asset),
    destroy() {
      destroyed = true;
      unsubAccount();
      unsubConnectors();
      assetList?.destroy();
      root.remove();
    },
  };
}
