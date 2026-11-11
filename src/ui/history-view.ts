// Transaction history in the mini wallet: the recent rows on the main view, the
// full month-grouped list as a sub-view, and one transaction's detail.
//
// Reference: the wallet's address overview (nimiq-branding-cli
// references/screenshots/wallet-app/logged-in/nim-address-overview-mobile.png).
// Date column, identicon, label over time, a green "+N NIM" pill for money in,
// plain navy for money out, fiat under the amount, grey uppercase month heads.
// Sizes are the wallet's SHARE of its 390px sheet applied to the 272px card
// (x 0.697), the same rule the rest of the menu follows.
//
// UNTRUSTED TEXT: a message, a contact label and every address here came from
// someone else. Every one of them is written with textContent. The only markup
// set is the static placeholder hexagon the corner already uses.

import type { I18n } from '../i18n';
import { fmtNim, fmtFiat, lunaToNim } from '../format/nim';
import { explorerUrl } from '../format/network';
import { groupTxsByMonth, type HistoryFetchOptions, type ShellTx } from '../history/chain';

/** Rows on the main view. */
export const RECENT_TX_COUNT = 3;
/** Rows per request. One request fills the recent list AND the first screen of
 *  the full view, so opening "All transactions" costs nothing extra. */
export const HISTORY_PAGE_SIZE = 20;
/** Same cadence as the balance: a menu reopened inside this window reuses the
 *  rows it has. */
export const HISTORY_FRESH_MS = 30_000;

/** The staking contract. Its address is all zeros and a 1, which reads as a
 *  bug to anyone who has not met it, so it is named. */
const STAKING_CONTRACT = 'NQ7700000000000000000000000000000001';

export interface HistoryContact {
  label: string;
  address: string;
  asset?: string;
}

export interface HistoryViewOptions {
  /** The `.nq-cc` root: the view switches by class on it. */
  root: HTMLElement;
  /** The card the two sub-views are appended to. */
  menu: HTMLElement;
  /** Where the recent block goes on the main view. */
  slot: HTMLElement;
  i18n: I18n;
  fetch: (address: string, opts: HistoryFetchOptions) => Promise<ShellTx[]>;
  /** The address the history is for, read at refresh time. */
  address: () => string | null;
  identicon?: (address: string, sizePx: number) => HTMLElement;
  /** Static, trusted placeholder markup for an unwired identicon. */
  placeholder: string;
  contacts?: () => readonly HistoryContact[] | Promise<readonly HistoryContact[]>;
  /** The current 1-NIM rate and ticker, or null when there is no fiat feed. */
  fiat?: () => Promise<{ rate: number; ticker: string } | null>;
  network?: 'main' | 'test';
  /** The corner's own sub-view header (back, centred title, close). */
  header: (parent: HTMLElement, titleKey: string, onBack: () => void) => HTMLElement;
  pageSize?: number;
  /** Injected for tests. */
  now?: () => number;
}

export interface HistoryViewHandle {
  /** Read on menu open. Within HISTORY_FRESH_MS of the last read this repaints
   *  from the cache and makes no request, unless forced. */
  refresh(force?: boolean): Promise<void>;
  /** Forget every row (account switch). */
  clear(): void;
  /** Leave the two sub-views (menu closed). */
  close(): void;
  destroy(): void;
}

const compact = (a: string): string => a.replace(/\s+/g, '').toUpperCase();

/** "NQ07 … 0000" in a row, "NQ07 0000 … 0000" where there is room: the
 *  first block, which says what kind of address it is, and the last one, which
 *  is where two addresses that start alike differ. */
export function shortTxAddress(address: string, lead = 1): string {
  const blocks = compact(address).match(/.{1,4}/g) ?? [address];
  if (blocks.length <= lead + 1) return blocks.join(' ');
  return `${blocks.slice(0, lead).join(' ')} \u2026 ${blocks[blocks.length - 1]}`;
}

/** The label a row shows for its counterparty: a saved contact's name when the
 *  address matches one (NIM entries only), the staking contract by name, else
 *  null and the row shows the shortened address. */
export function counterpartyLabel(
  address: string,
  contacts: readonly HistoryContact[],
): { kind: 'contact'; label: string } | { kind: 'staking' } | null {
  const key = compact(address);
  for (const c of contacts) {
    if (c.asset && c.asset !== 'NIM') continue;
    if (typeof c.address === 'string' && compact(c.address) === key && c.label) {
      return { kind: 'contact', label: c.label };
    }
  }
  if (key === STAKING_CONTRACT) return { kind: 'staking' };
  return null;
}

/** The signed amount a row shows. U+2212 for out, which is the minus sign; a
 *  hyphen is not one and sits lower than the plus beside it. */
export function signedTxAmount(tx: Pick<ShellTx, 'direction' | 'valueLuna'>, full = false): string {
  const v = tx.valueLuna;
  // A row is ~150px for label AND amount, so the amount gives up decimals as
  // it grows: whole NIM from 10 000 up (the wallet's "110 000"), cents from 1,
  // and every luna below that so a dust payment never reads as 0. The detail
  // view always shows the exact figure.
  const maxDecimals = full ? 5 : v >= 1_000_000_000 ? 0 : v >= 100_000 ? 2 : 5;
  const body = fmtNim(v, { maxDecimals, minDecimals: 0 });
  if (tx.direction === 'in') return `+\u2009${body} NIM`;
  if (tx.direction === 'out') return `\u2212\u2009${body} NIM`;
  return `${body} NIM`;
}

export const HISTORY_CSS = `
/* ---- history: recent rows, the full list, one transaction (history-view.ts) */
.nq-cc-view-history, .nq-cc-view-txdetail { display:none; }
.nq-cc.nq-cc-show-history .nq-cc-view-main { display:none; }
.nq-cc.nq-cc-show-history .nq-cc-view-history { display:block; }
.nq-cc.nq-cc-show-txdetail .nq-cc-view-main,
.nq-cc.nq-cc-show-txdetail .nq-cc-view-history { display:none; }
.nq-cc.nq-cc-show-txdetail .nq-cc-view-txdetail { display:block; }
.nq-cc-recent { margin-top:12px; }
.nq-cc-recent[hidden] { display:none; }
.nq-cc-tx-list { display:flex; flex-direction:column; }
/* The row: date column, face, label over time, amount over fiat. Shares of the
   wallet row: date 7.7%, face 11.3%, label 15px of 390. */
.nq-cc-tx { display:grid; grid-template-columns:24px 30px minmax(0,1fr) auto; align-items:center;
  column-gap:7px; width:100%; padding:7px 4px; border:none; border-radius:6px; background:none;
  font-family:inherit; text-align:left; cursor:pointer; color:var(--nq-cc-menu-fg, var(--nimiq-blue, #1f2348));
  transition:background .15s var(--nimiq-ease, cubic-bezier(.25,0,0,1)); }
.nq-cc-tx:hover { background:var(--nq-cc-menu-hover, rgba(31,35,72,.06)); }
.nq-cc-tx:focus-visible { outline:2px solid var(--nq-cc-accent, var(--nimiq-light-blue, #0582ca)); outline-offset:-2px; }
.nq-cc-tx-date { display:flex; flex-direction:column; align-items:center; line-height:1.1;
  color:var(--nq-cc-menu-muted, rgba(31,35,72,.5)); }
.nq-cc-tx-day { font-size:12px; font-weight:700; }
.nq-cc-tx-mon { font-size:8.5px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; }
.nq-cc-tx-icon { display:block; width:30px; height:30px; }
.nq-cc-tx-icon > * { display:block; width:100%; height:100%; }
.nq-cc-tx-main { display:flex; flex-direction:column; gap:2px; min-width:0; }
.nq-cc-tx-label { font-size:13px; font-weight:600; line-height:1.2; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.nq-cc-tx-label.nq-cc-mono { font-family:'Fira Mono',ui-monospace,monospace; font-size:11.5px; font-weight:400; letter-spacing:.01em; }
.nq-cc-tx-sub { font-size:11px; font-weight:600; line-height:1.2; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  color:var(--nq-cc-menu-muted, rgba(31,35,72,.5)); }
.nq-cc-tx-amt { display:flex; flex-direction:column; align-items:flex-end; gap:2px; }
.nq-cc-tx-value { font-size:12.5px; font-weight:700; line-height:1.2; white-space:nowrap; padding:2px 0;
  color:color-mix(in srgb, var(--nq-cc-menu-fg, var(--nimiq-blue, #1f2348)) 60%, transparent); }
/* Money IN is the one green thing on the card. */
.nq-cc-tx[data-dir="in"] .nq-cc-tx-value { padding:2px 5px; border-radius:4px;
  color:var(--nq-cc-success, #13b59d);
  background:color-mix(in srgb, var(--nq-cc-success, #13b59d) 10%, transparent); }
.nq-cc-tx-fiat { font-size:11px; font-weight:600; line-height:1.2; white-space:nowrap;
  color:var(--nq-cc-menu-muted, rgba(31,35,72,.5)); }
.nq-cc-tx-fiat:empty { display:none; }
/* Pending and failed are quiet: the row is there, the amount is not yet (or
   never) money that moved. No spinner, no pulse. */
.nq-cc-tx[data-pending] .nq-cc-tx-value, .nq-cc-tx[data-failed] .nq-cc-tx-value { opacity:.55; }
.nq-cc-tx[data-failed] .nq-cc-tx-value { text-decoration:line-through; }
.nq-cc-tx-month { margin:14px 4px 4px; font-size:10px; font-weight:700; text-transform:uppercase;
  letter-spacing:.08em; color:var(--nq-cc-menu-muted, rgba(31,35,72,.45)); }
.nq-cc-tx-month:first-child { margin-top:6px; }
/* Skeleton rows in the wallet's grey, holding the row's own shape. Still: no
   shimmer, no pulse. */
.nq-cc-tx-skel { display:grid; grid-template-columns:24px 30px minmax(0,1fr) 56px; align-items:center;
  column-gap:7px; padding:7px 4px; }
.nq-cc-skel { display:block; border-radius:4px;
  background:color-mix(in srgb, var(--nq-cc-menu-fg, var(--nimiq-blue, #1f2348)) 7%, transparent); }
.nq-cc-skel-date { width:18px; height:22px; justify-self:center; }
.nq-cc-skel-face { width:30px; height:30px; border-radius:50%; }
.nq-cc-skel-lines { display:flex; flex-direction:column; gap:5px; }
.nq-cc-skel-line { height:9px; }
.nq-cc-skel-amt { height:12px; }
.nq-cc-tx-note { margin:6px 4px 2px; font-size:12px; font-weight:600; text-align:center;
  color:var(--nq-cc-menu-muted, rgba(31,35,72,.5)); }
.nq-cc-tx-retry { margin-left:6px; padding:4px 2px; border:none; background:none; cursor:pointer;
  font-family:inherit; font-size:12px; font-weight:700; color:var(--nq-cc-accent, var(--nimiq-light-blue, #0582ca)); }
.nq-cc-tx-retry:focus-visible, .nq-cc-tx-all:focus-visible, .nq-cc-tx-more:focus-visible, .nq-cc-tx-explorer:focus-visible {
  outline:2px solid var(--nq-cc-accent, var(--nimiq-light-blue, #0582ca)); outline-offset:2px; border-radius:4px; }
.nq-cc-tx-all { display:flex; align-items:center; justify-content:center; gap:6px; width:100%; margin-top:4px;
  padding:8px 4px 2px; border:none; background:none; cursor:pointer; font-family:inherit; font-size:12.5px; font-weight:700;
  color:var(--nq-cc-accent, var(--nimiq-light-blue, #0582ca)); }
.nq-cc-tx-all[hidden] { display:none; }
.nq-cc-tx-all svg { width:6px; height:10px; transform:rotate(180deg); }
/* The full list scrolls INSIDE the card, under a header that stays put. */
.nq-cc-tx-scroll { max-height:min(460px, calc(100vh - 170px)); max-height:min(460px, calc(100dvh - 170px));
  overflow-y:auto; overscroll-behavior:contain; padding:0 2px 6px; }
.nq-cc-tx-more { display:block; margin:10px auto 4px; min-height:34px; padding:0 16px; border:none; border-radius:500px;
  font-family:inherit; font-size:13px; font-weight:700; cursor:pointer;
  color:var(--nq-cc-menu-fg, var(--nimiq-blue, #1f2348));
  background:color-mix(in srgb, var(--nq-cc-menu-fg, var(--nimiq-blue, #1f2348)) 6%, transparent); }
.nq-cc-tx-more:hover { background:color-mix(in srgb, var(--nq-cc-menu-fg, var(--nimiq-blue, #1f2348)) 11%, transparent); }
/* One transaction. */
.nq-cc-txd { display:flex; flex-direction:column; align-items:center; padding:14px 8px 8px; }
.nq-cc-txd-face { display:block; width:56px; height:56px; }
.nq-cc-txd-face > * { display:block; width:100%; height:100%; }
.nq-cc-txd-name { margin-top:8px; max-width:100%; font-size:14px; font-weight:600; text-align:center;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.nq-cc-txd-name.nq-cc-mono { font-family:'Fira Mono',ui-monospace,monospace; font-size:12px; font-weight:400; }
.nq-cc-txd-amount { margin-top:14px; font-size:19px; font-weight:700; line-height:1.2; padding:2px 0;
  color:color-mix(in srgb, var(--nq-cc-menu-fg, var(--nimiq-blue, #1f2348)) 60%, transparent); }
.nq-cc-txd[data-dir="in"] .nq-cc-txd-amount { padding:3px 8px; border-radius:6px;
  color:var(--nq-cc-success, #13b59d);
  background:color-mix(in srgb, var(--nq-cc-success, #13b59d) 10%, transparent); }
.nq-cc-txd[data-failed] .nq-cc-txd-amount { text-decoration:line-through; opacity:.55; }
.nq-cc-txd-fiat { margin-top:4px; font-size:12px; font-weight:600; color:var(--nq-cc-menu-muted, rgba(31,35,72,.5)); }
.nq-cc-txd-fiat:empty { display:none; }
.nq-cc-txd-state { margin-top:8px; font-size:12px; font-weight:600; color:var(--nq-cc-menu-muted, rgba(31,35,72,.5)); }
.nq-cc-txd-state[hidden] { display:none; }
.nq-cc-txd .nq-cc-copy-wrap { margin-top:16px; }
.nq-cc-txd-facts { width:100%; margin:16px 0 0; padding:0 4px; box-sizing:border-box; }
.nq-cc-txd-fact { display:flex; justify-content:space-between; align-items:baseline; gap:12px; padding:5px 0;
  font-size:12px; line-height:1.35; }
.nq-cc-txd-fact dt { flex:none; font-weight:600; color:var(--nq-cc-menu-muted, rgba(31,35,72,.5)); }
.nq-cc-txd-fact dd { margin:0; min-width:0; font-weight:600; text-align:right; overflow-wrap:anywhere;
  color:var(--nq-cc-menu-fg, var(--nimiq-blue, #1f2348)); }
.nq-cc-tx-explorer { margin-top:14px; font-size:13px; font-weight:700; text-decoration:none;
  color:var(--nq-cc-accent, var(--nimiq-light-blue, #0582ca)); }
.nq-cc-tx-explorer:hover { text-decoration:underline; }
`;

const CHEVRON =
  '<svg viewBox="0 0 6 10" aria-hidden="true"><path d="M5 1L1 5l4 4" fill="none" stroke="currentColor" ' +
  'stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, parent?: HTMLElement): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (parent) parent.appendChild(node);
  return node;
}

type State = 'idle' | 'loading' | 'ready' | 'error';

export function mountHistoryView(o: HistoryViewOptions): HistoryViewHandle {
  const { i18n } = o;
  const page = Math.max(RECENT_TX_COUNT, Math.floor(o.pageSize ?? HISTORY_PAGE_SIZE));
  const now = o.now ?? (() => Date.now());
  const network = o.network ?? 'main';

  let state: State = 'idle';
  let txs: ShellTx[] = [];
  let more = false;
  let moreState: 'idle' | 'loading' | 'error' = 'idle';
  let fetchedAt = 0;
  let forAddress: string | null = null;
  let gen = 0;
  let inflight: Promise<void> | null = null;
  let contacts: readonly HistoryContact[] = [];
  let fiat: { rate: number; ticker: string } | null = null;
  let detailTx: ShellTx | null = null;

  // ---- main view: the recent block ----------------------------------------
  const recent = el('div', 'nq-cc-recent', o.slot);
  recent.hidden = true;
  const recentList = el('div', 'nq-cc-tx-list', recent);
  const allBtn = el('button', 'nq-cc-tx-all', recent);
  allBtn.type = 'button';
  const allLabel = el('span', undefined, allBtn);
  allBtn.insertAdjacentHTML('beforeend', CHEVRON);
  allBtn.addEventListener('click', () => {
    o.root.classList.add('nq-cc-show-history');
    renderFull();
  });

  // ---- the full list ------------------------------------------------------
  const viewHistory = el('div', 'nq-cc-view-history', o.menu);
  o.header(viewHistory, 'shell.transactions', () => o.root.classList.remove('nq-cc-show-history'));
  const scroll = el('div', 'nq-cc-tx-scroll', viewHistory);

  // ---- one transaction ----------------------------------------------------
  const viewTx = el('div', 'nq-cc-view-txdetail', o.menu);
  o.header(viewTx, 'shell.transaction', () => o.root.classList.remove('nq-cc-show-txdetail'));
  const txd = el('div', 'nq-cc-txd', viewTx);

  // ---- formatting ---------------------------------------------------------
  const lang = (): string => i18n.getLanguage();
  const fmtDate = (ts: number, opts: Intl.DateTimeFormatOptions): string => {
    try { return new Intl.DateTimeFormat(lang(), opts).format(new Date(ts)); } catch {
      return new Intl.DateTimeFormat(undefined, opts).format(new Date(ts));
    }
  };
  const fiatOf = (luna: number): string => (fiat ? fmtFiat(lunaToNim(luna) * fiat.rate, fiat.ticker) : '');

  function monthLabel(key: string): string {
    if (key === 'pending') return i18n.t('shell.pending');
    const [y, m] = key.split('-').map(Number) as [number, number];
    const today = new Date(now());
    if (y === today.getFullYear() && m === today.getMonth() + 1) return i18n.t('shell.thisMonth');
    const at = new Date(y, m - 1, 15).getTime();
    return fmtDate(at, y === today.getFullYear() ? { month: 'long' } : { month: 'long', year: 'numeric' });
  }

  function face(slot: HTMLElement, address: string, size: number): void {
    slot.textContent = '';
    if (o.identicon) {
      try { slot.appendChild(o.identicon(address, size)); return; } catch { /* fall through */ }
    }
    slot.innerHTML = o.placeholder; // static, trusted markup
  }

  function labelInto(node: HTMLElement, address: string, lead = 1): void {
    const who = counterpartyLabel(address, contacts);
    node.classList.toggle('nq-cc-mono', who === null);
    node.textContent = who === null
      ? shortTxAddress(address, lead)
      : who.kind === 'staking' ? i18n.t('shell.stakingContract') : who.label;
    node.title = compact(address).match(/.{1,4}/g)?.join(' ') ?? address;
  }

  function buildRow(tx: ShellTx, parent: HTMLElement): void {
    const row = el('button', 'nq-cc-tx', parent);
    row.type = 'button';
    row.dataset.dir = tx.direction;
    if (tx.pending) row.dataset.pending = '';
    if (tx.failed) row.dataset.failed = '';
    const date = el('span', 'nq-cc-tx-date', row);
    if (tx.timestamp !== null) {
      el('span', 'nq-cc-tx-day', date).textContent = fmtDate(tx.timestamp, { day: 'numeric' });
      el('span', 'nq-cc-tx-mon', date).textContent = fmtDate(tx.timestamp, { month: 'short' }).replace(/\.$/, '');
    }
    face(el('span', 'nq-cc-tx-icon', row), tx.counterparty, 30);
    const main = el('span', 'nq-cc-tx-main', row);
    labelInto(el('span', 'nq-cc-tx-label', main), tx.counterparty);
    const sub = el('span', 'nq-cc-tx-sub', main);
    const when = tx.pending
      ? i18n.t('shell.pending')
      : tx.timestamp !== null ? fmtDate(tx.timestamp, { hour: '2-digit', minute: '2-digit' }) : '';
    const bits = [when, tx.failed ? i18n.t('shell.txFailed') : '', tx.message ?? ''].filter(Boolean);
    sub.textContent = bits.join(' \u00b7 ');
    const amt = el('span', 'nq-cc-tx-amt', row);
    el('span', 'nq-cc-tx-value', amt).textContent = signedTxAmount(tx);
    el('span', 'nq-cc-tx-fiat', amt).textContent = tx.failed ? '' : fiatOf(tx.valueLuna);
    row.addEventListener('click', () => openDetail(tx));
  }

  function skeleton(parent: HTMLElement, n: number): void {
    for (let i = 0; i < n; i += 1) {
      const s = el('div', 'nq-cc-tx-skel', parent);
      s.setAttribute('aria-hidden', 'true');
      el('span', 'nq-cc-skel nq-cc-skel-date', s);
      el('span', 'nq-cc-skel nq-cc-skel-face', s);
      const lines = el('span', 'nq-cc-skel-lines', s);
      el('span', 'nq-cc-skel nq-cc-skel-line', lines).style.width = `${70 - i * 9}%`;
      el('span', 'nq-cc-skel nq-cc-skel-line', lines).style.width = '34%';
      el('span', 'nq-cc-skel nq-cc-skel-amt', s);
    }
  }

  function note(parent: HTMLElement, key: string, retry?: () => void): void {
    const p = el('p', 'nq-cc-tx-note', parent);
    p.textContent = i18n.t(key);
    if (retry) {
      const b = el('button', 'nq-cc-tx-retry', p);
      b.type = 'button';
      b.textContent = i18n.t('shell.retry');
      b.addEventListener('click', retry);
    }
  }

  // ---- renders ------------------------------------------------------------
  function renderRecent(): void {
    recentList.textContent = '';
    recent.hidden = state === 'idle';
    allLabel.textContent = i18n.t('shell.allTransactions');
    allBtn.hidden = !(state === 'ready' && txs.length > 0);
    if (state === 'loading') skeleton(recentList, RECENT_TX_COUNT);
    else if (state === 'error') note(recentList, 'shell.historyFailed', () => void refresh(true));
    else if (state === 'ready' && txs.length === 0) note(recentList, 'shell.noTransactions');
    else if (state === 'ready') for (const tx of txs.slice(0, RECENT_TX_COUNT)) buildRow(tx, recentList);
  }

  function renderFull(): void {
    const top = scroll.scrollTop;
    scroll.textContent = '';
    if (state === 'loading' || state === 'idle') { skeleton(scroll, 6); return; }
    if (state === 'error') { note(scroll, 'shell.historyFailed', () => void refresh(true)); return; }
    if (txs.length === 0) { note(scroll, 'shell.noTransactions'); return; }
    for (const g of groupTxsByMonth(txs)) {
      el('p', 'nq-cc-tx-month', scroll).textContent = monthLabel(g.key);
      const list = el('div', 'nq-cc-tx-list', scroll);
      for (const tx of g.txs) buildRow(tx, list);
    }
    if (moreState === 'loading') skeleton(scroll, 2);
    else if (moreState === 'error') note(scroll, 'shell.historyFailed', () => void loadMore());
    else if (more) {
      const b = el('button', 'nq-cc-tx-more', scroll);
      b.type = 'button';
      b.textContent = i18n.t('shell.loadMore');
      b.addEventListener('click', () => void loadMore());
    }
    scroll.scrollTop = top;
  }

  function fact(dl: HTMLElement, key: string, value: string, mono = false): void {
    const row = el('div', 'nq-cc-txd-fact', dl);
    el('dt', undefined, row).textContent = i18n.t(key);
    const dd = el('dd', undefined, row);
    dd.textContent = value;
    if (mono) dd.style.fontFamily = "'Fira Mono',ui-monospace,monospace";
  }

  let copyTimer: ReturnType<typeof setTimeout> | undefined;
  function renderDetail(): void {
    const tx = detailTx;
    txd.textContent = '';
    if (!tx) return;
    txd.dataset.dir = tx.direction;
    if (tx.failed) txd.dataset.failed = ''; else delete txd.dataset.failed;
    face(el('span', 'nq-cc-txd-face', txd), tx.counterparty, 56);
    labelInto(el('span', 'nq-cc-txd-name', txd), tx.counterparty, 2);
    el('span', 'nq-cc-txd-amount', txd).textContent = signedTxAmount(tx, true);
    el('span', 'nq-cc-txd-fiat', txd).textContent = tx.failed ? '' : fiatOf(tx.valueLuna);
    const st = el('span', 'nq-cc-txd-state', txd);
    st.hidden = !tx.pending && !tx.failed;
    st.textContent = tx.pending ? i18n.t('shell.pending') : tx.failed ? i18n.t('shell.txFailed') : '';

    // The counterparty's full address on the corner's own 3x3 plate, tap to copy.
    const wrap = el('span', 'nq-cc-copy-wrap', txd);
    const plate = el('button', 'nq-cc-address', wrap);
    plate.type = 'button';
    plate.title = i18n.t('shell.copyAddress');
    plate.style.setProperty('--nq-cc-addr-cols', '3');
    for (const block of compact(tx.counterparty).match(/.{1,4}/g) ?? []) el('span', undefined, plate).textContent = block;
    const tip = el('span', 'nq-cc-copy-tooltip', wrap);
    tip.setAttribute('aria-hidden', 'true');
    tip.textContent = i18n.t('shell.copied');
    plate.addEventListener('click', () => {
      try { void navigator.clipboard.writeText(compact(tx.counterparty)); } catch { /* clipboard unavailable */ }
      wrap.classList.add('nq-cc-copied');
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => wrap.classList.remove('nq-cc-copied'), 800);
    });

    const dl = el('dl', 'nq-cc-txd-facts', txd);
    if (tx.timestamp !== null) fact(dl, 'shell.date', fmtDate(tx.timestamp, { dateStyle: 'medium', timeStyle: 'short' }));
    if (tx.direction !== 'in') fact(dl, 'shell.fee', `${fmtNim(tx.feeLuna, { minDecimals: 0 })} NIM`);
    if (tx.message) fact(dl, 'shell.message', tx.message);

    const href = explorerUrl(network, tx.hash);
    if (href) {
      const a = el('a', 'nq-cc-tx-explorer', txd);
      a.href = href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = i18n.t('shell.blockExplorer');
    }
  }

  /** Back from here returns to wherever the row was: the main view, or the
   *  full list, whose class is still on the root underneath. */
  function openDetail(tx: ShellTx): void {
    detailTx = tx;
    renderDetail();
    o.root.classList.add('nq-cc-show-txdetail');
  }

  function renderAll(): void {
    renderRecent();
    if (o.root.classList.contains('nq-cc-show-history')) renderFull();
    if (o.root.classList.contains('nq-cc-show-txdetail')) renderDetail();
  }

  // ---- reads --------------------------------------------------------------
  async function readSides(): Promise<void> {
    const [c, f] = await Promise.allSettled([
      o.contacts ? Promise.resolve(o.contacts()) : Promise.resolve([]),
      o.fiat ? o.fiat() : Promise.resolve(null),
    ]);
    // A failed book or price is a missing name or fiat line, never a failed list.
    contacts = c.status === 'fulfilled' && Array.isArray(c.value) ? c.value : contacts;
    fiat = f.status === 'fulfilled' && f.value && Number.isFinite(f.value.rate) ? f.value : null;
  }

  function refresh(force = false): Promise<void> {
    const address = o.address();
    if (!address) return Promise.resolve();
    if (forAddress !== null && compact(address) !== compact(forAddress)) clear();
    forAddress = address;
    if (!force && state === 'ready' && now() - fetchedAt < HISTORY_FRESH_MS) {
      renderAll();
      return Promise.resolve();
    }
    if (inflight) return inflight;
    const mine = ++gen;
    if (state !== 'ready') state = 'loading';
    renderAll();
    inflight = (async () => {
      try {
        const [rows] = await Promise.all([o.fetch(address, { max: page, startAt: null }), readSides()]);
        if (mine !== gen) return;
        txs = Array.isArray(rows) ? rows.slice() : [];
        more = txs.length >= page;
        moreState = 'idle';
        fetchedAt = now();
        state = 'ready';
      } catch {
        if (mine !== gen) return;
        // Rows already on screen stay: a flaky node must not blank a list that
        // was right thirty seconds ago. Only a first read that fails says so.
        if (state !== 'ready') state = 'error';
      } finally {
        if (mine === gen) inflight = null;
      }
      renderAll();
    })();
    return inflight;
  }

  async function loadMore(): Promise<void> {
    const address = forAddress;
    const last = txs[txs.length - 1];
    if (!address || !last || moreState === 'loading') return;
    const mine = gen;
    moreState = 'loading';
    renderFull();
    try {
      const rows = await o.fetch(address, { max: page, startAt: last.hash });
      if (mine !== gen) return;
      const seen = new Set(txs.map((t) => t.hash));
      const fresh = (Array.isArray(rows) ? rows : []).filter((t) => !seen.has(t.hash));
      txs = txs.concat(fresh);
      more = rows.length >= page && fresh.length > 0;
      moreState = 'idle';
    } catch {
      if (mine !== gen) return;
      moreState = 'error';
    }
    renderFull();
  }

  function clear(): void {
    gen += 1;
    inflight = null;
    state = 'idle';
    txs = [];
    more = false;
    moreState = 'idle';
    fetchedAt = 0;
    forAddress = null;
    detailTx = null;
    close();
    recentList.textContent = '';
    scroll.textContent = '';
    txd.textContent = '';
    recent.hidden = true;
  }

  function close(): void {
    o.root.classList.remove('nq-cc-show-history');
    o.root.classList.remove('nq-cc-show-txdetail');
  }

  const unsubLang = i18n.onChange(() => renderAll());

  return {
    refresh,
    clear,
    close,
    destroy() {
      unsubLang();
      gen += 1;
      clearTimeout(copyTimer);
    },
  };
}
