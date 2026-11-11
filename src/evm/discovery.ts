// Which browser wallet. EIP-6963 discovery, ported from nimiq.markets
// (web/src/lib/evm-wallet.ts).
//
// A browser can hold several wallets at once (Brave ships its own beside a
// MetaMask extension), and `window.ethereum` is whichever one won the race to
// claim it. EIP-6963 ends the race: every wallet announces itself with a
// reverse-DNS id, a name and its own icon, and the page picks.
//
// Announcements are ASYNCHRONOUS in practice. A wallet already injected answers
// `eip6963:requestProvider` inside the dispatch, but an extension whose content
// script loads after the page announces later, on its own. So this is a store
// with a change event, not a one-shot read.

/** The slice of an EIP-1193 provider this package calls. */
export interface Eip1193Provider {
  request(args: { method: string; params?: unknown }): Promise<unknown>;
  on?(event: string, listener: (...args: any[]) => void): unknown;
  removeListener?(event: string, listener: (...args: any[]) => void): unknown;
  /** Set by MetaMask on its injected provider. */
  isMetaMask?: boolean;
}

/** What a wallet says about itself (EIP-6963 `EIP6963ProviderInfo`). */
export interface EvmProviderInfo {
  rdns: string;
  name: string;
  /** A data: URI, per the EIP. The wallet's own artwork. */
  icon?: string;
  uuid?: string;
}

export interface AnnouncedProvider {
  info: EvmProviderInfo;
  provider: Eip1193Provider;
}

/** MetaMask's EIP-6963 reverse-DNS id. */
export const METAMASK_RDNS = 'io.metamask';

/** MetaMask first, then everyone else in the order they announced. */
export function orderProviders(list: readonly AnnouncedProvider[]): AnnouncedProvider[] {
  return [
    ...list.filter((a) => a.info.rdns === METAMASK_RDNS),
    ...list.filter((a) => a.info.rdns !== METAMASK_RDNS),
  ];
}

/** MetaMask if announced, else the first announced wallet, else `window.ethereum`. */
export function pickProvider(
  list: readonly AnnouncedProvider[],
  injected: Eip1193Provider | null,
): Eip1193Provider | null {
  return orderProviders(list)[0]?.provider ?? injected;
}

export interface EvmDiscovery {
  /** Every wallet announced so far, MetaMask first. */
  list(): AnnouncedProvider[];
  /** `window.ethereum`, read at call time (a wallet may inject it late). */
  injected(): Eip1193Provider | null;
  /** Fires when a new wallet announces itself. Returns an unsubscribe. */
  onChange(cb: () => void): () => void;
  destroy(): void;
}

function isAnnouncement(detail: unknown): detail is AnnouncedProvider {
  const d = detail as Partial<AnnouncedProvider> | null | undefined;
  return !!d && typeof d.provider?.request === 'function'
    && typeof d.info?.rdns === 'string' && d.info.rdns !== ''
    && typeof d.info.name === 'string';
}

/** Listen for wallets on `win` and ask the ones already there to speak up. */
export function createEvmDiscovery(
  win: Window | undefined = typeof window === 'undefined' ? undefined : window,
): EvmDiscovery {
  const announced: AnnouncedProvider[] = [];
  const listeners = new Set<() => void>();

  const onAnnounce = (event: Event): void => {
    const detail = (event as CustomEvent<unknown>).detail;
    if (!isAnnouncement(detail)) return;
    // One entry per wallet. A wallet re-announces on every request, and two
    // mini wallets on one page each send one.
    if (announced.some((a) => a.info.rdns === detail.info.rdns)) return;
    announced.push({ info: { ...detail.info }, provider: detail.provider });
    for (const cb of [...listeners]) cb();
  };

  if (win) {
    win.addEventListener('eip6963:announceProvider', onAnnounce as EventListener);
    try {
      win.dispatchEvent(new (win as unknown as { Event: typeof Event }).Event('eip6963:requestProvider'));
    } catch {
      /* a window that cannot construct an Event has no wallets to ask */
    }
  }

  return {
    list: () => orderProviders(announced),
    injected() {
      const eth = (win as unknown as { ethereum?: Eip1193Provider } | undefined)?.ethereum;
      return eth && typeof eth.request === 'function' ? eth : null;
    },
    onChange(cb) {
      listeners.add(cb);
      return () => { listeners.delete(cb); };
    },
    destroy() {
      win?.removeEventListener('eip6963:announceProvider', onAnnounce as EventListener);
      listeners.clear();
    },
  };
}

/** This page, opened inside the MetaMask app's own browser (MetaMask's
 *  universal link). The one route to MetaMask from a phone browser, which has
 *  no extension to inject a provider. */
export function metaMaskAppLink(loc: Pick<Location, 'host' | 'pathname' | 'search'>): string {
  return `https://metamask.app.link/dapp/${loc.host}${loc.pathname}${loc.search ?? ''}`;
}

/** A phone or tablet browser, by user agent. Same test nimiq.markets runs. */
export function isMobileBrowser(
  ua: string = typeof navigator === 'undefined' ? '' : navigator.userAgent,
): boolean {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
}
