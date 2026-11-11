// The mini wallet's STAKED NIM read, the companion to balance.ts.
//
// Why a second file and not a second method in balance.ts: that file's header
// draws a line at one RPC method, and the line is worth keeping visible. This
// read is the other half of the same question ("how much NIM is mine"), it runs
// on the same nodes and the same cadence, and it is display-only like the
// balance. It is NOT settlement, and it never decides a payment.
//
// Albatross keeps staked NIM in the staking contract, not in the account, so
// `getAccountByAddress` already answers the SPENDABLE figure and never includes
// stake. What sits in the contract for an address comes from one method:
//
//   getStakerByAddress(address) ->
//     { result: { data: { address, balance, delegation, inactiveBalance,
//                         inactiveFrom, retiredBalance }, metadata: {...} } }
//
// `balance` is the active stake, `inactiveBalance` is stake on its way out
// (deactivated, not yet released), `retiredBalance` is stake released from a
// jailed or retired validator and waiting to be withdrawn. None of the three
// can be sent from the account, so "staked" here is their sum, which is what
// the wallet's own staking view counts as the address's stake.
//
// An address that has never staked is an ERROR, not a zero (verified live,
// 2026-11-11): `{ error: { code: -32603, message: 'Internal error',
// data: 'No staker with address: NQ..' } }`. That one is read as 0.

import { RPC_ENDPOINTS } from '../vendor/settlement/rpc-endpoints';

export interface NimStake {
  /** Active stake, in luna. */
  activeLuna: number;
  /** Deactivated, not yet released. */
  inactiveLuna: number;
  /** Released from a retired or jailed validator, waiting to be withdrawn. */
  retiredLuna: number;
  /** activeLuna + inactiveLuna + retiredLuna: everything in the contract for this address. */
  totalLuna: number;
  /** The validator the stake is delegated to, or null. */
  delegation: string | null;
}

export interface NimStakedReaderOptions {
  /** Node URL, or a list tried IN ORDER (one request per read; the next node
   *  only on failure). Defaults to settlement's mainnet list. */
  rpc?: string | readonly string[];
  /** Per-node abort. Default 4000 ms. */
  timeoutMs?: number;
  /** Injected for tests. Defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
}

const compact = (a: string): string => a.replace(/\s+/g, '').toUpperCase();
const luna = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);

/** True for the node's "this address has never staked" error, in either the
 *  `data` string or the message. Matched loosely on purpose: the wording is
 *  the node's, and a proxy may move it between the two fields. */
export function isNoStakerError(error: unknown): boolean {
  if (!error) return false;
  const text = typeof error === 'string'
    ? error
    : `${(error as { message?: unknown }).message ?? ''} ${(error as { data?: unknown }).data ?? ''}`;
  return /no staker/i.test(text);
}

/** Pure: map one getStakerByAddress body (wrapped or flat) onto NimStake.
 *
 *  Returns a ZERO stake for the node's no-staker error, null for anything that
 *  is not an answer (an unknown error, no result, an answer about another
 *  address). A null is a failed read and must hide the staked line; it must
 *  never be shown as zero, and it never touches the spendable figure. */
export function parseNimStaker(body: unknown, expectAddress?: string): NimStake | null {
  if (!body || typeof body !== 'object') return null;
  const env = body as { result?: unknown; error?: unknown };
  if (env.error) {
    return isNoStakerError(env.error)
      ? { activeLuna: 0, inactiveLuna: 0, retiredLuna: 0, totalLuna: 0, delegation: null }
      : null;
  }
  let r: unknown = env.result ?? body;
  if (r && typeof r === 'object' && 'data' in (r as object)) r = (r as { data: unknown }).data;
  if (!r || typeof r !== 'object') return null;
  const s = r as {
    address?: unknown; balance?: unknown; inactiveBalance?: unknown;
    retiredBalance?: unknown; delegation?: unknown;
  };
  if (expectAddress && typeof s.address === 'string' && compact(s.address) !== compact(expectAddress)) return null;
  // A body with none of the three fields is not a staker record, whatever it is.
  if (s.balance === undefined && s.inactiveBalance === undefined && s.retiredBalance === undefined) return null;
  const activeLuna = luna(s.balance);
  const inactiveLuna = luna(s.inactiveBalance);
  const retiredLuna = luna(s.retiredBalance);
  return {
    activeLuna,
    inactiveLuna,
    retiredLuna,
    totalLuna: activeLuna + inactiveLuna + retiredLuna,
    delegation: typeof s.delegation === 'string' ? s.delegation : null,
  };
}

/** Build a `getStakedLuna`-shaped reader over a public Nimiq RPC: the total in
 *  the staking contract for an address, in luna. 0 for an address that never
 *  staked. Throws when no node gave an answer. */
export function createNimStakedReader(
  options: NimStakedReaderOptions = {},
): (address: string) => Promise<number> {
  const urls: readonly string[] =
    options.rpc === undefined ? RPC_ENDPOINTS.main : typeof options.rpc === 'string' ? [options.rpc] : options.rpc;
  if (urls.length === 0) throw new Error('nim staked: no rpc url');
  const t0 = options.timeoutMs ?? 4000;
  const timeoutMs = Number.isFinite(t0) ? Math.min(Math.max(1, t0), 2_147_483_647) : 4000;
  const doFetch = options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  const readOne = async (url: string, spaced: string): Promise<NimStake> => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      let res: Response;
      try {
        res = await doFetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getStakerByAddress', params: [spaced] }),
          signal: ctrl.signal,
        });
      } catch (e) {
        if (ctrl.signal.aborted) throw new Error(`nim staked: ${url} timed out after ${timeoutMs}ms`);
        throw new Error(`nim staked: ${url} unreachable: ${(e as Error)?.message ?? e}`);
      }
      if (!res.ok) throw new Error(`nim staked: ${url} answered ${res.status}`);
      const stake = parseNimStaker(await res.json(), spaced);
      if (!stake) throw new Error(`nim staked: ${url} gave no staker answer`);
      return stake;
    } finally {
      clearTimeout(timer);
    }
  };

  return async function getStakedLuna(address: string): Promise<number> {
    const spaced = compact(address).replace(/(.{4})(?=.)/g, '$1 ');
    // In order, not in parallel: this is the EXTRA call per refresh, and the
    // public nodes rate-limit per visitor. A second node is asked only when the
    // first did not answer.
    let last: unknown = null;
    for (const url of urls) {
      try {
        return (await readOne(url, spaced)).totalLuna;
      } catch (e) {
        last = e;
      }
    }
    throw last instanceof Error ? last : new Error('nim staked: every node failed');
  };
}
