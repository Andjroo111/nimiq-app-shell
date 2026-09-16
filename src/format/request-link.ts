// Nimiq request links, ported from @nimiq/utils RequestLinkEncoding.
//
// PORTED, not imported, the same call `format/nim.ts` makes about
// FormattableNumber: @nimiq/utils is a transitive dependency here (it arrives
// under @nimiq/hub-api), and promoting it to a direct one to reach two string
// templates would put its whole surface in every fleet app's bundle.
//
// ⚠ THE UPSTREAM DEFAULT IS WRONG FOR US. `createNimiqRequestLink` defaults
// `basePath` to `window.location.host`, which is correct inside the wallet and
// broken everywhere else: from nimiq.cool it would mint a link to
// nimiq.cool/#_request/… , a page with no idea what that means. The base is
// therefore explicit and defaults to the wallet, which is the page that can
// actually open one.
import { lunaToNim } from './nim';

/** The page a request link opens in. Hosts with their own Safe-style handler
 *  pass their own; everyone else wants the wallet. */
export const DEFAULT_REQUEST_BASE = 'https://wallet.nimiq.com';

export interface RequestLinkOptions {
  /** Amount in luna. Omitted or 0 means "any amount", which is a valid and
   *  useful request: it is how you say "pay me" without naming a price. */
  amountLuna?: bigint | number;
  /** Up to 64 BYTES on chain, not characters. Left to the caller to police. */
  message?: string;
  basePath?: string;
}

/**
 * The Safe-style `https://` request link, which is what the wallet's own
 * "Create request link" produces:
 *
 *   {base}/#_request/{recipient}/{amount}/{message}_
 *
 * Trailing segments are only present when something after them needs them,
 * which is upstream's rule and not a tidiness choice: a link carrying an empty
 * amount segment parses differently from one carrying none.
 *
 * Safe-style rather than the `nimiq:` URI scheme, for the same reason the
 * wallet chose it: a `nimiq:` link is dead to anyone without a handler
 * registered, and the whole point of the thing is sending it to someone who
 * may not have the app yet.
 */
export function nimiqRequestLink(address: string, options: RequestLinkOptions = {}): string {
  const recipient = address.replace(/\s+/g, '').toUpperCase();
  const base = options.basePath ?? DEFAULT_REQUEST_BASE;
  const luna = BigInt(options.amountLuna ?? 0);
  const message = options.message?.trim() ?? '';

  const segments = [recipient];
  // Upstream pushes the amount only when an amount, message or label exists,
  // and the message only when a message or label does.
  if (luna > 0n || message) segments.push(luna > 0n ? lunaToNim(luna).toString() : '');
  if (message) segments.push(encodeURIComponent(message));

  const slash = base.endsWith('/') ? '' : '/';
  return `${base}${slash}#_request/${segments.join('/')}_`;
}
