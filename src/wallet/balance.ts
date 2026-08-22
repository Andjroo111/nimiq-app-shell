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
// no transaction building — the moment this file wants a second method, that
// is nimiq-settlement asking to be a dependency, and the answer is still no.

/** Public read-only Albatross RPC. Answers `access-control-allow-origin: *`,
 *  which is why a browser can call it with no proxy of the host's own.
 *
 *  ⚠ It rate-limits to 20 requests per 10s PER CLIENT IP. That is per VISITOR,
 *  not per app, and the corner caches for 30s, so a person would have to open
 *  and close the menu twenty times in ten seconds to feel it. A host that
 *  expects to blow through that should pass its own `rpc`. */
export const DEFAULT_NIM_RPC = 'https://rpc.nimiqwatch.com';

export interface NimBalanceReaderOptions {
  /** Node URL. Defaults to the public read-only one above. */
  rpc?: string;
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
  result?: RpcAccount | { data?: RpcAccount };
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
  const url = options.rpc ?? DEFAULT_NIM_RPC;
  const doFetch = options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  return async function getBalanceLuna(address: string): Promise<number> {
    const spaced = address.replace(/\s+/g, '').toUpperCase().replace(/(.{4})(?=.)/g, '$1 ');
    const res = await doFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getAccountByAddress',
        params: [spaced],
      }),
    });
    if (!res.ok) throw new Error(`nim balance: ${url} answered ${res.status}`);
    const body = (await res.json()) as RpcEnvelope;
    if (body.error) throw new Error(`nim balance: ${body.error.message ?? 'rpc error'}`);
    const account = unwrap(body);
    if (!account) throw new Error('nim balance: no result in rpc response');
    // A valid address the chain has never seen answers `balance: 0` rather than
    // erroring (verified against the live node), so a brand-new account reads
    // as zero and not as a failure. That matters: on failure the corner KEEPS
    // its last value, which after an account switch would show the previous
    // account's balance under the new name.
    if (typeof account.balance !== 'number') return 0;
    return account.balance;
  };
}
