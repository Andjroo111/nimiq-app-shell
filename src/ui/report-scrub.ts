// What a bug report is not allowed to carry.
//
// Its own module because both halves of the reporter need it: report-capture.ts
// scrubs every line as it enters the ring buffer, so the buffer never holds key
// material, and report-bug.ts scrubs again on the way out, because the text a
// person typed and the draft the service hands back never went through capture.

/** A hex run this long is a key, a preimage or a hash, with or without `0x`.
 *
 *  32 digits is 16 bytes: the shortest thing anyone calls a key. A Nimiq private
 *  key and an HTLC preimage are both 64, and an app that logs
 *  `invalid preimage <64 hex>` sent exactly that toward a public issue before
 *  this existed. The cost is known and accepted: a transaction hash, a sha256 and an
 *  md5 have the same shape and go too. Nothing on the page can tell a hash from
 *  a key, and a lost hash costs a question while a leaked key costs the wallet.
 *
 *  No boundary is needed. The match is greedy from the first hex digit of a
 *  run, so a long run is taken whole wherever it sits, including glued into a
 *  key name such as `sk_<hex>`. And no lookbehind anywhere in this file: it is
 *  a SYNTAX error on Safari below 16.4, which takes the whole module down. */
const HEX_RUN = /(?:0x)?[0-9a-f]{32,}/gi;

/** A base64 or base64url run of 40 or more characters, with its padding.
 *
 *  40 because 30 bytes encode to exactly 40 characters, so every 32 byte key
 *  (43 or 44 characters) clears it with room to spare, while a 36 character
 *  JWT header and ordinary identifiers stay under it.
 *
 *  ONE alphabet for both dialects (`+/` and `-_`). Matching them separately
 *  splits a base64url value at its first `-` and can leave the tail behind.
 *  That union also spells every URL path, which is what `looksEncoded` is for. */
const BASE64_RUN = /[A-Za-z0-9+/_-]{40,}={0,2}/g;

/** Encoded bytes mix upper case, lower case and digits. A path or a kebab-case
 *  identifier almost never has all three in one unbroken 40 character run, so
 *  `/api/kids/some-long-lowercase-route/with-more-segments` is left readable.
 *
 *  It errs toward scrubbing: a 40+ character path that does carry all three
 *  (`/api/v2/Users/…`) goes. The miss it accepts is a random value with no digit
 *  at all, about 1 in 1,000 at 40 characters and rarer as it grows. */
function looksEncoded(run: string): boolean {
  return /[A-Z]/.test(run) && /[a-z]/.test(run) && /[0-9]/.test(run);
}

/** Twelve or more lowercase words of 3 to 8 letters, single spaces between:
 *  the shape of a BIP39 recovery phrase (12 to 24 words, and every word on the
 *  list is 3 to 8 letters).
 *
 *  A heuristic, because the real test is the 2048 word list and that is 13 KB
 *  in a bundle every fleet app loads. The false positive is a stretch of plain
 *  prose with twelve such words in a row and no capital, digit, punctuation or
 *  one or two letter word (`a`, `is`, `to`, `of`) among them. Console errors
 *  rarely read like that; sentences people type often do, which is why this
 *  runs on captured lines only and not on the description or the issue draft.
 *
 *  The leading character is captured rather than looked behind at, for Safari. */
const SEED_PHRASE = /(^|[^a-z])(?:[a-z]{3,8} ){11,}[a-z]{3,8}(?![a-z])/g;

/** Redact anything identifier-shaped or secret-shaped: NQ addresses (spaced and
 *  compact forms), UUIDs, long hex runs and long base64 runs. This runs
 *  CLIENT-side and it has to, because in bot mode the
 *  browser talks to the issue service directly — there is no server of the app's
 *  own left in the path to scrub on the way out. Fleet apps include one used by
 *  children, where an account id in a public issue is not an acceptable
 *  debugging aid.
 *
 *  The UUID half was learned the hard way in nimiq.kids: nearly every call that
 *  app makes is addressed by CHILD UUID, so a kid tapping Buy on a pack she
 *  already owned put `POST /api/kids/8f3c…/buy → 400` — captured by
 *  report-capture, sent as context, written up by an LLM — into a PUBLIC issue.
 *  That app had to switch its diagnostics off wholesale because the shell's only
 *  redaction was the address regex. This is the half that turns them back on.
 *
 *  Deliberately ANY UUID shape (8-4-4-4-12 hex), not just v4: the version and
 *  variant nibbles are a generator's business, and a v7 or a non-conforming id
 *  from some other system identifies a person just as well.
 *
 *  The boundary is "no hex digit either side", not `\b`. `\b` counts `_` as a
 *  word character, so `kid_<uuid>` — a cache key, a storage key, an avatar
 *  filename — would sail straight through the very regex written to catch it.
 *  Written as a captured leading character rather than a lookbehind on purpose:
 *  a lookbehind is a SYNTAX error on Safari below 16.4, and a syntax error in a
 *  regex literal takes the whole module down with it, in a shell every app in
 *  the fleet loads.
 *
 *  The hex and base64 halves came later and reversed an earlier call. Long hex
 *  used to be left alone on the grounds that it is a hash, not a person. True,
 *  and it is also what a private key and an HTLC preimage look like; see
 *  HEX_RUN for the trade. Addresses and UUIDs go first so they keep their own
 *  labels where a compact address would otherwise read as a long run.
 *
 *  The name stays `scrubAddresses` because fleet apps import it. */
export function scrubAddresses(text: string): string {
  return text
    .replace(/NQ\d{2}[\s]?(?:[0-9A-HJ-NP-VXY]{4}[\s]?){8}/gi, '[address redacted]')
    .replace(
      /(^|[^0-9a-f])([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?![0-9a-f])/gi,
      '$1[id redacted]',
    )
    .replace(HEX_RUN, '[hex redacted]')
    .replace(BASE64_RUN, (run) => (looksEncoded(run) ? '[base64 redacted]' : run));
}

/** `scrubAddresses` plus the seed phrase heuristic, for text the page captured
 *  on its own: console errors, rejections, failed requests. See SEED_PHRASE for
 *  why typed text does not get this half. */
export function scrubCaptured(text: string): string {
  return scrubAddresses(text.replace(SEED_PHRASE, '$1[seed phrase redacted]'));
}
