// Wallet-keyed state backup, so a Nimiq Pay storage wipe loses nothing
// (recon W-261009-57).
//
// Nimiq Pay clears a mini app's localStorage. MiniRush (Calebux/Mini-Rush,
// convex/profiles.ts) answered with a server copy keyed by address and
// restored on sign-in, but its writes are unsigned: anyone who knows an
// address can overwrite that wallet's state. Here every write is a signed
// envelope:
//   - the wallet signs a fixed-format message naming the app, the page origin,
//     the address, a version and the payload's SHA-256, so a signature for one
//     app, origin or payload cannot be replayed onto another;
//   - the version must go up on every write (the server keeps the last one),
//     so an old signed backup cannot be put back over a newer one;
//   - a save whose payload hash matches the last one does not open the
//     wallet. Every save is a wallet prompt: save on milestones, not per tap.
// Reads need no signature (the state is the wallet's own, served back to it).
// The server MUST run checkBackupEnvelope with a real verifySignature before
// storing. This package takes no crypto dependency, so the Ed25519 check and
// the public-key-to-address derivation are the verifier's job.

import type { SignMessageResult } from '../wallet/types';
import { describeWalletError } from '../wallet/outcome';

export interface BackupEnvelope {
  v: 1;
  app: string;
  origin: string;
  /** Compact uppercase address. */
  address: string;
  /** Integer >= 1, strictly increasing per (app, address). */
  version: number;
  issuedAt: number;
  /** Canonical JSON of the state. */
  payload: string;
  payloadSha256: string;
  /** Exactly backupMessage(...) of the fields above. */
  message: string;
  publicKeyHex: string;
  signatureHex: string;
}

export interface BackupTransport {
  /** The stored envelope for this address, or null. */
  get(address: string): Promise<BackupEnvelope | null>;
  /** Store it. The server checks it (checkBackupEnvelope) and may refuse by throwing. */
  put(envelope: BackupEnvelope): Promise<void>;
}

/** Must check the Ed25519 signature over the Nimiq signed-message hash of
 *  `message` AND that `publicKeyHex` derives to `address`. */
export type BackupSignatureVerifier = (e: Pick<BackupEnvelope, 'address' | 'message' | 'publicKeyHex' | 'signatureHex'>) => boolean | Promise<boolean>;

const ADDRESS = /^NQ\d{2}[0-9A-HJ-NP-VXY]{32}$/;
const HEX = /^[0-9a-f]+$/i;
const DEFAULT_MAX_BYTES = 32 * 1024;

export const compactAddress = (a: string) => a.replace(/\s+/g, '').toUpperCase();

/** JSON with sorted object keys, so equal states hash equal. Throws on
 *  anything JSON would drop or mangle (undefined, functions, NaN, bigint, cycles). */
export function canonicalJson(value: unknown): string {
  const seen = new Set<object>();
  const walk = (v: unknown): string => {
    if (v === null || typeof v === 'boolean' || typeof v === 'string') return JSON.stringify(v);
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) throw new TypeError('canonicalJson: non-finite number');
      return JSON.stringify(v);
    }
    if (typeof v !== 'object') throw new TypeError(`canonicalJson: cannot encode ${typeof v}`);
    if (seen.has(v)) throw new TypeError('canonicalJson: cycle');
    seen.add(v);
    let out: string;
    if (Array.isArray(v)) out = `[${v.map(walk).join(',')}]`;
    else {
      const o = v as Record<string, unknown>;
      out = `{${Object.keys(o)
        .sort()
        .map((k) => `${JSON.stringify(k)}:${walk(o[k])}`)
        .join(',')}}`;
    }
    seen.delete(v);
    return out;
  };
  return walk(value);
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const oneLine = (name: string, s: string) => {
  if (typeof s !== 'string' || !s || /[\r\n]/.test(s)) throw new TypeError(`backup: ${name} must be a non-empty single line`);
  return s;
};

/** The exact text the wallet signs. Any field change changes the text. */
export function backupMessage(f: { app: string; origin: string; address: string; version: number; issuedAt: number; payloadSha256: string }): string {
  return [
    'Nimiq app state backup',
    `App: ${oneLine('app', f.app)}`,
    `Origin: ${oneLine('origin', f.origin)}`,
    `Address: ${compactAddress(f.address)}`,
    `Version: ${f.version}`,
    `Issued at: ${new Date(f.issuedAt).toISOString()}`,
    `Payload SHA-256: ${f.payloadSha256}`,
  ].join('\n');
}

export type BackupCheck = { ok: true; value: unknown } | { ok: false; reason: string };

/**
 * Every check a stored or incoming envelope must pass. The server runs it
 * with `verifySignature` and `minVersion` (the stored version) before a put;
 * a client may run it on restore. Never throws.
 */
export async function checkBackupEnvelope(
  e: unknown,
  o: {
    app: string;
    origin: string;
    /** When given, the envelope must be for this wallet. */
    address?: string;
    /** The stored version; the envelope's must be greater. */
    minVersion?: number;
    verifySignature?: BackupSignatureVerifier;
    /** With maxSkewMs: reject an issuedAt this far from now (a write-time check). */
    now?: number;
    maxSkewMs?: number;
    maxBytes?: number;
  },
): Promise<BackupCheck> {
  const no = (reason: string): BackupCheck => ({ ok: false, reason });
  try {
    const x = e as BackupEnvelope;
    if (!x || typeof x !== 'object' || x.v !== 1) return no('not a backup envelope');
    for (const k of ['app', 'origin', 'address', 'payload', 'payloadSha256', 'message', 'publicKeyHex', 'signatureHex'] as const) {
      if (typeof x[k] !== 'string') return no(`missing ${k}`);
    }
    if (x.app !== o.app) return no('wrong app');
    if (x.origin !== o.origin) return no('wrong origin');
    if (!ADDRESS.test(x.address)) return no('bad address');
    if (o.address !== undefined && x.address !== compactAddress(o.address)) return no('wrong wallet');
    if (!Number.isSafeInteger(x.version) || x.version < 1) return no('bad version');
    if (o.minVersion !== undefined && !(x.version > o.minVersion)) return no('stale version');
    if (!Number.isSafeInteger(x.issuedAt) || x.issuedAt < 0 || x.issuedAt > 8.64e15) return no('bad issuedAt');
    if (o.maxSkewMs !== undefined && Math.abs((o.now ?? Date.now()) - x.issuedAt) > o.maxSkewMs) return no('issuedAt out of window');
    if (new TextEncoder().encode(x.payload).length > (o.maxBytes ?? DEFAULT_MAX_BYTES)) return no('payload too large');
    if (!HEX.test(x.publicKeyHex) || x.publicKeyHex.length !== 64) return no('bad public key');
    if (!HEX.test(x.signatureHex) || x.signatureHex.length !== 128) return no('bad signature');
    if ((await sha256Hex(x.payload)) !== x.payloadSha256) return no('payload hash mismatch');
    if (x.message !== backupMessage(x)) return no('message does not match fields');
    let value: unknown;
    try {
      value = JSON.parse(x.payload);
    } catch {
      return no('payload is not JSON');
    }
    if (canonicalJson(value) !== x.payload) return no('payload is not canonical');
    if (o.verifySignature) {
      let good = false;
      try {
        good = (await o.verifySignature({ address: x.address, message: x.message, publicKeyHex: x.publicKeyHex, signatureHex: x.signatureHex })) === true;
      } catch {
        good = false;
      }
      if (!good) return no('signature does not verify');
    }
    return { ok: true, value };
  } catch (err) {
    return no(`invalid: ${String((err as Error)?.message ?? err)}`);
  }
}

export type RestoreResult<T> =
  | { state: 'restored'; value: T; version: number }
  | { state: 'none' }
  /** Something is stored but it failed a check. Do not overwrite it blindly. */
  | { state: 'invalid'; reason: string }
  | { state: 'unreachable'; reason: string };

export type SaveResult =
  | { state: 'saved'; version: number }
  /** Same payload as the last known backup: no wallet prompt, nothing sent. */
  | { state: 'unchanged'; version: number }
  /** The wallet declined, signed as another account, or the server refused. */
  | { state: 'refused'; reason: string };

export interface StateBackup<T> {
  /** Call right after connect. Reads only; never opens the wallet. */
  restore(address: string): Promise<RestoreResult<T>>;
  /** Sign and store. Opens the wallet unless the payload is unchanged. */
  save(address: string, value: T): Promise<SaveResult>;
}

export function createStateBackup<T>(o: {
  /** Short stable app id, e.g. "nimiq.party". Signed into every write. */
  app: string;
  /** Defaults to location.origin. Signed into every write. */
  origin?: string;
  signMessage: (message: string) => Promise<SignMessageResult>;
  transport: BackupTransport;
  /** Optional client-side signature check on restore. */
  verifySignature?: BackupSignatureVerifier;
  maxBytes?: number;
  now?: () => number;
}): StateBackup<T> {
  const origin = o.origin ?? (globalThis as { location?: { origin?: string } }).location?.origin;
  if (!origin) throw new TypeError('createStateBackup: origin is required outside a browser');
  oneLine('app', o.app);
  oneLine('origin', origin);
  const now = o.now ?? Date.now;
  const maxBytes = o.maxBytes ?? DEFAULT_MAX_BYTES;
  // Last envelope seen per address: its version and payload hash.
  const known = new Map<string, { version: number; sha: string }>();

  const fetchKnown = async (address: string) => {
    const e = await o.transport.get(address);
    if (!e) return { version: 0, sha: '' };
    const c = await checkBackupEnvelope(e, { app: o.app, origin, address, maxBytes, verifySignature: o.verifySignature });
    // A stored envelope we cannot read still holds its version: never write under it.
    const version = Number.isSafeInteger(e.version) && e.version > 0 ? e.version : 0;
    return { version, sha: c.ok ? e.payloadSha256 : '' };
  };

  return {
    async restore(address) {
      const a = compactAddress(address);
      let e: BackupEnvelope | null;
      try {
        e = await o.transport.get(a);
      } catch (err) {
        return { state: 'unreachable', reason: describeWalletError(err).message };
      }
      if (!e) {
        known.set(a, { version: 0, sha: '' });
        return { state: 'none' };
      }
      const c = await checkBackupEnvelope(e, { app: o.app, origin, address: a, maxBytes, verifySignature: o.verifySignature });
      if (!c.ok) return { state: 'invalid', reason: c.reason };
      known.set(a, { version: e.version, sha: e.payloadSha256 });
      return { state: 'restored', value: c.value as T, version: e.version };
    },

    async save(address, value) {
      const a = compactAddress(address);
      if (!ADDRESS.test(a)) return { state: 'refused', reason: 'bad address' };
      let payload: string;
      try {
        payload = canonicalJson(value);
      } catch (err) {
        return { state: 'refused', reason: (err as Error).message };
      }
      if (new TextEncoder().encode(payload).length > maxBytes) return { state: 'refused', reason: 'payload too large' };
      const payloadSha256 = await sha256Hex(payload);
      let last = known.get(a);
      if (!last) {
        try {
          last = await fetchKnown(a);
        } catch (err) {
          return { state: 'refused', reason: `could not read the current backup: ${describeWalletError(err).message}` };
        }
        known.set(a, { version: last.version, sha: last.sha });
      }
      if (last.sha === payloadSha256) return { state: 'unchanged', version: last.version };

      const fields = { app: o.app, origin, address: a, version: last.version + 1, issuedAt: now(), payloadSha256 };
      const message = backupMessage(fields);
      let signed: SignMessageResult;
      try {
        signed = await o.signMessage(message);
      } catch (err) {
        return { state: 'refused', reason: describeWalletError(err).message };
      }
      if (!signed || compactAddress(signed.address ?? '') !== a) return { state: 'refused', reason: 'signed by a different account' };
      if (signed.message !== message) return { state: 'refused', reason: 'the wallet signed a different message' };
      const envelope: BackupEnvelope = { v: 1, ...fields, payload, message, publicKeyHex: signed.publicKeyHex, signatureHex: signed.signatureHex };
      try {
        await o.transport.put(envelope);
      } catch (err) {
        // The server may hold a newer version (another device): re-read before the next save.
        known.delete(a);
        return { state: 'refused', reason: describeWalletError(err).message };
      }
      known.set(a, { version: envelope.version, sha: payloadSha256 });
      return { state: 'saved', version: envelope.version };
    },
  };
}
