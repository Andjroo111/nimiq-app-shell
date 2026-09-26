// Nimiq names in the recipient field: type `gaston`, pay NQ12 ACQM ...
//
// The registry is NOT ours. It is selfcrypto's NNS (nimiqnames.com, Mini Apps
// Competition Cycle II), live on mainnet since height 62,275,680. We shelved
// our own nimiq.name registry on 2026-09-26 rather than run a second one: two
// registries on one chain means `alice` can resolve to two addresses, which is
// the one failure a name service exists to prevent. So the fleet READS theirs.
//
// Everything that decides whether an answer is true lives in their
// `@nimiqnames/resolver`, pinned exactly: the name syntax, the two-resolver
// quorum and the Merkle proof each answer must recombine to. This file only
// decides WHEN the field is holding a name, and turns their outcomes into the
// three states the send sheet draws. Restating their rules here is how the two
// would drift.

import {
  DEFAULT_RESOLVERS,
  createResolver,
  type ResolverEndpoint,
  type Verification,
} from '@nimiqnames/resolver';
import { parseQuery } from '@nimiqnames/core';

export { DEFAULT_RESOLVERS as NNS_RESOLVERS };
export type { ResolverEndpoint as NnsResolverEndpoint };

/** Where the recipient field stands with respect to a name. */
export type NameLookup =
  | { state: 'found'; query: string; address: string; verification: Verification; agreed: number }
  | { state: 'missing'; query: string }
  /** It resolves, but the proof has not caught up with the answer: the owner
   *  repointed it since the last checkpoint, OR every resolver is serving a
   *  target the chain never proved. The two look identical from here, and a
   *  checkpoint lands every ~1 minute, so waiting is cheap and paying is not. */
  | { state: 'pending'; query: string }
  | { state: 'failed'; query: string };

export interface NameResolverOptions {
  /** ADD to the shipped list, never replace it. Their spec requires two
   *  independent resolvers to agree, and swapping the list for one of your
   *  own is how one party ends up vouching for itself. */
  resolvers?: ResolverEndpoint[];
  /** Per-resolver budget. Theirs is 5000 ms; kept, since a slow answer the
   *  user waits for beats a working resolver reported as down. */
  timeoutMs?: number;
  /** Inject a fetch (tests, proxies). */
  fetch?: typeof fetch;
}

export interface NameResolver {
  lookup(query: string): Promise<NameLookup>;
}

/** The query as NNS spells it, or null when the text cannot be a name.
 *
 *  An address wins every tie. `nq48` is legal name syntax (a trailing digit
 *  run), and it is also the first four characters of every address anyone
 *  types, so a field that resolved it would fire a lookup on each address
 *  keystroke. Names that start `nq` plus a digit are unreachable from this
 *  field; none are registered, and the cost is that a sender pastes the
 *  address instead. */
export function looksLikeAddress(raw: string): boolean {
  return /^\s*(?:nimiq:)?\s*nq\d/i.test(raw);
}

/** Whether the field should be in NAME mode: anything typed that is not an
 *  address. Wider than nameQuery on purpose. `nobo` is not a valid NNS query
 *  (1 to 4 characters are reserved), but it is the first four letters of one,
 *  and a field that upper-cased it into address blocks would turn `nobodyhere`
 *  into `NOBO DYHE RE` before the name was finished. */
export function isNameInput(raw: string): boolean {
  return raw.trim() !== '' && !looksLikeAddress(raw);
}

export function nameQuery(raw: string): string | null {
  const text = raw.trim().replace(/^@/, '').toLowerCase();
  if (!text) return null;
  if (looksLikeAddress(text)) return null;
  return parseQuery(text).ok ? text : null;
}

export function createNameResolver(options: NameResolverOptions = {}): NameResolver {
  const nns = createResolver({
    resolvers: [...DEFAULT_RESOLVERS, ...(options.resolvers ?? [])],
    ...(options.timeoutMs ? { timeoutMs: options.timeoutMs } : {}),
    ...(options.fetch ? { fetch: options.fetch as never } : {}),
  });
  return {
    async lookup(raw: string): Promise<NameLookup> {
      const query = nameQuery(raw);
      if (!query) return { state: 'missing', query: raw };
      try {
        const r = await nns.resolve(query);
        if (r.verification === 'PROOF_PENDING') return { state: 'pending', query };
        return {
          state: 'found',
          query,
          address: String(r.address),
          verification: r.verification,
          agreed: r.quorum.agreed,
        };
      } catch (err) {
        // NOT_FOUND and IN_GRACE both mean "nobody you can pay holds this".
        // Anything else (a resolver down, a quorum split, a proof that did not
        // recombine) is a failure, and a failure never becomes an address.
        const code = (err as { code?: string }).code;
        if (code === 'NOT_FOUND' || code === 'IN_GRACE') return { state: 'missing', query };
        return { state: 'failed', query };
      }
    },
  };
}
