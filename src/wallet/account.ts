// What KIND of account an address is, not just its balance (recon C2-288).
//
// The balance reader reports a number. For an HTLC, vesting or staking
// contract that number is not money the connected wallet can spend, and
// showing it as such is how an app tells a user they hold NIM they cannot
// move. Same one RPC method as the balance reader (getAccountByAddress); the
// type field is verified against live mainnet in nimiq-settlement's
// htlc-balance.ts ("basic", "vesting", "htlc", "staking").

import { DEFAULT_NIM_RPC } from './balance';

export type NimAccountType = 'basic' | 'vesting' | 'htlc' | 'staking' | 'unknown';

export interface NimAccount {
  type: NimAccountType;
  balanceLuna: number;
  /** balanceLuna for a basic account; null for anything a plain send cannot spend. */
  spendableLuna: number | null;
}

const TYPES = new Set(['basic', 'vesting', 'htlc', 'staking']);

const compact = (a: string) => a.replace(/\s+/g, '').toUpperCase();

/** Pure: map one getAccountByAddress result (wrapped or flat) onto NimAccount.
 *  With `expectAddress`, an answer about another address is refused (null). */
export function parseNimAccount(body: unknown, expectAddress?: string): NimAccount | null {
  if (!body || typeof body !== 'object') return null;
  let r: unknown = (body as { result?: unknown }).result ?? body;
  if (r && typeof r === 'object' && 'data' in (r as object)) r = (r as { data: unknown }).data;
  if (!r || typeof r !== 'object') return null;
  const a = r as { type?: unknown; balance?: unknown; address?: unknown };
  if (expectAddress && typeof a.address === 'string' && compact(a.address) !== compact(expectAddress)) return null;
  const balanceLuna = typeof a.balance === 'number' && Number.isFinite(a.balance) && a.balance >= 0 ? a.balance : 0;
  // A missing or odd type is unknown, never basic: a node or proxy that drops
  // the field must not make a contract balance look spendable.
  const raw = typeof a.type === 'string' ? a.type.toLowerCase() : '';
  const type: NimAccountType = TYPES.has(raw) ? (raw as NimAccountType) : 'unknown';
  return { type, balanceLuna, spendableLuna: type === 'basic' ? balanceLuna : null };
}

/** Read one address's type and balance. Throws on a transport or RPC error. */
export function createNimAccountReader(o: { rpc?: string; fetchImpl?: typeof fetch } = {}) {
  const url = o.rpc ?? DEFAULT_NIM_RPC;
  const doFetch = o.fetchImpl ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  return async function readNimAccount(address: string): Promise<NimAccount> {
    const spaced = address.replace(/\s+/g, '').toUpperCase().replace(/(.{4})(?=.)/g, '$1 ');
    const res = await doFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getAccountByAddress', params: [spaced] }),
    });
    if (!res.ok) throw new Error(`nim account: ${url} answered ${res.status}`);
    const body = (await res.json()) as { error?: { message?: string } };
    if (body.error) throw new Error(`nim account: ${body.error.message ?? 'rpc error'}`);
    const acct = parseNimAccount(body, spaced);
    if (!acct) throw new Error('nim account: no result in rpc response');
    return acct;
  };
}
