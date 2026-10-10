// validityStartHeight from the freshest height we can see (recon C2-246).
//
// An Albatross tx is only valid for a window after its validityStartHeight.
// A half-synced Nimiq Pay light client fills in a stale height and the send
// fails with a "validity end" error. Pass the max of the wallet's height and
// an independent RPC head explicitly; either may be missing.

import { RPC_ENDPOINTS } from '../vendor/settlement/rpc-endpoints';
import { readWalletHeight } from './network-gate';
import { describeWalletError } from './outcome';

const ok = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n > 0;

/** The larger of the two heights, or undefined to let the wallet fill it in. */
export function pickValidityStartHeight(
  walletHeight: number | null | undefined,
  rpcHeight: number | null | undefined,
): number | undefined {
  const a = ok(walletHeight) ? walletHeight : undefined;
  const b = ok(rpcHeight) ? rpcHeight : undefined;
  if (a === undefined) return b;
  if (b === undefined) return a;
  return Math.max(a, b);
}

const VALIDITY_RE = /validity[\s_-]*(window|end|start)|transaction (has )?expired|invalid for (this|the current) (height|block)/i;

/** True when a send failed because its validity window had already closed.
 *  Nothing was sent; the user can safely pay again with a fresh height. */
export function isValidityWindowError(err: unknown): boolean {
  const { kind, message } = describeWalletError(err);
  return kind !== 'pending' && VALIDITY_RE.test(message);
}

/** More than a day of blocks apart means the two heights are not the same
 *  chain (mainnet sits near 64M, testnet near 14M), so the RPC is ignored. */
export const MAX_HEIGHT_DISAGREEMENT = 86_400;

export interface RpcHeadReaderOptions {
  /** One URL or a list, all asked at once; the highest answer wins.
   *  Default: settlement's endpoints for `network`. */
  rpc?: string | readonly string[];
  network?: 'main' | 'test';
  /** Per-node budget. Default 3000ms, so a dead node never holds a send long. */
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/** Read the chain head from an independent RPC. Resolves null, never throws:
 *  a missing head only means the wallet's own height is used. */
export function createRpcHeadReader(o: RpcHeadReaderOptions = {}): () => Promise<number | null> {
  const urls: readonly string[] =
    o.rpc === undefined ? RPC_ENDPOINTS[o.network ?? 'main'] : typeof o.rpc === 'string' ? [o.rpc] : o.rpc;
  const timeoutMs = o.timeoutMs ?? 3000;
  const doFetch = o.fetchImpl ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  const readOne = async (url: string): Promise<number | null> => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await doFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBlockNumber', params: [] }),
        signal: ctrl.signal,
      });
      if (!res.ok) return null;
      const body = (await res.json()) as { result?: unknown };
      // Albatross wraps it as { data, metadata }; accept a flat number too.
      const r = body.result;
      const n = r && typeof r === 'object' ? (r as { data?: unknown }).data : r;
      return ok(n) ? n : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };
  return async () => {
    const heads = (await Promise.all(urls.map(readOne))).filter(ok);
    return heads.length ? Math.max(...heads) : null;
  };
}

export interface ResolveValidityOptions {
  /** The independent head. Default: createRpcHeadReader for `network`. */
  readRpcHead?: () => Promise<number | null>;
  /** The network the host declared (window.nimiqPay.network, SDK 0.2.4).
   *  Undefined on older hosts: the RPC head is then used only when the
   *  wallet's own height is within MAX_HEIGHT_DISAGREEMENT of it. */
  network?: 'main' | 'test';
}

/**
 * The validityStartHeight to send with, or undefined to let the wallet fill
 * it in. Takes max(wallet, RPC) as GatePass does (recon W-261009-01), with
 * one guard theirs lacks: an RPC head on the other network is dropped, since
 * a mainnet height on a testnet send is a guaranteed failure.
 */
export async function resolveValidityStartHeight(
  provider: unknown,
  o: ResolveValidityOptions = {},
): Promise<number | undefined> {
  const readRpcHead = o.readRpcHead ?? createRpcHeadReader({ network: o.network });
  const [wallet, rpc] = await Promise.all([readWalletHeight(provider), readRpcHead().catch(() => null)]);
  if (!ok(rpc)) return pickValidityStartHeight(wallet, null);
  // A declared network means the RPC is the right chain, however far behind a
  // half-synced wallet is. That lag is exactly the failure this fixes.
  if (o.network) return pickValidityStartHeight(wallet, rpc);
  if (!ok(wallet)) return undefined;
  return Math.abs(rpc - wallet) > MAX_HEIGHT_DISAGREEMENT ? wallet : Math.max(wallet, rpc);
}
