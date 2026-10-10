// Nimiq Pay native fullscreen (mini-app-sdk 0.2.4 host API).
//
// Newer Pay hosts put requestFullscreen / exitFullscreen / getFullscreen /
// onFullscreenChange on window.nimiqPay. Older hosts and every other browser
// do not, and then nothing here shows or throws. The SDK states the rule:
// "The Mini App must ask the user before each request. Nimiq Pay adds no
// prompt." So entering always goes through an `ask` the app supplies, or the
// shell's own small sheet (askPayFullscreen).
//
// The host is read directly, not through the SDK, so this works whatever SDK
// version the app bundles. All four calls must be present before any is used
// (Nimiq Names' rule): a host with request but no exit would strand the user.
// Ported from Blacktop, Cinima and Nimiq Names (recon W-261009-93, -96, -158).

import type { I18n } from '../i18n';
import { ensureSheetStyles } from './report-bug';
import { applyTheme, type ShellTheme } from './theme';

export interface PayFullscreenHost {
  requestFullscreen(): Promise<void>;
  exitFullscreen(): Promise<void>;
  getFullscreen(): Promise<boolean>;
  onFullscreenChange(listener: (enabled: boolean) => void): () => void;
}

type Win = { nimiqPay?: unknown } | undefined;
const defaultWin = (): Win => (typeof window !== 'undefined' ? (window as Win) : undefined);

/** The host's fullscreen API, or null unless all four calls are there. */
export function getPayFullscreenHost(win: Win = defaultWin()): PayFullscreenHost | null {
  const h = win?.nimiqPay as Partial<PayFullscreenHost> | undefined;
  if (!h) return null;
  const fns = ['requestFullscreen', 'exitFullscreen', 'getFullscreen', 'onFullscreenChange'] as const;
  return fns.every((f) => typeof h[f] === 'function') ? (h as PayFullscreenHost) : null;
}

export function isPayFullscreenSupported(win?: Win): boolean {
  return getPayFullscreenHost(win ?? defaultWin()) !== null;
}

/** Whether the host is fullscreen now. False when unsupported or on error. */
export async function getPayFullscreen(win?: Win): Promise<boolean> {
  const h = getPayFullscreenHost(win ?? defaultWin());
  if (!h) return false;
  try {
    return (await h.getFullscreen()) === true;
  } catch {
    return false;
  }
}

/** Enter fullscreen. Call ONLY after the user said yes. Resolves false, never
 *  throws, when the host is missing or refuses. */
export async function enterPayFullscreen(win?: Win): Promise<boolean> {
  const h = getPayFullscreenHost(win ?? defaultWin());
  if (!h) return false;
  try {
    await h.requestFullscreen();
    return true;
  } catch {
    return false;
  }
}

export async function exitPayFullscreen(win?: Win): Promise<boolean> {
  const h = getPayFullscreenHost(win ?? defaultWin());
  if (!h) return false;
  try {
    await h.exitFullscreen();
    return true;
  } catch {
    return false;
  }
}

/**
 * Track the host's fullscreen state: sets `data-pay-fullscreen` on <html> so
 * CSS can drop the top inset to the safe area, and calls `onChange`. The host
 * also leaves fullscreen when the app is backgrounded, so the state is re-read
 * on every return to visible. Returns an unsubscribe; a no-op when unsupported.
 */
export function watchPayFullscreen(
  onChange?: (enabled: boolean) => void,
  o: { win?: Win; doc?: Document } = {},
): () => void {
  const h = getPayFullscreenHost(o.win ?? defaultWin());
  const doc = o.doc ?? (typeof document !== 'undefined' ? document : undefined);
  if (!h || !doc) return () => {};
  let last: boolean | null = null;
  const apply = (on: boolean) => {
    if (on === last) return;
    last = on;
    if (on) doc.documentElement.setAttribute('data-pay-fullscreen', '');
    else doc.documentElement.removeAttribute('data-pay-fullscreen');
    onChange?.(on);
  };
  const refresh = () => {
    h.getFullscreen().then((v) => apply(v === true), () => {});
  };
  let off: () => void = () => {};
  try {
    off = h.onFullscreenChange((v) => apply(v === true));
  } catch {
    /* no change events: the visibility re-read still keeps it honest */
  }
  const onVis = () => {
    if (doc.visibilityState === 'visible') refresh();
  };
  doc.addEventListener('visibilitychange', onVis);
  refresh();
  return () => {
    try {
      off();
    } catch {
      /* host already gone */
    }
    doc.removeEventListener('visibilitychange', onVis);
  };
}

/** What the user answered: go fullscreen, not now, or never ask again. */
export type FullscreenAnswer = 'yes' | 'no' | 'never';

export type FullscreenOffer = 'entered' | 'declined' | 'muted' | 'asked' | 'already' | 'unsupported' | 'failed';

export interface OfferPayFullscreenOptions {
  /** Ask the user. Required: Pay adds no prompt of its own. */
  ask: () => Promise<FullscreenAnswer>;
  win?: Win;
  /** Where "never" is remembered. Default localStorage; null keeps it in memory. */
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  /** Storage key for the mute. Default 'nq-shell:fullscreen-muted'. */
  key?: string;
}

const MUTE_KEY = 'nq-shell:fullscreen-muted';
let askedThisLaunch = false;

function store(o: OfferPayFullscreenOptions): Pick<Storage, 'getItem' | 'setItem'> | null {
  if (o.storage !== undefined) return o.storage;
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

/**
 * Offer fullscreen once per launch, the way the fleet's rivals do it: skip
 * silently when the host cannot, when the user muted it, when it was already
 * offered this launch, or when the host is already fullscreen; otherwise ask
 * and enter on yes. Never throws; the outcome says what happened.
 */
export async function offerPayFullscreen(o: OfferPayFullscreenOptions): Promise<FullscreenOffer> {
  if (!getPayFullscreenHost(o.win ?? defaultWin())) return 'unsupported';
  const s = store(o);
  const key = o.key ?? MUTE_KEY;
  try {
    if (s?.getItem(key) === '1') return 'muted';
  } catch {
    /* unreadable storage: treat as not muted */
  }
  if (askedThisLaunch) return 'asked';
  if (await getPayFullscreen(o.win)) return 'already';
  askedThisLaunch = true;
  let answer: FullscreenAnswer;
  try {
    answer = await o.ask();
  } catch {
    return 'declined';
  }
  if (answer === 'never') {
    try {
      s?.setItem(key, '1');
    } catch {
      /* this launch only */
    }
    return 'muted';
  }
  if (answer !== 'yes') return 'declined';
  return (await enterPayFullscreen(o.win)) ? 'entered' : 'failed';
}

/** @internal Tests only. */
export function __resetPayFullscreenOffer(): void {
  askedThisLaunch = false;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/**
 * The shell's own ask: a small sheet with Full screen / Not now / Don't ask
 * again, in the report-a-bug sheet's styling. Pass it as `ask` to
 * offerPayFullscreen, or supply the app's own modal instead.
 */
export function askPayFullscreen(
  doc: Document,
  i18n: I18n,
  o: { theme?: ShellTheme } = {},
): Promise<FullscreenAnswer> {
  return new Promise((resolve) => {
    const existing = doc.getElementById('nq-fs-scrim');
    if (existing) existing.remove();
    ensureSheetStyles(doc);
    const t = (k: string) => escapeHtml(i18n.t(k));
    const scrim = doc.createElement('div');
    scrim.id = 'nq-fs-scrim';
    scrim.className = 'nq-fb-scrim';
    if (o.theme) applyTheme(scrim, o.theme);
    scrim.innerHTML = `
    <div class="nq-fb-card" role="dialog" aria-modal="true" aria-labelledby="nq-fs-title">
      <div class="nq-fb-head"><h2 class="nq-fb-title" id="nq-fs-title">${t('shell.fullscreenAsk')}</h2></div>
      <div class="nq-fb-actions">
        <button type="button" class="nq-fb-cancel" data-answer="never">${t('shell.dontAskAgain')}</button>
        <button type="button" class="nq-fb-cancel" data-answer="no">${t('shell.notNow')}</button>
        <button type="button" class="nq-fb-send" data-answer="yes">${t('shell.fullscreenYes')}</button>
      </div>
    </div>`;
    const done = (a: FullscreenAnswer) => {
      scrim.remove();
      doc.removeEventListener('keydown', onKey);
      resolve(a);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') done('no');
    };
    scrim.addEventListener('click', (e) => {
      const a = (e.target as HTMLElement).closest?.('[data-answer]')?.getAttribute('data-answer');
      if (a === 'yes' || a === 'no' || a === 'never') done(a);
    });
    // pointerdown, NOT click: iOS Safari doesn't fire click on a bare backdrop.
    scrim.addEventListener('pointerdown', (e) => {
      if (e.target === scrim) done('no');
    });
    doc.addEventListener('keydown', onKey);
    doc.body.appendChild(scrim);
    (scrim.querySelector('[data-answer="yes"]') as HTMLButtonElement | null)?.focus();
  });
}
