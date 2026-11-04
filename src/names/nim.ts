// `.nim` names in the recipient field: type `alice.nim`, pay the address it
// proves to. The registry is the repo owner's (nimiq.name), a separate namespace from
// NNS: the suffix is what keeps `alice` and `alice.nim` from ever colliding.
//
// An answer counts only through its Merkle proof: the address is read from the
// proven leaf and from nothing else the server said. A proof only shows an answer
// matches the root that came with it, though. One server can serve a forged tree
// that is perfectly self-consistent, so a lone endpoint proves nothing, and the
// default needs two independent hosts, the same rule as nimiq.name's own
// src/resolver-client.ts. Only one host exists today, so by default every lookup
// answers `nim-off` and offers nothing to tap. `singleOperator: true` accepts one
// host's proof, which is trusting that operator with where the money goes.
//
// Hashing matches nimiq.name src/merkle.ts:
//   leaf = sha256(0x00 || name \0 owner \0 target \0 expiresAt)
//   node = sha256(0x01 || left || right)

import { compactNimAddress, isValidNimAddress } from '../format/address';
import type { NameLookup } from './index';

/** The registry's own host. A second, independent one goes here. */
export const NIM_RESOLVERS: readonly string[] = ['https://nimiq.name'];

/** nimiq.name src/registry.ts: an expired name still resolves for this long. */
const GRACE_SECONDS = 90 * 24 * 60 * 60;

export interface NimResolverOptions {
  /** Replaces the list. Hosts are deduped, so one host cannot count twice. */
  endpoints?: readonly string[];
  /** Accept one host's proof. See the top of this file for what that trusts. */
  singleOperator?: boolean;
  timeoutMs?: number;
  fetch?: typeof fetch;
  /** Unix seconds, for the expiry check. */
  now?: () => number;
}

/** `alice.nim` when the text is a `.nim` name in the registry's alphabet. */
export function nimQuery(raw: string): string | null {
  const text = raw.trim().replace(/^@/, '').toLowerCase();
  return /^[a-z0-9-]{3,32}\.nim$/.test(text) ? text : null;
}

interface Leaf { name: string; owner: string; target: string; expiresAt: number }
interface Answer { root: string; leaf: Leaf }

const utf8 = (s: string) => new TextEncoder().encode(s);
const fromHex = (h: string) => Uint8Array.from(h.match(/../g) ?? [], (b) => parseInt(b, 16));
const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const HASH = /^[0-9a-f]{64}$/;

async function sha256(...parts: Uint8Array[]): Promise<Uint8Array> {
  const all = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { all.set(p, at); at += p.length; }
  return new Uint8Array(await crypto.subtle.digest('SHA-256', all));
}

/** The answer when its proof recombines to its root for exactly this name. */
async function verified(body: unknown, name: string): Promise<Answer | null> {
  const a = body as { root?: unknown; leaf?: Partial<Leaf>; proof?: unknown } | null;
  const leaf = a?.leaf;
  // The leaf is hashed under the name asked for, so another name's real proof fails.
  if (!leaf || typeof a?.root !== 'string' || !HASH.test(a.root)) return null;
  const { owner, target, expiresAt } = leaf;
  if (typeof owner !== 'string' || typeof target !== 'string' || !Number.isSafeInteger(expiresAt)) return null;
  if (!isValidNimAddress(target) || !Array.isArray(a.proof)) return null;
  let h = await sha256(new Uint8Array([0]), utf8(`${name}\0${owner}\0${target}\0${expiresAt}`));
  for (const step of a.proof as { side?: unknown; hash?: unknown }[]) {
    if (typeof step?.hash !== 'string' || !HASH.test(step.hash)) return null;
    const sibling = fromHex(step.hash);
    if (step.side === 'left') h = await sha256(new Uint8Array([1]), sibling, h);
    else if (step.side === 'right') h = await sha256(new Uint8Array([1]), h, sibling);
    else return null;
  }
  return toHex(h) === a.root ? { root: a.root, leaf: { name, owner, target, expiresAt: expiresAt as number } } : null;
}

const hostOf = (u: string) => {
  try { return new URL(u).hostname.toLowerCase().replace(/\.+$/, ''); } catch { return u.toLowerCase(); }
};

export function createNimResolver(options: NimResolverOptions = {}) {
  const endpoints = [...new Map((options.endpoints ?? NIM_RESOLVERS).map((e) => [hostOf(e), e])).values()];
  const needed = options.singleOperator ? 1 : 2;
  const doFetch = options.fetch ?? fetch;
  const now = options.now ?? (() => Math.floor(Date.now() / 1000));

  return async function lookupNim(query: string): Promise<NameLookup> {
    const name = query.slice(0, -'.nim'.length);
    // Below the quorum no answer could be believed, so none is asked for.
    if (endpoints.length < needed) return { state: 'nim-off', query };
    const answers = await Promise.all(endpoints.map(async (base): Promise<Answer | 'missing' | null> => {
      try {
        const res = await doFetch(`${base.replace(/\/$/, '')}/api/proof/${encodeURIComponent(name)}`, {
          signal: AbortSignal.timeout(options.timeoutMs ?? 5_000),
        });
        if (res.status === 404 || res.status === 400) return 'missing';
        return res.ok ? await verified(await res.json(), name) : null;
      } catch {
        return null; // unreachable, timeout, bad JSON
      }
    }));
    const good = answers.filter((a): a is Answer => a !== null && a !== 'missing');
    if (!good.length) {
      return answers.filter((a) => a === 'missing').length >= needed ? { state: 'missing', query } : { state: 'failed', query };
    }
    // Two addresses is a lie or an attack. Waiting does not settle it, so no row.
    const targets = new Set(good.map((a) => compactNimAddress(a.leaf.target)));
    if (targets.size > 1 || good.length < needed) return { state: 'failed', query };
    // One address under two roots: one host is a batch behind, or the name just
    // moved and the other host has not seen it. Same answer as NNS's PROOF_PENDING.
    if (new Set(good.map((a) => a.root)).size > 1) return { state: 'pending', query };
    const first = good[0]!;
    if (now() >= first.leaf.expiresAt + GRACE_SECONDS) return { state: 'missing', query };
    return { state: 'found', query, address: compactNimAddress(first.leaf.target), verification: 'NIM_PROOF', agreed: good.length };
  };
}
