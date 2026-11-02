// The shared on-chain @handle registry (recon C1-381; the protocol is NimConnect's
// docs/api/handle-claim-protocol.md, also used by NimFeed and Nimiq Pay).
//
// A claim is a tx to HANDLE_REGISTRY_ADDRESS whose data is "NF" 0x01 0x01 + the
// username in ASCII, or, from Nimiq Pay, the text "NFH:" + hex of those bytes.
// Earliest (blockNumber, txIndex) wins, for good: there is no release or transfer.
// Resolving is a pure replay of the registry address's inbound txs, so a fleet app
// (tips pay-links, party invites, gift URLs) can address people as @handle against
// any RPC, interoperating with NimConnect and NimFeed instead of minting its own
// namespace. This module builds and reads; it never signs or sends.
//
// Not handled here: a Nimiq Pay claim can come from an HTLC, and its real owner is
// the HTLC's creator. Pass `ownerOf` to attribute those; without it the claim is
// credited to the address the chain shows as sender.

import { compactNimAddress } from './address';

export const HANDLE_REGISTRY_ADDRESS = 'NQ19 LLHP G0ML 37RM 5JJD RME1 GLFY 75PQ 402Y';

/** 3 to 31 of [a-z0-9_]. */
const HANDLE_RE = /^[a-z0-9_]{3,31}$/;
const MAGIC = [0x4e, 0x46, 0x01, 0x01]; // "NF", version 1, PROFILE_CLAIM
const TEXT_PREFIX = 'NFH:';

/** "@Chuck" or " chuck " as the canonical "chuck", or null when it can never be a handle. */
export function normalizeHandle(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const h = raw.trim().replace(/^@/, '').toLowerCase();
  return HANDLE_RE.test(h) ? h : null;
}

const toHex = (bytes: number[]) => bytes.map((b) => b.toString(16).padStart(2, '0')).join('');

function fromHex(hex: string): number[] | null {
  const h = hex.trim().replace(/^0x/i, '');
  if (h.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(h)) return null;
  const out: number[] = [];
  for (let i = 0; i < h.length; i += 2) out.push(Number.parseInt(h.slice(i, i + 2), 16));
  return out;
}

export interface HandleClaimPayload {
  recipient: string;
  handle: string;
  /** Raw claim bytes as hex (Nimiq Hub's binary data). */
  rawHex: string;
  /** The text a Nimiq Pay provider sends as the tx message: "NFH:" + rawHex. */
  extraData: string;
}

/** The claim tx to build for `handle`. Throws on a name that can never be a handle. */
export function buildHandleClaimPayload(handle: string): HandleClaimPayload {
  const h = normalizeHandle(handle);
  if (h === null) throw new RangeError('a handle is 3 to 31 of a-z, 0-9 and _');
  const rawHex = toHex([...MAGIC, ...[...h].map((c) => c.charCodeAt(0))]);
  return { recipient: HANDLE_REGISTRY_ADDRESS, handle: h, rawHex, extraData: `${TEXT_PREFIX}${rawHex}` };
}

/** The username a tx's data claims, or null. `dataHex` is the tx data as the node returns it (hex). */
export function parseHandleClaim(dataHex: string | null | undefined): string | null {
  if (typeof dataHex !== 'string') return null;
  let bytes = fromHex(dataHex);
  if (bytes === null) return null;
  // Nimiq Pay: the data is the TEXT "NFH:<hex>", itself hex-encoded by the node.
  const text = String.fromCharCode(...bytes);
  if (text.startsWith(TEXT_PREFIX)) {
    bytes = fromHex(text.slice(TEXT_PREFIX.length));
    if (bytes === null) return null;
  }
  if (bytes.length < MAGIC.length || MAGIC.some((b, i) => bytes![i] !== b)) return null;
  const name = String.fromCharCode(...bytes.slice(MAGIC.length));
  // Exact: a claim with uppercase or a stray byte is not a claim, never "fixed up".
  return HANDLE_RE.test(name) ? name : null;
}

/** A registry tx as any RPC returns it, reduced to what resolution needs. */
export interface RegistryTx {
  hash: string;
  sender: string;
  recipient: string;
  /** Hex, as the node returns it. */
  recipientData: string | null;
  blockNumber: number;
  /** Position in the block; ties at one height break on it. */
  txIndex: number;
  /** A tx that failed to apply claims nothing. Unknown (undefined) is accepted. */
  executionResult?: boolean | null;
}

export interface HandleClaim {
  handle: string;
  owner: string;
  hash: string;
  blockNumber: number;
  txIndex: number;
}

/**
 * Replay the registry's txs: the earliest (blockNumber, txIndex) claim of each
 * handle wins. Order of `txs` does not matter. `ownerOf` maps a sender to its real
 * owner (an HTLC to its creator); it returns null when unknown, and the sender stands.
 */
export function resolveHandleRegistry(
  txs: readonly RegistryTx[],
  ownerOf?: (sender: string) => string | null,
): Map<string, HandleClaim> {
  const registry = compactNimAddress(HANDLE_REGISTRY_ADDRESS);
  const sorted = [...txs].sort((a, b) => a.blockNumber - b.blockNumber || a.txIndex - b.txIndex);
  const out = new Map<string, HandleClaim>();
  for (const tx of sorted) {
    if (tx.executionResult === false) continue;
    if (!Number.isSafeInteger(tx.blockNumber) || !Number.isSafeInteger(tx.txIndex)) continue;
    if (compactNimAddress(tx.recipient ?? '') !== registry) continue;
    const handle = parseHandleClaim(tx.recipientData);
    if (handle === null || out.has(handle)) continue;
    const owner = ownerOf?.(tx.sender) ?? tx.sender;
    out.set(handle, { handle, owner, hash: tx.hash, blockNumber: tx.blockNumber, txIndex: tx.txIndex });
  }
  return out;
}

/** The handle an address displays: its earliest winning claim, or null. */
export function handleOf(registry: Map<string, HandleClaim>, address: string): HandleClaim | null {
  const who = compactNimAddress(address);
  let best: HandleClaim | null = null;
  for (const c of registry.values()) {
    if (compactNimAddress(c.owner) !== who) continue;
    if (!best || c.blockNumber < best.blockNumber || (c.blockNumber === best.blockNumber && c.txIndex < best.txIndex)) best = c;
  }
  return best;
}

/** True when `handle` is a valid name nobody has claimed. */
export function isHandleAvailable(registry: Map<string, HandleClaim>, handle: string): boolean {
  const h = normalizeHandle(handle);
  return h !== null && !registry.has(h);
}
