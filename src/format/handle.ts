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
// PARITY: parsing and resolution mirror NimConnect's canonical backend
// (backend/handles.go parseClaimData, handles_registry.go Rebuild) on purpose: a
// client that disagrees with the registry everyone else reads forks the namespace.
// So, like the backend: a display name after a 0x00 is ignored; Nimiq Pay's
// double-hex form is read; RELEASE (type 0x07) frees a handle when sent by its
// owner at or after `releaseActivationHeight` (off unless given, as in the backend
// with RELEASE_ACTIVATION_HEIGHT unset); and a tx that FAILED to apply still counts.
// That last one differs from what the chain moved; it is kept because the backend
// does not filter on executionResult, and agreeing with it is the point.
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

export interface HandleAction {
  handle: string;
  /** RELEASE (type 0x07): gives the handle up. Otherwise a claim. */
  release: boolean;
}

const TYPE_CLAIM = 0x01;
const TYPE_RELEASE = 0x07;

/** The binary payload: "NF" 0x01 <type> <username> [0x00 <display name>]. */
function actionFromBinary(bytes: number[]): HandleAction | null {
  if (bytes.length < 4 || bytes[0] !== 0x4e || bytes[1] !== 0x46 || bytes[2] !== 0x01) return null;
  if (bytes[3] !== TYPE_CLAIM && bytes[3] !== TYPE_RELEASE) return null;
  let rest = bytes.slice(4);
  // The username runs to a 0x00 separator (a display name follows on claims) or the end.
  const nul = rest.indexOf(0);
  if (nul >= 0) rest = rest.slice(0, nul);
  const name = String.fromCharCode(...rest);
  // Exact: uppercase or a stray byte is not a claim, never "fixed up".
  return HANDLE_RE.test(name) ? { handle: name, release: bytes[3] === TYPE_RELEASE } : null;
}

/** The binary form, or the "NFH:" text envelope around it. */
function actionFromRaw(bytes: number[]): HandleAction | null {
  const text = String.fromCharCode(...bytes);
  if (text.startsWith(TEXT_PREFIX)) {
    const inner = fromHex(text.slice(TEXT_PREFIX.length).trim());
    return inner === null ? null : actionFromBinary(inner);
  }
  return actionFromBinary(bytes);
}

/**
 * What a tx's data does to the registry, or null. `dataHex` is the tx data as the
 * node returns it (hex). Accepts the binary form (Hub), the "NFH:" text envelope
 * (Nimiq Pay), and Nimiq Pay's double hex (hex of the ASCII hex of either), as the
 * canonical backend does.
 */
export function parseHandleAction(dataHex: string | null | undefined): HandleAction | null {
  if (typeof dataHex !== 'string') return null;
  const raw = fromHex(dataHex);
  if (raw === null || raw.length === 0) return null;
  const direct = actionFromRaw(raw);
  if (direct) return direct;
  const ascii = String.fromCharCode(...raw);
  if (ascii.length > 0 && ascii.length % 2 === 0 && /^[0-9a-f]+$/i.test(ascii)) {
    const inner = fromHex(ascii);
    if (inner) return actionFromRaw(inner);
  }
  return null;
}

/** The username a tx's data CLAIMS (not releases), or null. */
export function parseHandleClaim(dataHex: string | null | undefined): string | null {
  const a = parseHandleAction(dataHex);
  return a && !a.release ? a.handle : null;
}

/** A registry tx as any RPC returns it, reduced to what resolution needs. */
export interface RegistryTx {
  hash: string;
  sender: string;
  recipient: string;
  /** Hex, as the node returns it. */
  recipientData: string | null;
  blockNumber: number;
  /** Position in the block; ties at one height break on it. Missing reads as 0, as in the backend. */
  txIndex?: number | null;
  /** Ignored on purpose: the canonical backend counts failed txs too (see the header). */
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
 * Replay the registry's txs in chain order, exactly as the canonical backend does:
 * a claim takes a handle only while it is unowned; a release frees it only when
 * sent by its current owner, at or after `releaseActivationHeight` (releases are
 * ignored without it). Order of `txs` does not matter. `ownerOf` maps a sender to
 * its real owner (an HTLC to its creator); null when unknown, and the sender stands.
 */
export function resolveHandleRegistry(
  txs: readonly RegistryTx[],
  ownerOf?: (sender: string) => string | null,
  opts: { releaseActivationHeight?: number } = {},
): Map<string, HandleClaim> {
  const registry = compactNimAddress(HANDLE_REGISTRY_ADDRESS);
  const idx = (t: RegistryTx) => (Number.isSafeInteger(t.txIndex) ? (t.txIndex as number) : 0);
  // Filter BEFORE sorting: a tx with no usable height must not sit between two
  // claims and reorder them (#17 review).
  const usable = txs.filter(
    (tx) => Number.isSafeInteger(tx.blockNumber) && compactNimAddress(tx.recipient ?? '') === registry,
  );
  const sorted = usable.sort((a, b) => a.blockNumber - b.blockNumber || idx(a) - idx(b));
  const activation = opts.releaseActivationHeight;
  const out = new Map<string, HandleClaim>();
  for (const tx of sorted) {
    const action = parseHandleAction(tx.recipientData);
    if (action === null) continue;
    const owner = ownerOf?.(tx.sender) ?? tx.sender;
    if (action.release) {
      if (activation === undefined || tx.blockNumber < activation) continue;
      const held = out.get(action.handle);
      if (held && compactNimAddress(held.owner) === compactNimAddress(owner)) out.delete(action.handle);
      continue;
    }
    if (out.has(action.handle)) continue;
    out.set(action.handle, { handle: action.handle, owner, hash: tx.hash, blockNumber: tx.blockNumber, txIndex: idx(tx) });
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
