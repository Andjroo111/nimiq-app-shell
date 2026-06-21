// Runtime detection for the dual-mode wallet.
//
// The contract: if Nimiq Pay is hosting us, it injects `window.nimiqPay` (the
// read-only host context) synchronously before our page script runs, and
// resolves `window.nimiq` (the provider) shortly after. So the cheap, reliable
// signal is `window.nimiqPay`. We fall back to a short init() probe only when
// asked to, because init() polls and times out (~10s default) standalone.

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
