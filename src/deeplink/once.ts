// Redirect a phone visitor into Nimiq Pay ONCE per tab (recon C2-273).
//
// If Pay is not installed, or the visitor came back from it, a second
// automatic redirect is a loop. The first attempt is remembered in
// sessionStorage; after that the host shows instructions instead. Never on
// desktop, never inside Pay.

import { buildOpenInPayUrl, detectMobilePlatform, isInsideNimiqPay, openInNimiqPay, type OpenInNimiqPayOptions, type OpenInNimiqPayResult } from './index';

export interface SessionStorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

export type AutoOpenResult =
  | { opened: true; result: OpenInNimiqPayResult }
  | { opened: false; reason: 'inside-pay' | 'desktop' | 'already-tried' };

export function autoOpenInNimiqPayOnce(
  target: string | URL,
  opts: OpenInNimiqPayOptions & { storage?: SessionStorageLike | null; key?: string } = {},
): AutoOpenResult {
  const win = opts.win ?? (globalThis as never);
  if (isInsideNimiqPay(win as { nimiqPay?: unknown; nimiq?: unknown })) return { opened: false, reason: 'inside-pay' };
  const nav = (win as { navigator?: { userAgent: string; maxTouchPoints?: number } }).navigator;
  if (detectMobilePlatform(nav) === null) return { opened: false, reason: 'desktop' };

  const key = opts.key ?? 'nq-shell:open-in-pay:tried';
  let storage: SessionStorageLike | null = null;
  if (opts.storage !== undefined) storage = opts.storage;
  else {
    try {
      storage = (globalThis as { sessionStorage?: SessionStorageLike }).sessionStorage ?? null;
    } catch {
      storage = null;
    }
  }
  // An unreadable flag counts as tried: a storage whose reads throw but whose
  // writes work would otherwise redirect on every load.
  let tried = true;
  try {
    tried = storage?.getItem(key) === '1';
  } catch {
    tried = true;
  }
  // No storage means no memory: refuse to auto-redirect rather than risk a loop.
  if (tried || !storage) return { opened: false, reason: 'already-tried' };
  // A target that cannot be built must not burn the one attempt.
  buildOpenInPayUrl(target, opts);
  try {
    storage.setItem(key, '1');
  } catch {
    return { opened: false, reason: 'already-tried' };
  }
  return { opened: true, result: openInNimiqPay(target, opts) };
}
