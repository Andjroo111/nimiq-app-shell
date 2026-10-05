// ?network= runtime override and explorer links that follow it (recon C2-301).
//
// Promote a build between testnet and mainnet without rebuilding: the query
// parameter wins over the app's configured default. This only changes what
// the app READS and links to; the wallet still decides where funds move, so
// pair it with the height-based network gate before any payment.

export type ShellNetwork = 'main' | 'test';

const ALIASES: Record<string, ShellNetwork> = {
  main: 'main',
  mainnet: 'main',
  'main-albatross': 'main',
  mainalbatross: 'main',
  test: 'test',
  testnet: 'test',
  'test-albatross': 'test',
  testalbatross: 'test',
};

/** Normalise any spelling ('MainAlbatross', 'testnet', ...) or null. */
export function parseNetwork(v: unknown): ShellNetwork | null {
  if (typeof v !== 'string') return null;
  return ALIASES[v.trim().toLowerCase()] ?? null;
}

/**
 * `?network=` (or `?net=`) from a search string, else `fallback`. An
 * unrecognised value is ignored rather than guessed. Pass `location.search`.
 *
 * SAFE BY DEFAULT: a URL may only move an app toward TESTNET. Anyone can send
 * a link, so `?network=main` flipping a testnet build onto real money is
 * refused unless the app passes `allowMainnet: true` on purpose.
 */
export function queryNetwork(
  search: string | null | undefined,
  fallback: ShellNetwork,
  opts: { allowMainnet?: boolean } = {},
): ShellNetwork {
  if (!search) return fallback;
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    return fallback;
  }
  const asked = parseNetwork(params.get('network')) ?? parseNetwork(params.get('net'));
  if (asked === null) return fallback;
  if (asked === 'main' && fallback !== 'main' && opts.allowMainnet !== true) return fallback;
  return asked;
}

const EXPLORER: Record<ShellNetwork, string> = {
  main: 'https://nimiq.watch/#',
  test: 'https://test.nimiq.watch/#',
};

/** nimiq.watch link for a tx hash (64 hex) or an NQ address on `network`.
 *  Null for anything else, so a typo never becomes a link. */
export function explorerUrl(network: ShellNetwork, hashOrAddress: string): string | null {
  const v = (hashOrAddress ?? '').trim();
  if (/^(0x)?[0-9a-f]{64}$/i.test(v)) return EXPLORER[network] + v.replace(/^0x/i, '').toLowerCase();
  const a = v.replace(/\s+/g, '').toUpperCase();
  if (/^NQ[0-9]{2}[0-9A-HJ-NP-VXY]{32}$/.test(a)) return EXPLORER[network] + a.match(/.{4}/g)!.join('+');
  return null;
}
