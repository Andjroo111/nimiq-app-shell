// Runtime detection for the dual-mode wallet.
//
// The contract: if Nimiq Pay is hosting us, it injects `window.nimiqPay` (the
// read-only host context) synchronously before our page script runs, and
// resolves `window.nimiq` (the provider) shortly after. So the cheap, reliable
// signal is `window.nimiqPay`. We fall back to a short init() probe only when
// asked to, because init() polls and times out (~10s default) standalone.

import { withTimeout } from './timeout';
import { loadMiniAppSdk } from './sdk-loader';

/** True when the Nimiq Pay host context is present → mini-app mode. */
export function isMiniAppHost(): boolean {
  return typeof window !== 'undefined' && !!window.nimiqPay;
}

/** True when a Nimiq provider has already been injected on window. */
export function hasNimiqProvider(): boolean {
  return typeof window !== 'undefined' && !!window.nimiq;
}

/**
 * Detect mode synchronously from the injected globals. Returns 'miniapp' when
 * either the host context or the provider is present, else 'hub'. No probing,
 * no timeout — safe to call during boot.
 */
export function detectModeSync(): 'miniapp' | 'hub' {
  return isMiniAppHost() || hasNimiqProvider() ? 'miniapp' : 'hub';
}

// ---- async detection ladder (C1-373) + diagnostics (C1-465) ------------------
//
// detectModeSync answers from globals alone. detectMode is the async ladder for
// apps that want to wait for a slow host: Android Nimiq Pay can resolve
// window.nimiq seconds after first paint.
//
// The ladder is asymmetric on purpose. With a host hint (window.nimiqPay,
// window.nimiq, or a NimiqPay user agent) it makes up to three escalating
// attempts totalling ~8s. Without one it fails fast (~900ms), so a plain
// browser shows its "open in Nimiq Pay" state at once. A `?to=` or `?ref=`
// deep link sits in between: someone followed a Pay link, the host may just be
// slow. A positive result is cached for the page's life; a negative one for
// 5s only, so a retry tap re-probes.

/** True when the user agent names the Nimiq Pay app. */
export function isNimiqPayUserAgent(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = (navigator as { userAgent?: unknown }).userAgent;
  return typeof ua === 'string' && /NimiqPay/i.test(ua);
}

/** Synchronous hint that a Nimiq Pay host is (or is about to be) present. */
export function hasHostHint(): boolean {
  return isMiniAppHost() || hasNimiqProvider() || isNimiqPayUserAgent();
}

function hasDeepLinkParams(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const search = (window as { location?: { search?: unknown } }).location?.search;
    if (typeof search !== 'string' || !search) return false;
    const params = new URLSearchParams(search);
    return params.has('to') || params.has('ref');
  } catch {
    return false;
  }
}

/** How the last detection (or provider init) resolved. */
export type WalletResolvedVia =
  | 'none' // nothing has run yet
  | 'window.nimiq' // provider was already injected
  | 'sdk-init' // the SDK's init() resolved a provider
  | 'fallback'; // every attempt ran out

/** A plain, public-data-only record of the last detection. Never an address,
 *  never a key: flags, timings, an error message and method NAMES. */
export interface WalletDiagnostics {
  hasWindowNimiq: boolean;
  hasWindowNimiqPay: boolean;
  hasWindowEthereum: boolean;
  /** Whether @nimiq/mini-app-sdk was imported for this detection. */
  sdkImported: boolean;
  resolvedVia: WalletResolvedVia;
  /** Message of the last init error, or null. Message only, no stack. */
  initError: string | null;
  elapsedMs: number;
  /** Total time budget the detection was allowed. */
  budgetMs: number;
  userAgent: string;
  /** Function names the resolved provider exposes, prototype chain included. */
  providerMethods: string[];
}

function windowFlag(key: string): boolean {
  return typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>)[key];
}

function currentUserAgent(): string {
  if (typeof navigator === 'undefined') return '';
  const ua = (navigator as { userAgent?: unknown }).userAgent;
  return typeof ua === 'string' ? ua : '';
}

/** Function names on an object and its prototype chain, Object.prototype
 *  excluded. Names only: no property value is read beyond its descriptor. */
function listProviderMethods(provider: unknown): string[] {
  const names = new Set<string>();
  let obj: unknown = provider;
  while (obj && typeof obj === 'object' && obj !== Object.prototype) {
    for (const name of Object.getOwnPropertyNames(obj)) {
      if (name === 'constructor') continue;
      const desc = Object.getOwnPropertyDescriptor(obj, name);
      if (desc && typeof desc.value === 'function') names.add(name);
    }
    obj = Object.getPrototypeOf(obj);
  }
  return [...names].sort();
}

function baselineDiagnostics(): WalletDiagnostics {
  return {
    hasWindowNimiq: windowFlag('nimiq'),
    hasWindowNimiqPay: windowFlag('nimiqPay'),
    hasWindowEthereum: windowFlag('ethereum'),
    sdkImported: false,
    resolvedVia: 'none',
    initError: null,
    elapsedMs: 0,
    budgetMs: 0,
    userAgent: currentUserAgent(),
    providerMethods: [],
  };
}

let lastDiagnostics: WalletDiagnostics | null = null;

/** @internal Record a detection or provider init. Window flags and the user
 *  agent are sampled here; the caller supplies the outcome. */
export function recordWalletDiagnostics(outcome: {
  sdkImported: boolean;
  resolvedVia: WalletResolvedVia;
  initError: string | null;
  elapsedMs: number;
  budgetMs: number;
  provider?: unknown;
}): void {
  lastDiagnostics = {
    ...baselineDiagnostics(),
    sdkImported: outcome.sdkImported,
    resolvedVia: outcome.resolvedVia,
    initError: outcome.initError,
    elapsedMs: outcome.elapsedMs,
    budgetMs: outcome.budgetMs,
    providerMethods: outcome.provider ? listProviderMethods(outcome.provider) : [],
  };
}

/**
 * The last detection, as a fresh plain object: answers "it says Hub mode, what
 * went wrong" on-device without a debugger. Before any detection has run it
 * reports the current window flags with `resolvedVia: 'none'`.
 */
export function walletDiagnostics(): WalletDiagnostics {
  const d = lastDiagnostics ?? baselineDiagnostics();
  return { ...d, providerMethods: [...d.providerMethods] };
}

/** @internal An error's message, never its stack. */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Budgets for detectMode, all in milliseconds. */
export interface DetectModeOptions {
  /** Per-attempt budgets when a host hint is present. Default
   *  [1500, 2500, 4000]: three escalating attempts, ~8s in total. */
  hintedAttemptsMs?: number[];
  /** Single budget with no hint and no deep link. Default 900. */
  noHintMs?: number;
  /** Single budget with no hint but a `?to=` or `?ref=` deep link. Default 3000. */
  deepLinkMs?: number;
  /** How long a negative ('hub') result is cached. Default 5000. */
  negativeCacheMs?: number;
}

const DETECT_DEFAULTS = {
  hintedAttemptsMs: [1500, 2500, 4000],
  noHintMs: 900,
  deepLinkMs: 3000,
  negativeCacheMs: 5000,
} as const;

let positive = false;
let negativeAt: number | null = null;
let negativeTtl: number = DETECT_DEFAULTS.negativeCacheMs;
let inFlight: Promise<'miniapp' | 'hub'> | null = null;

/** @internal Tests only: forget cached results and diagnostics. */
export function __resetDetection(): void {
  positive = false;
  negativeAt = null;
  negativeTtl = DETECT_DEFAULTS.negativeCacheMs;
  inFlight = null;
  lastDiagnostics = null;
}

function attemptBudgets(opts: DetectModeOptions): number[] {
  if (hasHostHint()) return [...(opts.hintedAttemptsMs ?? DETECT_DEFAULTS.hintedAttemptsMs)];
  if (hasDeepLinkParams()) return [opts.deepLinkMs ?? DETECT_DEFAULTS.deepLinkMs];
  return [opts.noHintMs ?? DETECT_DEFAULTS.noHintMs];
}

async function probe(opts: DetectModeOptions): Promise<'miniapp' | 'hub'> {
  const start = Date.now();
  const budgets = attemptBudgets(opts);
  const budgetMs = budgets.reduce((a, b) => a + b, 0);

  if (hasNimiqProvider()) {
    recordWalletDiagnostics({
      sdkImported: false,
      resolvedVia: 'window.nimiq',
      initError: null,
      elapsedMs: Date.now() - start,
      budgetMs,
      provider: window.nimiq,
    });
    return 'miniapp';
  }

  let sdkImported = false;
  let initError: string | null = null;
  for (const ms of budgets) {
    try {
      const sdk = await loadMiniAppSdk();
      sdkImported = true;
      // Detection is read-only, so a timeout is safe here. The SDK rejects on
      // its own timer; the race covers a suspended WebView that never settles.
      const provider = await withTimeout(sdk.init({ timeout: ms }), ms, null);
      if (provider) {
        recordWalletDiagnostics({
          sdkImported,
          resolvedVia: 'sdk-init',
          initError,
          elapsedMs: Date.now() - start,
          budgetMs,
          provider,
        });
        return 'miniapp';
      }
      initError = `init did not resolve within ${ms}ms`;
    } catch (err) {
      initError = errorMessage(err);
    }
  }

  recordWalletDiagnostics({
    sdkImported,
    resolvedVia: 'fallback',
    initError,
    elapsedMs: Date.now() - start,
    budgetMs,
  });
  return 'hub';
}

/**
 * Detect the runtime asynchronously with the host-aware ladder described
 * above. Resolves 'miniapp' or 'hub' and never rejects. Concurrent callers
 * share one in-flight probe. Additive: createWallet still picks its mode
 * synchronously via detectModeSync.
 */
export function detectMode(opts: DetectModeOptions = {}): Promise<'miniapp' | 'hub'> {
  if (positive) return Promise.resolve('miniapp');
  if (negativeAt !== null && Date.now() - negativeAt < negativeTtl) {
    return Promise.resolve('hub');
  }
  if (inFlight) return inFlight;
  const ttl = opts.negativeCacheMs ?? DETECT_DEFAULTS.negativeCacheMs;
  inFlight = probe(opts)
    .catch((): 'hub' => 'hub')
    .then((mode) => {
      if (mode === 'miniapp') {
        positive = true;
        negativeAt = null;
      } else {
        negativeAt = Date.now();
        negativeTtl = ttl;
      }
      inFlight = null;
      return mode;
    });
  return inFlight;
}
