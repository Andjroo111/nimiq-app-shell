// Asset list — the multi-asset balance stack inside the corner control's mini
// wallet (issue: Hashmark multi-asset seam, 2026-08-12).
//
// WHY THIS IS A SEAM AND NOT A FEATURE
//
// The corner's balance line was `getBalanceLuna?: (address) => Promise<number>`:
// one asset, one address, one chain, NIM's 5 decimals baked in. Every fleet app
// that holds more than NIM (Hashmark bets in NIM, USDT and POL; BTC is next)
// had no way to say so, and the shell has no business knowing what a Polygon
// RPC or a BTC explorer is. So the shell owns the PRESENTATION of a balance
// list and the host owns every read:
//
//   - one address per asset, not one address for the wallet. A BTC address and
//     a Polygon address are not the wallet's NIM address, and the Hub hands
//     them back from the same chooseAddress without any balances attached.
//   - one reader per asset, NOT one batched read of all of them. Nimiq
//     consensus, a Polygon RPC and a BTC explorer have wildly different
//     latencies; a single `read(): Promise<Balance[]>` would pin the whole list
//     to the slowest chain. Each row resolves on its own and fills in when it
//     lands.
//   - smallest units as bigint, with the asset's own decimals. 6-decimal USDT
//     and 8-decimal BTC through a float `x / 1e8` is the precision drift
//     `format/nim.ts` exists to end, so the same string digit engine formats
//     all of them (fmtUnits).
//
// Theming rides on the corner's own --nq-cc-* vars rather than inventing a
// second palette: this list is only ever drawn on the corner menu surface, and
// a host that themes that menu must not have to theme its contents separately.

import { fmtFiat, fmtUnits } from '../format/nim';

/** One asset the corner can show. The host supplies the address and the read;
 *  the shell owns the row. */
export interface ShellAsset {
  /** Ticker, shown in the row and used as this asset's identity: 'NIM', 'USDT'. */
  ticker: string;
  /** Decimals between the smallest unit and one whole coin. NIM 5, USDT 6, BTC 8. */
  decimals: number;
  /** Read this asset's balance in its SMALLEST unit. A rejection or null keeps
   *  the last known value on screen rather than blanking a real balance over a
   *  flaky RPC — a balance that vanishes reads as "your money is gone". */
  balance: () => Promise<bigint | number | null>;
  /** The chain this asset lives on, as a person would say it: 'Nimiq',
   *  'Polygon', 'Bitcoin'.
   *
   *  REQUIRED, and required on purpose. A ticker is not enough information to
   *  receive safely: USDT exists on Ethereum, Tron, Polygon, Solana and BSC,
   *  and this wallet can only ever accept the one the connected account holds.
   *  Someone reading a bare `USDT` row and withdrawing from an exchange on Tron
   *  loses the money. An optional field is a field that gets forgotten, and the
   *  cost of forgetting this one is somebody's balance, so the compiler asks
   *  for it instead. */
  network: string;
  /** Full name under the ticker ('Nimiq', 'Tether USD'). Omitted → ticker alone.
   *  Rendered next to `network`, and deduplicated when the two are the same
   *  word, so NIM reads 'Nimiq' rather than 'Nimiq · Nimiq'. */
  name?: string;
  /** Build the QR payload for this asset's address. Default: the bare address.
   *
   *  Bare is the safe default because it is what every wallet's scanner
   *  understands. `nimiq:` is correct for NIM and wrong for everything else, so
   *  hosts wanting a scheme (EIP-681 `ethereum:0x…@137`, `bitcoin:`) say so
   *  here rather than having one guessed from the ticker. */
  uri?: (address: string) => string;
  /** Row artwork, self-sized to `sizePx`. Omitted → the row runs text-only. */
  icon?: (sizePx: number) => HTMLElement;
  /** Receiving address for THIS asset (per chain). Only used by hosts that wire
   *  `onSelect`; the shell never derives one address from another. */
  address?: string;
  /** Cap the decimals shown. Default: this asset's own `decimals`, trailing
   *  zeros trimmed — so BTC reads '0.0012', not '0.00120000'. */
  maxDecimals?: number;
}

export interface AssetListOptions {
  /** The assets to list, in display order. Pass a function for a list that
   *  changes with app state (Hashmark has no assets before onboarding, and no
   *  BTC row unless the market is cross-chain) — it is re-read on every
   *  refresh, so a host never has to remount the corner to add a row. */
  assets: ShellAsset[] | (() => ShellAsset[]);
  /** Fiat value of ONE WHOLE unit of `assetTicker`, in the currency the corner
   *  is currently showing, or null when unknown. Without it rows show units
   *  only and `total()` stays null. */
  rate?: (assetTicker: string) => Promise<number | null>;
  /** The ticker `rate` is quoting in, for formatting. Read at render time so it
   *  follows the corner's "Show amounts in" without a second subscription. */
  fiatTicker?: () => string;
  /** Make rows activatable (the per-asset receive view). Rows stay plain divs
   *  without it — the corner's no-dead-buttons rule. */
  onSelect?: (asset: ShellAsset) => void;
  /** Milliseconds a balance stays fresh. Default 30_000, matching the corner. */
  cacheMs?: number;
  /** Read every balance once at mount. Default TRUE.
   *
   *  Without this a standalone list mounts showing a dash in every row and
   *  stays that way until the host happens to call `refresh()`, which is a
   *  wallet screen that renders as broken. The corner passes `false` because it
   *  reads on menu-open instead: firing a Polygon RPC and a BTC explorer on
   *  every page load, for a panel most visitors never open, is exactly the cost
   *  the lazy read exists to avoid. The default belongs with the caller that
   *  has no other trigger, not with the one that does. */
  autoRefresh?: boolean;
  /** Inject the component's <style> once. Default true. */
  injectStyles?: boolean;
}

export interface AssetListHandle {
  el: HTMLDivElement;
  /** Re-read every asset. `force` ignores the freshness cache (after a send). */
  refresh(force?: boolean): Promise<void>;
  /** Summed fiat value of the assets that priced, or null when none did.
   *  Deliberately NOT a sum over "assets that failed to price as 0" — a total
   *  that silently omits a row is worse than no total. */
  total(): number | null;
  /** Last known balance of one asset in its smallest unit, or null. Lets the
   *  corner cap its NIM send view from the list, so a host that moves off
   *  `getBalanceLuna` onto `assets` does not silently lose the cap. */
  units(ticker: string): bigint | null;
  destroy(): void;
}

/** The row's second line: the full name and the chain, deduplicated.
 *
 *  NIM carries name 'Nimiq' on network 'Nimiq', and printing both would spend
 *  the one line the row has on saying the same word twice. Everything where the
 *  two differ is exactly the case worth spelling out ('Tether USD · Polygon').
 *
 *  Exported because the receive view states the same pairing and the two must
 *  not drift into wording the other does not use. */
export function assetSubtitle(asset: ShellAsset): string {
  const name = asset.name?.trim();
  const network = asset.network.trim();
  if (!name) return network;
  if (name.toLowerCase() === network.toLowerCase()) return name;
  return `${name} · ${network}`;
}

const STYLE_ID = 'nimiq-shell-asset-list-style';

function ensureStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.nq-al { display:flex; flex-direction:column; gap:1px; }
.nq-al-row { display:flex; align-items:center; gap:9px; width:100%; padding:6px 8px;
  border:none; border-radius:6px; background:none; font-family:inherit; text-align:left;
  color:var(--nq-cc-menu-fg, #1f2348); }
button.nq-al-row { cursor:pointer;
  transition:background .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
button.nq-al-row:hover { background:var(--nq-cc-menu-hover, rgba(31,35,72,.06)); }
button.nq-al-row:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:-2px; }
.nq-al-art { display:block; width:26px; height:26px; flex:none; }
.nq-al-art:empty { display:none; }
.nq-al-art > * { display:block; width:100%; height:100%; }
.nq-al-id { display:flex; flex-direction:column; gap:1px; min-width:0; }
.nq-al-tick { font-size:13px; font-weight:700; letter-spacing:.02em; }
.nq-al-name { font-size:11px; font-weight:600; color:var(--nq-cc-menu-muted, rgba(31,35,72,.5));
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.nq-al-name:empty { display:none; }
/* amounts are the column people compare down, so they get tabular figures.
   Proportional digits make a stack of balances jitter at the decimal point */
.nq-al-amt { margin-left:auto; display:flex; flex-direction:column; align-items:flex-end; gap:1px;
  flex:none; font-variant-numeric:tabular-nums; }
.nq-al-units { font-size:13px; font-weight:700; }
.nq-al-fiat { font-size:11px; font-weight:600; color:var(--nq-cc-menu-muted, rgba(31,35,72,.5)); }
.nq-al-fiat:empty { display:none; }
/* pending: a dim dash, never a spinner. Chains resolve at different speeds,
   and three spinners in a 272px card reads as "broken", not "loading" */
.nq-al-units.nq-al-pending { color:var(--nq-cc-menu-muted, rgba(31,35,72,.35)); font-weight:600; }
`;
  document.head.appendChild(style);
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

interface RowState {
  units: bigint | null;
  fiat: number | null;
  fetchedAt: number;
  unitsEl: HTMLElement;
  fiatEl: HTMLElement;
}

/** Mount the multi-asset balance stack into `container`. */
export function mountAssetList(
  container: HTMLElement,
  options: AssetListOptions,
): AssetListHandle {
  if (options.injectStyles !== false) ensureStyles();
  const cacheMs = options.cacheMs ?? 30_000;
  const readAssets = (): ShellAsset[] =>
    typeof options.assets === 'function' ? options.assets() : options.assets;

  const root = el('div', 'nq-al');
  container.appendChild(root);

  // Keyed by ticker so a re-render across an asset-list change keeps the
  // balances it already has — the list is re-read on every refresh, and
  // rebuilding rows from scratch would blank every row on an unrelated change.
  const rows = new Map<string, RowState>();
  let signature = '';
  let destroyed = false;

  function render(assets: ShellAsset[]): void {
    const next = assets.map((a) => a.ticker).join(' ');
    if (next === signature) return;
    signature = next;
    root.textContent = '';
    const kept = new Map<string, RowState>();

    for (const asset of assets) {
      const activatable = typeof options.onSelect === 'function';
      const row = el(activatable ? 'button' : 'div', 'nq-al-row', root);
      if (activatable) {
        (row as HTMLButtonElement).type = 'button';
        row.addEventListener('click', () => options.onSelect!(asset));
      }
      const art = el('span', 'nq-al-art', row);
      if (asset.icon) art.appendChild(asset.icon(26));
      const id = el('span', 'nq-al-id', row);
      const tick = el('span', 'nq-al-tick', id);
      tick.textContent = asset.ticker;
      const name = el('span', 'nq-al-name', id);
      name.textContent = assetSubtitle(asset);
      const amt = el('span', 'nq-al-amt', row);
      const unitsEl = el('span', 'nq-al-units nq-al-pending', amt);
      unitsEl.textContent = '—';
      const fiatEl = el('span', 'nq-al-fiat', amt);

      const prior = rows.get(asset.ticker);
      const state: RowState = {
        units: prior?.units ?? null,
        fiat: prior?.fiat ?? null,
        fetchedAt: prior?.fetchedAt ?? 0,
        unitsEl,
        fiatEl,
      };
      kept.set(asset.ticker, state);
      if (state.units !== null) paint(asset, state);
    }
    rows.clear();
    for (const [ticker, state] of kept) rows.set(ticker, state);
  }

  function paint(asset: ShellAsset, state: RowState): void {
    if (state.units === null) return;
    state.unitsEl.classList.remove('nq-al-pending');
    state.unitsEl.textContent = fmtUnits(state.units, asset.decimals, {
      maxDecimals: asset.maxDecimals ?? asset.decimals,
    });
    if (state.fiat === null) {
      state.fiatEl.textContent = '';
      return;
    }
    const ticker = options.fiatTicker?.() ?? 'USD';
    try {
      state.fiatEl.textContent = fmtFiat(state.fiat, ticker);
    } catch {
      state.fiatEl.textContent = ''; // unknown ISO code — units alone still read
    }
  }

  async function readOne(asset: ShellAsset, force: boolean, now: number): Promise<void> {
    const state = rows.get(asset.ticker);
    if (!state) return;
    if (!force && state.units !== null && now - state.fetchedAt < cacheMs) {
      paint(asset, state);
      return;
    }
    try {
      const raw = await asset.balance();
      if (destroyed) return;
      if (raw !== null && raw !== undefined) {
        state.units = typeof raw === 'bigint' ? raw : BigInt(Math.round(raw));
        state.fetchedAt = now;
      }
    } catch {
      /* keep the last known value — see ShellAsset.balance */
    }
    if (destroyed) return;
    paint(asset, state);

    if (options.rate && state.units !== null) {
      try {
        const rate = await options.rate(asset.ticker);
        if (destroyed) return;
        state.fiat = rate === null
          ? null
          : Number(state.units) / 10 ** asset.decimals * rate;
      } catch {
        state.fiat = null;
      }
      if (!destroyed) paint(asset, state);
    }
  }

  async function refresh(force = false): Promise<void> {
    if (destroyed) return;
    const assets = readAssets();
    render(assets);
    const now = Date.now();
    // Independent per asset ON PURPOSE (see the header note): one slow chain
    // must not hold up the rows that already answered.
    await Promise.all(assets.map((a) => readOne(a, force, now)));
  }

  render(readAssets());
  // Fire-and-forget: mount stays synchronous so the handle is in the caller's
  // hands before the first RPC answers.
  if (options.autoRefresh !== false) void refresh();

  return {
    el: root,
    refresh,
    total() {
      let sum: number | null = null;
      for (const state of rows.values()) {
        if (state.fiat === null) continue;
        sum = (sum ?? 0) + state.fiat;
      }
      return sum;
    },
    units: (ticker) => rows.get(ticker)?.units ?? null,
    destroy() {
      destroyed = true;
      root.remove();
    },
  };
}
