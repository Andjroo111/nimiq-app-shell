// VENDORED from Andjroo111/nimiq-settlement@554b3e0 (v0.9.0) src/auth.ts lines 1-205 (bytes, addresses, signed-message verify).
// Excerpt: the login/session half is left out, with its ./intent type import. Do not edit here; change it upstream and re-copy.
// Wallet-signature login: a single-use challenge, a Nimiq signed-message
// verifier, and a short-lived session. Nine fleet apps were each writing this.
//
// Zero dependencies. Ed25519 and SHA-256 come from WebCrypto (Bun, Node 20+,
// Workers, current browsers); BLAKE2b for the address is ./blake2b.ts.
//
// THE ENVELOPE, pinned to core-rs-albatross wallet_account.rs and Keyguard
// Key.js: sha256("\x16Nimiq Signed Message:\n" + byteLength + message). The
// length is BYTES. The Hub's published snippet uses `message.length` (UTF-16
// units), which is wrong for any non-ASCII message.
//
// TWO DOMAINS. Keyguard also signs "\x19Nimiq Connect Challenge:\n" BLIND,
// without showing the user. Accepting it as a login lets a blind-signed blob
// replay as consent, so the default accept list is signed-message only.
//
// ORDER: grammar, nonce, scope and expiry BEFORE the signature, the derived
// address compared to the issued one, and the conditional nonce write LAST.
// The challenge grammar is nimiq-edge's intent grammar (`domain:action:version`
// then key=value lines), so a challenge built by either parses in both.

import { blake2b } from "./blake2b";

// ── bytes ────────────────────────────────────────────────────────────────────

const enc = new TextEncoder();

/** Uint8Array as-is; a hex string (0x optional) decoded; anything else null. */
export function toBytes(v: Uint8Array | string): Uint8Array | null {
  if (v instanceof Uint8Array) return v;
  if (typeof v !== "string") return null;
  const h = v.replace(/^0x/i, "");
  if (h.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(h)) return null;
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}

const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

async function sha256(b: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", b as BufferSource));
}

// ── addresses ────────────────────────────────────────────────────────────────

const ALPHABET = "0123456789ABCDEFGHJKLMNPQRSTUVXY";

function ibanMod97(s: string): number {
  let rem = 0;
  for (const c of s) {
    const code = c.charCodeAt(0);
    const v = code >= 48 && code <= 57 ? code - 48 : code - 55;
    rem = (rem * (v >= 10 ? 100 : 10) + v) % 97;
  }
  return rem;
}

/** The spaced NQ address an Ed25519 public key controls. */
export function addressFromPublicKey(publicKey: Uint8Array): string {
  if (publicKey.length !== 32) throw new RangeError("public key must be 32 bytes");
  const raw = blake2b(publicKey, 32).subarray(0, 20);
  let body = "";
  let acc = 0;
  let bits = 0;
  for (const byte of raw) {
    acc = (acc << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      body += ALPHABET[(acc >> bits) & 31];
    }
  }
  const check = String(98 - ibanMod97(`${body}NQ00`)).padStart(2, "0");
  return `NQ${check}${body}`.match(/.{4}/g)!.join(" ");
}

/** Canonical spaced form, or null when not a checksum-valid NQ address. */
export function normalizeAddress(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const a = input.replace(/\s+/g, "").toUpperCase();
  if (!/^NQ[0-9]{2}[0-9A-HJ-NP-VXY]{32}$/.test(a)) return null;
  if (ibanMod97(a.slice(4) + a.slice(0, 4)) !== 1) return null;
  return a.match(/.{4}/g)!.join(" ");
}

// ── signed messages ──────────────────────────────────────────────────────────

export type SignMessageDomain = "signed-message" | "connect-challenge";

export const SIGN_MESSAGE_PREFIX: Readonly<Record<SignMessageDomain, string>> = Object.freeze({
  "signed-message": "\x16Nimiq Signed Message:\n",
  "connect-challenge": "\x19Nimiq Connect Challenge:\n",
});

/** The 32-byte digest a wallet signs. Length is the UTF-8 BYTE count. */
export async function signedMessageDigest(
  message: Uint8Array | string,
  domain: SignMessageDomain = "signed-message",
): Promise<Uint8Array> {
  const m = typeof message === "string" ? enc.encode(message) : message;
  const head = enc.encode(SIGN_MESSAGE_PREFIX[domain] + String(m.length));
  const buf = new Uint8Array(head.length + m.length);
  buf.set(head);
  buf.set(m, head.length);
  return sha256(buf);
}

// Small-order points, libsodium's blocklist (ed25519 has_small_order),
// compared with the sign bit cleared. WebCrypto accepts them: the key
// 01 00..00 with signature 01 00..00 || 00..00 verifies ANY message, so a
// login needs no private key. Checked on the key and on R.
// NOT caught: a mixed-order key (real point + small-order torsion). Only its
// own key holder can sign for it, so it is no takeover, but its signatures
// are malleable: never use a signature as a unique id.
const SMALL_ORDER = [
  "0000000000000000000000000000000000000000000000000000000000000000",
  "0100000000000000000000000000000000000000000000000000000000000000",
  "26e8958fc2b227b045c3f489f2ef98f0d5dfac05d3c63339b13802886d53fc05",
  "c7176a703d4dd84fba3c0b760d10670f2a2053fa2c39ccc64ec7fd7792ac037a",
  "ecffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f",
  "edffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f",
  "eeffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f",
];

/** True for a small-order point or a non-canonical y (y >= p). */
export function isWeakPoint(p32: Uint8Array): boolean {
  if (p32.length !== 32) return true;
  const c = p32.slice();
  c[31] = c[31]! & 0x7f;
  const h = toHex(c);
  if (SMALL_ORDER.includes(h)) return true;
  // y >= p = 2^255 - 19: top byte 0x7f, middle all 0xff, low byte >= 0xed.
  if (c[31] === 0x7f && c.subarray(1, 31).every((b) => b === 0xff) && c[0]! >= 0xed) return true;
  return false;
}

// S must be < L, the group order. WebCrypto should check it; this does not rely on that.
const L_LE = [
  0xed, 0xd3, 0xf5, 0x5c, 0x1a, 0x63, 0x12, 0x58, 0xd6, 0x9c, 0xf7, 0xa2, 0xde, 0xf9, 0xde, 0x14,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x10,
];
function scalarIsCanonical(s: Uint8Array): boolean {
  for (let i = 31; i >= 0; i--) {
    if (s[i]! < L_LE[i]!) return true;
    if (s[i]! > L_LE[i]!) return false;
  }
  return false; // equal to L
}

export type VerifyFailure =
  | "public-key-not-32-bytes"
  | "signature-not-64-bytes"
  | "public-key-all-zero"
  | "weak-public-key"
  | "non-canonical-signature"
  | "empty-accept-list"
  | "signature-does-not-verify";

export type VerifyResult =
  | { ok: true; address: string; prefix: SignMessageDomain }
  | { ok: false; reason: VerifyFailure };

/**
 * Verify a Nimiq signed message. Never throws. Takes no address: the address
 * the key controls is RETURNED, and the caller compares it.
 */
export async function verifySignedMessage(args: {
  message: Uint8Array | string;
  publicKey: Uint8Array | string;
  signature: Uint8Array | string;
  accept: readonly SignMessageDomain[];
}): Promise<VerifyResult> {
  const pk = toBytes(args.publicKey);
  const sig = toBytes(args.signature);
  if (!pk || pk.length !== 32) return { ok: false, reason: "public-key-not-32-bytes" };
  if (!sig || sig.length !== 64) return { ok: false, reason: "signature-not-64-bytes" };
  // All-zero is a curve point whose signatures anyone can forge.
  if (pk.every((b) => b === 0)) return { ok: false, reason: "public-key-all-zero" };
  if (isWeakPoint(pk)) return { ok: false, reason: "weak-public-key" };
  if (isWeakPoint(sig.subarray(0, 32)) || !scalarIsCanonical(sig.subarray(32))) {
    return { ok: false, reason: "non-canonical-signature" };
  }
  // hasOwn, not `in`: "toString" is in every object (audit A3).
  const accept = [...new Set(args.accept ?? [])].filter((d) => Object.hasOwn(SIGN_MESSAGE_PREFIX, d));
  if (accept.length === 0) return { ok: false, reason: "empty-accept-list" };

  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey("raw", pk as BufferSource, { name: "Ed25519" }, false, ["verify"]);
  } catch {
    return { ok: false, reason: "signature-does-not-verify" };
  }
  for (const domain of accept) {
    const digest = await signedMessageDigest(args.message, domain);
    let valid = false;
    try {
      valid = await crypto.subtle.verify("Ed25519", key, sig as BufferSource, digest as BufferSource);
    } catch {
      valid = false;
    }
    if (valid) return { ok: true, address: addressFromPublicKey(pk), prefix: domain };
  }
  return { ok: false, reason: "signature-does-not-verify" };
}
