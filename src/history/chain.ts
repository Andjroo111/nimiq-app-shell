// The connected address's transaction history, read from the chain.
//
// NOT device.ts: that one is an order log this device wrote. This is what the
// chain says happened to the address, from anywhere, which is what the wallet's
// own address view lists.
//
// RPC CONTRACT (verified against https://rpc.nimiqwatch.com, 2026-11-11):
//
//   getTransactionsByAddress(address, max, startAt) -> { result: { data: tx[] } }
//
//   - All THREE params are required by the node; `startAt` is null for the
//     newest page ("invalid length 2, expected ... with 3 elements" otherwise).
//   - Newest first. `startAt` is a tx HASH and is EXCLUSIVE: passing the last
//     hash of one page returns the page after it. Fewer than `max` rows means
//     there is nothing older.
//   - Each tx: hash, blockNumber, timestamp (ms), confirmations, size,
//     relatedAddresses, from, fromType, to, toType, value (luna), fee (luna),
//     senderData, recipientData (hex; the public message lives here), flags,
//     validityStartHeight, proof, networkId, executionResult.
//
// Every string in a tx is attacker-controlled: anyone can send to an address,
// with any message. Nothing here builds markup, and the view sets textContent
// only.

import { RPC_ENDPOINTS } from '../vendor/settlement/rpc-endpoints';

/** One transaction as the mini wallet shows it. Hosts that pass their own
 *  `history.fetch` return these. */
export interface ShellTx {
  /** Transaction hash, lower-case hex. Also the explorer key. */
  hash: string;
  /** Relative to the address the history was read for. */
  direction: 'in' | 'out' | 'self';
  /** The other party: the sender for 'in', the recipient for 'out', the
   *  address itself for 'self'. Spaced NQ form. */
  counterparty: string;
  sender: string;
  recipient: string;
  /** Value moved, in luna. Always non-negative; the sign comes from direction. */
  valueLuna: number;
  /** Fee in luna (paid by the sender). */
  feeLuna: number;
  /** Block time in ms since the epoch, or null when not yet in a block. */
  timestamp: number | null;
  /** The public message when it is readable UTF-8 text, else null. */
  message: string | null;
  /** Not yet in a block. Shown quietly, never as a spinner. */
  pending: boolean;
  /** Included, but the chain reports it did not execute (the fee was still
   *  paid, the value did not move). */
  failed?: boolean;
  blockNumber?: number | null;
  confirmations?: number | null;
}

export interface HistoryFetchOptions {
  /** Rows wanted. */
  max: number;
  /** The hash of the last row already shown, for the next (older) page.
   *  Null or absent for the newest page. */
  startAt?: string | null;
}

export interface NimHistoryReaderOptions {
  /** Node URL, or a list tried IN ORDER (one request per page; the next node
   *  only on failure). Defaults to settlement's mainnet list. The node must be
   *  history-indexed; the public ones are. */
  rpc?: string | readonly string[];
  /** Per-node abort. Default 8000 ms. */
  timeoutMs?: number;
  /** Injected for tests. Defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
}

const compact = (a: string): string => a.replace(/\s+/g, '').toUpperCase();
const spaced = (a: string): string => compact(a).replace(/(.{4})(?=.)/g, '$1 ');
const NIM_ADDRESS = /^NQ[0-9]{2}[0-9A-HJ-NP-VXY]{32}$/;
const HASH = /^[0-9a-f]{64}$/i;

/** Zero-width and bidi-control characters. They render as nothing, or reorder
 *  what is around them, so a message carrying them can show a different text
 *  from the one on chain (the classic U+202E filename trick). Removed. */
const INVISIBLE = /[\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;

/** Decode a tx data field into a message a person can read, or null.
 *
 *  Null for anything that is not text: invalid UTF-8, a control character, or
 *  a field that is empty once invisibles are removed. Staking operations,
 *  HTLC data and cashlink payloads are binary and must not turn into a line of
 *  mojibake under a payment. */
export function decodeTxMessage(hex: unknown): string | null {
  if (typeof hex !== 'string') return null;
  const clean = hex.replace(/^0x/i, '');
  if (!clean || clean.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(clean)) return null;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
  // C0 and C1 controls (tab and newline included: a memo is one line, and a
  // newline is how a forged second line of UI would start).
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F-\u009F]/.test(text)) return null;
  const out = text.replace(INVISIBLE, '').trim();
  return out ? out : null;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Pure: one RPC tx object onto ShellTx, relative to `owner`. Null for a row
 *  that is malformed, or that does not move money in or out of `owner` (a pool
 *  payout that only names the address in `relatedAddresses` adds to its stake,
 *  not to its balance, and listing it with a sign would be a wrong number). */
export function parseNimTx(raw: unknown, owner: string): ShellTx | null {
  if (!raw || typeof raw !== 'object') return null;
  const t = raw as Record<string, unknown>;
  const hash = typeof t.hash === 'string' ? t.hash.replace(/^0x/i, '').toLowerCase() : '';
  if (!HASH.test(hash)) return null;
  if (typeof t.from !== 'string' || typeof t.to !== 'string') return null;
  const from = compact(t.from);
  const to = compact(t.to);
  if (!NIM_ADDRESS.test(from) || !NIM_ADDRESS.test(to)) return null;
  const value = num(t.value);
  if (value === null || value < 0) return null;
  const fee = num(t.fee) ?? 0;
  const me = compact(owner);
  let direction: ShellTx['direction'];
  if (from === me && to === me) direction = 'self';
  else if (from === me) direction = 'out';
  else if (to === me) direction = 'in';
  else return null;
  const ts = num(t.timestamp);
  const block = num(t.blockNumber);
  const confirmations = num(t.confirmations);
  const pending = (block === null || block <= 0) && (confirmations === null || confirmations <= 0);
  const tx: ShellTx = {
    hash,
    direction,
    counterparty: spaced(direction === 'in' ? from : to),
    sender: spaced(from),
    recipient: spaced(to),
    valueLuna: value,
    feeLuna: fee >= 0 ? fee : 0,
    timestamp: ts !== null && ts > 0 ? ts : null,
    message: decodeTxMessage(t.recipientData),
    pending,
    blockNumber: block,
    confirmations,
  };
  if (t.executionResult === false) tx.failed = true;
  return tx;
}

/** Pure: a getTransactionsByAddress body (wrapped, or a bare array) onto
 *  ShellTx[], newest first, malformed and unrelated rows dropped, duplicate
 *  hashes kept once. Throws on an RPC error or a body that is not a list, so a
 *  failure reads as a failure and never as "no transactions". */
export function parseNimTransactions(body: unknown, owner: string): ShellTx[] {
  if (!body || typeof body !== 'object') throw new Error('nim history: empty rpc response');
  const env = body as { result?: unknown; error?: { message?: string } | string };
  if (env.error) {
    const msg = typeof env.error === 'string' ? env.error : env.error.message ?? 'rpc error';
    throw new Error(`nim history: ${msg}`);
  }
  let r: unknown = Array.isArray(body) ? body : env.result;
  if (r && typeof r === 'object' && !Array.isArray(r) && 'data' in (r as object)) r = (r as { data: unknown }).data;
  if (!Array.isArray(r)) throw new Error('nim history: no list in rpc response');
  const seen = new Set<string>();
  const out: ShellTx[] = [];
  for (const raw of r) {
    const tx = parseNimTx(raw, owner);
    if (!tx || seen.has(tx.hash)) continue;
    seen.add(tx.hash);
    out.push(tx);
  }
  return out;
}

/** Build a `history.fetch`-shaped reader over a public Nimiq RPC. One request
 *  per page. */
export function createNimHistoryReader(
  options: NimHistoryReaderOptions = {},
): (address: string, opts: HistoryFetchOptions) => Promise<ShellTx[]> {
  const urls: readonly string[] =
    options.rpc === undefined ? RPC_ENDPOINTS.main : typeof options.rpc === 'string' ? [options.rpc] : options.rpc;
  if (urls.length === 0) throw new Error('nim history: no rpc url');
  const t0 = options.timeoutMs ?? 8000;
  const timeoutMs = Number.isFinite(t0) ? Math.min(Math.max(1, t0), 2_147_483_647) : 8000;
  const doFetch = options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  const readOne = async (url: string, address: string, max: number, startAt: string | null): Promise<ShellTx[]> => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      let res: Response;
      try {
        res = await doFetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0', id: 1, method: 'getTransactionsByAddress', params: [address, max, startAt],
          }),
          signal: ctrl.signal,
        });
      } catch (e) {
        if (ctrl.signal.aborted) throw new Error(`nim history: ${url} timed out after ${timeoutMs}ms`);
        throw new Error(`nim history: ${url} unreachable: ${(e as Error)?.message ?? e}`);
      }
      if (!res.ok) throw new Error(`nim history: ${url} answered ${res.status}`);
      return parseNimTransactions(await res.json(), address);
    } finally {
      clearTimeout(timer);
    }
  };

  return async function fetchHistory(address: string, opts: HistoryFetchOptions): Promise<ShellTx[]> {
    const max = Math.max(1, Math.min(500, Math.floor(opts.max)));
    const startAt = opts.startAt && HASH.test(opts.startAt) ? opts.startAt.toLowerCase() : null;
    let last: unknown = null;
    for (const url of urls) {
      try {
        return await readOne(url, spaced(address), max, startAt);
      } catch (e) {
        last = e;
      }
    }
    throw last instanceof Error ? last : new Error('nim history: every node failed');
  };
}

export interface TxMonthGroup {
  /** 'pending', or 'YYYY-MM' in local time. */
  key: string;
  txs: ShellTx[];
}

/** Pure: group rows by local calendar month, in the order given (newest
 *  first). Pending rows with no block time lead in their own group. */
export function groupTxsByMonth(txs: readonly ShellTx[]): TxMonthGroup[] {
  const groups: TxMonthGroup[] = [];
  const byKey = new Map<string, TxMonthGroup>();
  for (const tx of txs) {
    let key = 'pending';
    if (tx.timestamp !== null) {
      const d = new Date(tx.timestamp);
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    let g = byKey.get(key);
    if (!g) {
      g = { key, txs: [] };
      byKey.set(key, g);
      if (key === 'pending') groups.unshift(g);
      else groups.push(g);
    }
    g.txs.push(tx);
  }
  return groups;
}
