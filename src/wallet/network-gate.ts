// Which chain is the wallet on? (recon C2-263, C2-289, C2-262)
//
// Nimiq Pay's provider answers getNetwork() with the constant 'nimiq' and can
// be switched to testnet, so the only honest signal is its block height
// compared with each network's head as read by an independent RPC. A testnet
// wallet paying a mainnet invoice, or the reverse, is caught here before any
// payment sheet opens. Pure: the caller supplies the heads (settlement's
// transport, or its own server route).

export type NetworkName = 'main' | 'test';

/** Default allowed drift. Albatross makes ~1 block/s; 600 is ten minutes. */
export const WALLET_HEAD_TOLERANCE_BLOCKS = 600;

export type NetworkMatch =
  | { network: NetworkName; drift: number }
  | { network: null; reason: 'no-height' | 'no-heads' | 'no-match' | 'ambiguous' };

/**
 * The network whose head is within `tolerance` of the wallet's height. Two
 * candidates within tolerance is `ambiguous`, never a guess.
 */
export function matchNetworkByHeight(
  walletHeight: number | null | undefined,
  heads: Partial<Record<NetworkName, number | null>>,
  tolerance: number = WALLET_HEAD_TOLERANCE_BLOCKS,
): NetworkMatch {
  if (typeof walletHeight !== 'number' || !Number.isFinite(walletHeight) || walletHeight <= 0) {
    return { network: null, reason: 'no-height' };
  }
  const known = (Object.entries(heads) as [NetworkName, number | null | undefined][]).filter(
    (e): e is [NetworkName, number] => typeof e[1] === 'number' && Number.isFinite(e[1]) && e[1] > 0,
  );
  if (known.length === 0) return { network: null, reason: 'no-heads' };
  const near = known
    .map(([network, head]) => ({ network, drift: Math.abs(head - walletHeight) }))
    .filter((c) => c.drift <= tolerance);
  if (near.length === 0) return { network: null, reason: 'no-match' };
  if (near.length > 1) return { network: null, reason: 'ambiguous' };
  return near[0]!;
}

/**
 * Gate a payment: ok only when the wallet is provably on `expected`. An
 * unreadable height or head is NOT ok; the caller decides whether to let a
 * user proceed on unknown, this function never does.
 */
export function walletMatchesNetwork(
  expected: NetworkName,
  walletHeight: number | null | undefined,
  heads: Partial<Record<NetworkName, number | null>>,
  tolerance?: number,
): { ok: true } | { ok: false; actual: NetworkName | null; reason: string } {
  const m = matchNetworkByHeight(walletHeight, heads, tolerance);
  if (m.network === expected) return { ok: true };
  if (m.network !== null) return { ok: false, actual: m.network, reason: 'wrong-network' };
  return { ok: false, actual: null, reason: m.reason };
}

/** A provider's block height, or null. Handles the SDK's error envelope and a
 *  provider without the method. Never throws. */
export async function readWalletHeight(provider: unknown): Promise<number | null> {
  const fn = (provider as { getBlockNumber?: () => Promise<unknown> } | null)?.getBlockNumber;
  if (typeof fn !== 'function') return null;
  try {
    const v = await fn.call(provider);
    const n = typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v;
    return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}
