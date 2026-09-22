// Open in Nimiq Pay: the link builder and the opener ladder.
//
// Five fleet recon findings describe the same job from five apps, and each got
// one part right. This file is the union, ported to plain functions:
//
//   C2-030 (LunaBell, mirroring nimiq/nimpay-website): the Android intent URL
//     with a Play fallback, the iOS custom scheme with a 5 s store fallback, and
//     platform detection that catches iPadOS reporting itself as a Mac.
//   C2-144 (Cinima): the `%2F` trap. Pay opens the mini app but drops the page
//     when the scheme's `url` has its slashes encoded, so `:` and `/` go back in
//     after encodeURIComponent. A bare origin is sent as `host[:port]`; a path
//     or query is sent as a full absolute URL so Pay can load the deep page.
//   C1-347 (Pull): social webviews that silently swallow custom schemes.
//   C2-133 (Mimo): skip everything when already inside Pay, and let
//     `visibilitychange` cancel the store fallback once the app has opened.
//   C2-421 (Stakes): the https App Link 404s for apps not yet in the Pay
//     catalogue, so the custom scheme stays the iOS route for them.
//
// Pure at import time: nothing here touches `window` or `document` until a
// function is called, and every browser object can be injected.

export const APP_STORE_URL = 'https://apps.apple.com/app/nimiq-pay/id6471844738';
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.nimiq.pay';
export const NIMIQ_PAY_PACKAGE = 'com.nimiq.pay';
/** How long iOS waits for Pay to take focus before sending the visitor to the
 *  App Store. The nimpay-website value. */
export const IOS_STORE_FALLBACK_MS = 5000;

/** The App Link host Nimiq Pay registers. */
const APP_LINK_HOST = 'nimpay.app';

export type MobilePlatform = 'ios' | 'android' | null;
export type InAppBrowser = 'snapchat' | 'instagram' | 'facebook' | 'tiktok' | 'line';

export interface OpenInPayUrls {
  /** `https://nimpay.app/miniapps/open/<host><path><query>`, the App Link. */
  https: string;
  /** `nimiqpay://miniapp?url=<target>`, with `:` and `/` left literal. */
  scheme: string;
  /** Chrome's intent form: opens Pay, or falls back to the Play Store. */
  androidIntent: string;
  store: { ios: string; android: string };
}

export interface BuildOpenInPayOptions {
  appStoreUrl?: string;
  playStoreUrl?: string;
}

/** Parse a target that may be missing its scheme (`myapp.com/x` is accepted). */
function parseTarget(target: string | URL): URL {
  if (target instanceof URL) return new URL(target.href);
  const raw = target.trim();
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw) ? raw : `https://${raw}`;
  return new URL(withScheme);
}

/** The pathname with a lone or trailing `/` dropped, so `https://a.com/` and
 *  `https://a.com` build the same link. */
function trimPath(u: URL): string {
  return u.pathname.replace(/\/+$/, '');
}

/** `<host><path><query>` with no scheme: the tail of the App Link. */
function openPath(u: URL): string {
  return `${u.host}${trimPath(u)}${u.search}`;
}

/** The value for the scheme's `url` param (C2-144): a bare origin becomes
 *  `host[:port]`, anything deeper becomes a full absolute URL. */
export function payMiniAppSchemeTarget(target: string | URL): string {
  const u = parseTarget(target);
  const path = trimPath(u);
  if (path || u.search || u.hash) return `${u.protocol}//${u.host}${path}${u.search}${u.hash}`;
  return u.host;
}

/** encodeURIComponent, then `:` and `/` put back. Pay drops the page when the
 *  slashes arrive as `%2F` (C2-144). */
export function encodeMiniAppUrlValue(value: string): string {
  return encodeURIComponent(value).replace(/%3A/gi, ':').replace(/%2F/gi, '/');
}

/** Every link a host needs to send a visitor into Nimiq Pay. */
export function buildOpenInPayUrl(target: string | URL, opts: BuildOpenInPayOptions = {}): OpenInPayUrls {
  const u = parseTarget(target);
  const ios = opts.appStoreUrl ?? APP_STORE_URL;
  const android = opts.playStoreUrl ?? PLAY_STORE_URL;
  const tail = openPath(u);
  // `;` and `#` end an intent URL's path early, so they are escaped here only.
  const intentTail = tail.replace(/;/g, '%3B').replace(/#/g, '%23');
  return {
    https: `https://${APP_LINK_HOST}/miniapps/open/${tail}`,
    scheme: `nimiqpay://miniapp?url=${encodeMiniAppUrlValue(payMiniAppSchemeTarget(u))}`,
    androidIntent:
      `intent://${APP_LINK_HOST}/miniapps/open/${intentTail}` +
      `#Intent;scheme=https;package=${NIMIQ_PAY_PACKAGE};` +
      `S.browser_fallback_url=${encodeURIComponent(android)};end`,
    store: { ios, android },
  };
}

interface NavigatorLike {
  userAgent: string;
  maxTouchPoints?: number;
}

function currentNavigator(): NavigatorLike | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator;
}

/** `ios`, `android`, or null for everything else. iPadOS 13+ sends a Mac user
 *  agent; a "Mac" with more than one touch point is an iPad (C2-030). */
export function detectMobilePlatform(nav: NavigatorLike | undefined = currentNavigator()): MobilePlatform {
  if (!nav) return null;
  const ua = nav.userAgent || '';
  if (/Android/i.test(ua)) return 'android';
  if (/iPad|iPhone|iPod/i.test(ua)) return 'ios';
  if ((nav.maxTouchPoints ?? 0) > 1 && /Macintosh/i.test(ua)) return 'ios';
  return null;
}

/** The social webview the page is running in, or null (C1-347). These swallow
 *  custom URL schemes without an error, which is why a host wants to know. */
export function detectInAppBrowser(ua: string | undefined = currentNavigator()?.userAgent): InAppBrowser | null {
  if (!ua) return null;
  if (/Snapchat/i.test(ua)) return 'snapchat';
  if (/Instagram/i.test(ua)) return 'instagram';
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'facebook';
  if (/TikTok|Bytedance|musical_ly/i.test(ua)) return 'tiktok';
  if (/\bLine\//i.test(ua)) return 'line';
  return null;
}

/** The slice of `window` the ladder reads. */
export interface DeeplinkWindow {
  nimiqPay?: unknown;
  nimiq?: unknown;
  navigator?: NavigatorLike;
  location?: { href: string };
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

/** The slice of `document` the ladder reads. */
export interface DeeplinkDocument {
  visibilityState: string;
  addEventListener(type: 'visibilitychange', fn: () => void): void;
  removeEventListener(type: 'visibilitychange', fn: () => void): void;
}

export interface OpenInNimiqPayOptions extends BuildOpenInPayOptions {
  win?: DeeplinkWindow;
  doc?: DeeplinkDocument;
  /** How the ladder leaves the page. Default: assign `win.location.href`. */
  navigate?: (url: string) => void;
  /** Override the iOS store wait. Default IOS_STORE_FALLBACK_MS. */
  fallbackMs?: number;
}

export type OpenRoute = 'inside-pay' | 'android' | 'ios' | 'desktop';

export interface OpenInNimiqPayResult {
  route: OpenRoute;
  /** The URL navigated to first. */
  url: string;
  /** The social webview detected, so a host can tell the visitor to use their
   *  real browser when the scheme gets swallowed. */
  inAppBrowser: InAppBrowser | null;
  /** Stop a pending iOS store fallback. A no-op on every other route. */
  cancel(): void;
}

/** True when Nimiq Pay is hosting this page. */
export function isInsideNimiqPay(win: { nimiqPay?: unknown; nimiq?: unknown } | undefined =
  typeof window === 'undefined' ? undefined : (window as unknown as DeeplinkWindow)): boolean {
  return !!(win && (win.nimiqPay || win.nimiq));
}

/** Send the visitor to `target` inside Nimiq Pay, by the best route for this
 *  device:
 *
 *    already inside Pay  → navigate to `target` directly
 *    Android             → the intent URL (Chrome falls back to Play itself)
 *    iOS                 → the custom scheme, then the App Store after 5 s if
 *                          the page never lost visibility
 *    anything else       → the https App Link */
export function openInNimiqPay(target: string | URL, opts: OpenInNimiqPayOptions = {}): OpenInNimiqPayResult {
  const win = opts.win ?? (globalThis as unknown as DeeplinkWindow);
  const doc = opts.doc ?? (typeof document === 'undefined' ? undefined : (document as unknown as DeeplinkDocument));
  const navigate = opts.navigate ?? ((url: string) => {
    if (win.location) win.location.href = url;
  });
  const nav = win.navigator ?? currentNavigator();
  const inAppBrowser = detectInAppBrowser(nav?.userAgent);
  const noop = () => {};

  if (isInsideNimiqPay(win)) {
    const url = parseTarget(target).href;
    navigate(url);
    return { route: 'inside-pay', url, inAppBrowser, cancel: noop };
  }

  const urls = buildOpenInPayUrl(target, opts);
  const platform = detectMobilePlatform(nav);

  if (platform === 'android') {
    navigate(urls.androidIntent);
    return { route: 'android', url: urls.androidIntent, inAppBrowser, cancel: noop };
  }

  if (platform === 'ios') {
    let lostVisibility = false;
    let timer: unknown = null;
    const cleanup = () => {
      if (timer !== null) win.clearTimeout(timer);
      timer = null;
      doc?.removeEventListener('visibilitychange', onVisibility);
    };
    // Pay taking focus hides this page. That is the proof the app opened, so
    // the store fallback is cancelled rather than merely skipped (C2-133).
    function onVisibility(): void {
      if (doc?.visibilityState === 'hidden') {
        lostVisibility = true;
        cleanup();
      }
    }
    doc?.addEventListener('visibilitychange', onVisibility);
    navigate(urls.scheme);
    timer = win.setTimeout(() => {
      timer = null;
      const visible = !doc || doc.visibilityState === 'visible';
      cleanup();
      if (!lostVisibility && visible) navigate(urls.store.ios);
    }, opts.fallbackMs ?? IOS_STORE_FALLBACK_MS);
    return { route: 'ios', url: urls.scheme, inAppBrowser, cancel: cleanup };
  }

  navigate(urls.https);
  return { route: 'desktop', url: urls.https, inAppBrowser, cancel: noop };
}

export {
  mountOpenInPayGate,
  type OpenInPayGateOptions,
  type OpenInPayGateHandle,
  type GateVariant,
} from './gate';
