// Open-in-Pay gate (C2-421, from Stakes): for a page that must not run outside
// Nimiq Pay. A touch device gets one button that runs the opener ladder; a
// desktop, where there is no Pay to hand off to, gets a QR of the https App
// Link for the phone to scan.
//
// It heals itself. Pay can show its passcode screen before it injects
// `window.nimiqPay` / `window.nimiq`, so a gate that checked once at mount
// would dead-end a visitor who is in fact inside Pay. The gate re-checks on
// `visibilitychange`, `focus` and `pageshow`, and hands over to the host
// through `onInsidePay` the moment either object appears.

import type { I18n } from '../i18n';
import { nimiqQr } from '../ui/qr';
import {
  buildOpenInPayUrl,
  isInsideNimiqPay,
  openInNimiqPay,
  type BuildOpenInPayOptions,
  type DeeplinkDocument,
  type DeeplinkWindow,
} from './index';

export type GateVariant = 'touch' | 'desktop';

export interface OpenInPayGateOptions extends BuildOpenInPayOptions {
  /** The page to open inside Pay. Default: the current location. */
  target?: string | URL;
  /** Called once, when Pay's objects appear (including at mount). */
  onInsidePay?: () => void;
  /** Translates the labels through `shell.openInPay`, like every other shell
   *  mount. Without it the English string is used. */
  i18n?: I18n;
  /** Force a variant. Default: `(pointer: coarse)` picks touch. */
  variant?: GateVariant;
  /** QR renderer. Default: the shell's own `nimiqQr`. */
  qr?: (text: string, sizePx: number, host?: Element | null) => HTMLElement;
  /** QR size in CSS px. Default 200. */
  qrSize?: number;
  /** Injected browser objects, for tests. */
  win?: DeeplinkWindow & Partial<Pick<Window, 'addEventListener' | 'removeEventListener' | 'matchMedia'>>;
  doc?: DeeplinkDocument;
  navigate?: (url: string) => void;
  /** Inject the component's <style> once. Default true. */
  injectStyles?: boolean;
}

export interface OpenInPayGateHandle {
  el: HTMLDivElement;
  variant: GateVariant;
  destroy(): void;
}

const STYLE_ID = 'nimiq-shell-payopen-style';

function ensureStyles(doc: Document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.nq-payopen { display:flex; flex-direction:column; align-items:center; gap:14px; text-align:center; font-family:'Mulish',system-ui,sans-serif; }
.nq-payopen__btn { display:inline-flex; align-items:center; justify-content:center; height:48px; padding:0 24px;
  border:none; border-radius:999px; background:var(--nq-payopen-bg, #0582ca); color:var(--nq-payopen-fg, #fff);
  font:inherit; font-size:16px; font-weight:700; cursor:pointer; }
.nq-payopen__btn:focus-visible { outline:2px solid var(--nq-payopen-bg, #0582ca); outline-offset:3px; }
.nq-payopen__qr { padding:12px; border-radius:12px; background:var(--nq-cc-qr-plate, #fff); line-height:0; }
.nq-payopen__caption { margin:0; font-size:15px; font-weight:700; }
`;
  doc.head.appendChild(style);
}

const EN_OPEN = 'Open in Nimiq Pay';

/** Mount the gate into `container`. */
export function mountOpenInPayGate(container: HTMLElement, opts: OpenInPayGateOptions = {}): OpenInPayGateHandle {
  const win = opts.win ?? (globalThis as unknown as NonNullable<OpenInPayGateOptions['win']>);
  const doc = container.ownerDocument;
  const target = opts.target ?? win.location?.href ?? '';
  const label = () => (opts.i18n ? opts.i18n.t('shell.openInPay') : EN_OPEN);
  const coarse = win.matchMedia?.('(pointer: coarse)').matches ?? false;
  const variant: GateVariant = opts.variant ?? (coarse ? 'touch' : 'desktop');
  if (opts.injectStyles !== false) ensureStyles(doc);

  const root = doc.createElement('div');
  root.className = `nq-payopen nq-payopen--${variant}`;
  const texts: HTMLElement[] = [];

  if (variant === 'touch') {
    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'nq-payopen__btn';
    btn.addEventListener('click', () => {
      openInNimiqPay(target, {
        appStoreUrl: opts.appStoreUrl,
        playStoreUrl: opts.playStoreUrl,
        win,
        doc: opts.doc ?? (doc as unknown as DeeplinkDocument),
        navigate: opts.navigate,
      });
    });
    texts.push(btn);
    root.appendChild(btn);
  } else {
    const { https } = buildOpenInPayUrl(target, opts);
    const caption = doc.createElement('p');
    caption.className = 'nq-payopen__caption';
    texts.push(caption);
    const plate = doc.createElement('div');
    plate.className = 'nq-payopen__qr';
    plate.dataset.url = https;
    plate.appendChild((opts.qr ?? nimiqQr)(https, opts.qrSize ?? 200, container));
    root.appendChild(caption);
    root.appendChild(plate);
  }

  const renderText = () => {
    for (const el of texts) el.textContent = label();
  };
  renderText();
  const unsubscribe = opts.i18n?.onChange(renderText) ?? (() => {});
  container.appendChild(root);

  // The self-heal watcher.
  const watchDoc = opts.doc ?? (doc as unknown as DeeplinkDocument);
  let done = false;
  const check = () => {
    if (done || !isInsideNimiqPay(win)) return;
    stopWatching();
    opts.onInsidePay?.();
  };
  const stopWatching = () => {
    done = true;
    watchDoc.removeEventListener('visibilitychange', check);
    win.removeEventListener?.('focus', check);
    win.removeEventListener?.('pageshow', check);
  };
  watchDoc.addEventListener('visibilitychange', check);
  win.addEventListener?.('focus', check);
  win.addEventListener?.('pageshow', check);
  check();

  return {
    el: root,
    variant,
    destroy() {
      stopWatching();
      unsubscribe();
      root.remove();
    },
  };
}
