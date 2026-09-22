// Internal seam: how the wallet layer loads @nimiq/mini-app-sdk. Not exported
// from the package. Tests swap the loader to observe the `init({ timeout })`
// budget without touching window timers or the real SDK.

export interface MiniAppSdk {
  init(options?: { timeout?: number }): Promise<unknown>;
}

const realLoader = (): Promise<MiniAppSdk> =>
  import('@nimiq/mini-app-sdk') as unknown as Promise<MiniAppSdk>;

let loader: () => Promise<MiniAppSdk> = realLoader;

/** Lazy-load the SDK, keeping it out of the Hub code path until needed. */
export function loadMiniAppSdk(): Promise<MiniAppSdk> {
  return loader();
}

/** @internal Tests only. Pass nothing to restore the real loader. */
export function __setMiniAppSdkLoader(next?: () => Promise<MiniAppSdk>): void {
  loader = next ?? realLoader;
}
