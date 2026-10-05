// The mini wallet's OWN NIM balance read.
//
// The package header says chain reads live in nimiq-settlement, and for
// settlement that still holds. This one file is the deliberate exception, and
// the reason is a bug Andrew hit on nimiq.cool: the mini wallet had shipped a
// balance stack since v0.14 and NOT ONE of the 19 fleet apps ever showed it,
// because every one of them was required to wire `getBalanceLuna` first and
// none did. A wallet control whose balance is opt-in is a wallet control with
// no balance. So the default is now "read it", and a host opts OUT.
//
// Scope is one JSON-RPC method against one chain. No settlement, no history,
// no transaction building.
//
// The one thing taken from nimiq-settlement is its endpoint list, a deliberate
// exception. Settlement's transport owns the ordered chain of nodes,
// so a second hardcoded copy here could only drift from it. It is a constant
// import from a package with no dependencies of its own, and it bundles down to
// the list itself. The rule it replaces still holds for everything else: the
// moment this file wants a second RPC METHOD, that is settlement asking to be
// used for real, and the answer is still no.

import { RPC_ENDPOINTS } from 'nimiq-settlement';

/** Public read-only Albatross RPC, the first of settlement's mainnet
 *  endpoints. Answers `access-control-allow-origin: *`,
 *  which is why a browser can call it with no proxy of the host's own.
 *
 *  ⚠ It rate-limits to 20 requests per 10s PER CLIENT IP. That is per VISITOR,
 *  not per app, and the corner caches for 30s, so a person would have to open
 *  and close the menu twenty times in ten seconds to feel it. A host that
 *  expects to blow through that should pass its own `rpc`. */
export const DEFAULT_NIM_RPC: string = RPC_ENDPOINTS.main[0];

/** One day of ~1 s Albatross blocks: a node further than this from the others is not believed. */
const MAX_HEIGHT_SPREAD = 86_400;

export interface NimBalanceReaderOptions {
  /** Node URL, or an ordered list tried in turn. Defaults to settlement's
   *  mainnet list, which starts with DEFAULT_NIM_RPC. */
  rpc?: string | readonly string[];
  /** Per-node abort before the next node is tried. Default 4000 ms. */
  timeoutMs?: number;
  /** Injected for tests. Defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
}

interface RpcAccount {
  address?: string;
  balance?: number;
}

/** `{ result: { data, metadata } }` — the Albatross RPC wraps every payload,
 *  and the balance is inside `data`. A flat `result` is accepted too so a
 *  host pointing this at a proxy of its own is not forced to mimic the
 *  envelope. */
interface RpcEnvelope {
  result?: RpcAccount | { data?: RpcAccount; metadata?: { blockNumber?: unknown } };
  error?: { message?: string };
}

function unwrap(body: RpcEnvelope): RpcAccount | null {
  const result = body.result;
  if (!result) return null;
  if ('data' in result && result.data) return result.data;
  return result as RpcAccount;
}

/** Build a `getBalanceLuna`-shaped reader over a public Nimiq RPC.
 *
 *  Addresses go out SPACED, which is the form the node expects and the form
 *  the Hub hands back; a compact one is re-spaced rather than rejected,
 *  because a host reading its address out of storage may have stripped it. */
export function createNimBalanceReader(
  options: NimBalanceReaderOptions = {},
): (address: string) => Promise<number> {
  // Failover (recon C2-296): one dead or slow node no longer blanks the
  // balance. Same single method, so the rule above still holds.
  const urls: readonly string[] =
    options.rpc === undefined ? RPC_ENDPOINTS.main : typeof options.rpc === 'string' ? [options.rpc] : options.rpc;
  if (urls.length === 0) throw new Error('nim balance: no rpc url');
  // setTimeout clamps anything over 2^31-1 (and NaN) to ~1 ms, which would
  // time every node out at once.
  const t0 = options.timeoutMs ?? 4000;
  const timeoutMs = Number.isFinite(t0) ? Math.min(Math.max(1, t0), 2_147_483_647) : 4000;
  const doFetch = options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  const readOne = async (url: string, spaced: string): Promise<{ account: RpcAccount; height: number | null }> => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      let res: Response;
      try {
        res = await doFetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getAccountByAddress',
            params: [spaced],
          }),
          signal: ctrl.signal,
        });
      } catch (e) {
        if (ctrl.signal.aborted) throw new Error(`nim balance: ${url} timed out after ${timeoutMs}ms`);
        throw new Error(`nim balance: ${url} unreachable: ${(e as Error)?.message ?? e}`);
      }
      if (!res.ok) throw new Error(`nim balance: ${url} answered ${res.status}`);
      const body = (await res.json()) as RpcEnvelope;
      if (body.error) throw new Error(`nim balance: ${body.error.message ?? 'rpc error'}`);
      const account = unwrap(body);
      if (!account) throw new Error('nim balance: no result in rpc response');
      // A node answering about another address, or with a negative balance, is
      // wrong: try the next one rather than show its number.
      if (typeof account.address === 'string' && account.address.replace(/\s+/g, '').toUpperCase() !== spaced.replace(/\s+/g, '')) {
        throw new Error(`nim balance: ${url} answered for another address`);
      }
      if (typeof account.balance === 'number' && !(Number.isFinite(account.balance) && account.balance >= 0)) {
        throw new Error(`nim balance: ${url} answered an invalid balance`);
      }
      const meta = (body.result as { metadata?: { blockNumber?: unknown } } | undefined)?.metadata;
      const h = meta?.blockNumber;
      return { account, height: typeof h === 'number' && Number.isSafeInteger(h) && h > 0 ? h : null };
    } finally {
      clearTimeout(timer);
    }
  };

  return async function getBalanceLuna(address: string): Promise<number> {
    const spaced = address.replace(/\s+/g, '').toUpperCase().replace(/(.{4})(?=.)/g, '$1 ');
    // Every node at once; the answer from the HIGHEST block wins, so a lagging
    // node cannot show a stale balance as current. Ties keep list order.
    const settled = await Promise.allSettled(urls.map((u) => readOne(u, spaced)));
    const ok: { account: RpcAccount; height: number | null }[] = [];
    let last: unknown = null;
    for (const r of settled) {
      if (r.status === 'rejected') last = r.reason;
      else ok.push(r.value);
    }
    // TRUST MODEL: every endpoint is a Nimiq node the app chose to trust
    // (settlement's RPC_ENDPOINTS by default). This filter handles LAG and
    // absurd heights from a broken node; it is NOT liar-resistant: a node that
    // lies at a plausible height, or a majority of lying nodes, still wins.
    // Display-only read; never base a payment decision on it.
    // Heights more than a day of blocks from the lower median are outliers;
    // the freshest of the rest wins; with no heights at all, list order decides.
    const hs = ok.map((x) => x.height).filter((h): h is number => h !== null).sort((a, b) => a - b);
    const median = hs.length ? hs[Math.floor((hs.length - 1) / 2)]! : null;
    const plausible = (h: number | null) => h === null || median === null || Math.abs(h - median) <= MAX_HEIGHT_SPREAD;
    let best: { account: RpcAccount; height: number | null } | null = null;
    for (const x of ok) {
      if (!plausible(x.height)) continue;
      if (!best || (x.height ?? -1) > (best.height ?? -1)) best = x;
    }
    if (!best) throw last instanceof Error ? last : new Error('nim balance: every node failed');
    const account = best.account;
    // A valid address the chain has never seen answers `balance: 0` rather than
    // erroring (verified against the live node), so a brand-new account reads
    // as zero and not as a failure. That matters: on failure the corner KEEPS
    // its last value, which after an account switch would show the previous
    // account's balance under the new name.
    if (typeof account.balance !== 'number') return 0;
    return account.balance;
  };
}
