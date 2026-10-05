// Guards for model-written text before a user sees it (recon C2-297).
//
// A model invents links and addresses. A made-up URL is a phishing link with
// our name on it; a made-up NQ address is one a user may pay. Default-deny:
// text is normalized first (NFKC, zero-width removed, look-alike letters
// folded, HTML space entities resolved), then EVERY link-shaped and
// address-shaped token is checked, inside code too, because a code span
// renders a copyable address just as well. Output is the normalized text.

const ZERO_WIDTH = /[­​-‏⁠-⁤﻿᠎]/g;
// Cyrillic and Greek letters that render like Latin ones.
const CONFUSABLE: Record<string, string> = {
  А: 'A', В: 'B', Е: 'E', К: 'K', М: 'M', Н: 'H', О: 'O', Р: 'P', С: 'C', Т: 'T', Х: 'X', Ѕ: 'S', І: 'I', Ј: 'J',
  а: 'a', в: 'b', е: 'e', к: 'k', м: 'm', н: 'h', о: 'o', р: 'p', с: 'c', т: 't', у: 'y', х: 'x', ѕ: 's', і: 'i', ј: 'j',
  Α: 'A', Β: 'B', Ε: 'E', Ζ: 'Z', Η: 'H', Ι: 'I', Κ: 'K', Μ: 'M', Ν: 'N', Ο: 'O', Ρ: 'P', Τ: 'T', Υ: 'Y', Χ: 'X',
  ο: 'o', ν: 'v',
};

const NAMED: Record<string, string> = {
  nbsp: ' ', ensp: ' ', emsp: ' ', thinsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  colon: ':', sol: '/', bsol: '\\', period: '.', comma: ',', lpar: '(', rpar: ')', lsqb: '[', rsqb: ']',
  zwsp: '', zwj: '', zwnj: '', shy: '', commat: '@', num: '#', excl: '!', quest: '?', equals: '=',
  lowbar: '_', hyphen: '-', dash: '-', tab: '\t', newline: '\n',
};

/** Decode every HTML entity, repeatedly, so &amp;#32; cannot hide a space. */
function decodeEntities(t: string): string {
  for (let i = 0; i < 4; i++) {
    const next = t.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);?/gi, (m, e: string) => {
      if (e[0] === '#') {
        const hex = e[1] === 'x' || e[1] === 'X';
        const cp = hex ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(cp) && cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : '';
      }
      const v = NAMED[e.toLowerCase()];
      return v === undefined ? m : v;
    });
    if (next === t) break;
    t = next;
  }
  return t;
}

/** The form every guard matches against, and returns. Entities are decoded
 *  and HTML tags other than <a> removed: model output is markdown, and a tag
 *  can split an address the browser renders whole. */
/** Remove <!-- ... --> (an unclosed one runs to the end), in one linear pass. */
function stripComments(t: string): string {
  let out = '';
  let i = 0;
  for (;;) {
    const a = t.indexOf('<!--', i);
    if (a < 0) return out + t.slice(i);
    out += t.slice(i, a);
    const b = t.indexOf('-->', a + 4);
    if (b < 0) return out;
    i = b + 3;
  }
}

/** Look-alike letters folded to Latin, ONLY for matching: same length as the
 *  input (every mapping is one character to one), so match positions carry
 *  back to the original and Cyrillic or Greek prose is output untouched. */
function foldForMatch(t: string): string {
  return t
    .replace(/[Ԛԛ]/g, 'Q') // Cyrillic Qa
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)) // Arabic-Indic digits
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0)) // Extended Arabic-Indic
    .replace(/[Нн](?=[^0-9A-Za-zЀ-ӿ]{0,64}[Qq])/g, 'N') // Cyrillic En before Q reads as an N here
    .replace(/[Ͱ-ϿЀ-ӿ]/g, (c) => CONFUSABLE[c] ?? c);
}

/** Longest input any guard will scan; model output past this is cut, not slowly scanned. */
export const GUARD_MAX_CHARS = 50_000;

export function normalizeForGuard(text: string): string {
  const cut = text.length > GUARD_MAX_CHARS;
  const body = stripComments(decodeEntities(cut ? text.slice(0, GUARD_MAX_CHARS) : text))
    // [^<>]: a run of '<' cannot make each start scan to the end (quadratic).
    .replace(/<\/?[a-z][^<>]*>/gi, (tag) => (/^<\/?a\b/i.test(tag) ? tag : ''))
    .normalize('NFKC')
    .replace(ZERO_WIDTH, '')
    .replace(/[\u3002\uff61]/g, '.') // ideographic full stops render as a dot in a host
    .replace(/[  -   　]/g, ' ');
  // Say so when the input was cut: a silent truncation reads as the whole answer.
  return cut ? `${body}\n[truncated]` : body;
}

const TLDS =
  'com|net|org|io|co|app|dev|xyz|me|info|biz|ai|link|site|online|top|ru|cn|tk|gg|fun|sale|cool|money|finance|wallet|click|live|vip|pro|club|shop|store|support|help|page|zip|mov|claims?|gift|win|cash|exchange';
// Tokens are runs of characters that can sit inside a URL; each is bounded,
// so no pattern below can backtrack across the whole input.
const TOKEN_RE = /[^\s<>"'\x60()\[\]{},;!*|]{1,4096}/g;
const SCHEME_IN_TOKEN = /(?:https?|ftp|wss?|mailto|javascript|data|nimiq|ipfs):|www\./i;
const BARE_DOMAIN = /^(?:[\p{L}\p{N}-]{1,63}\.){1,10}([\p{L}]{2,24})([/?#].*)?$/iu;
const BARE_IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}(?:[:/?#].*)?$/;
const TLD_SET = new Set(TLDS.split('|').map((t) => t.replace('?', '')).concat(['claims']));

/** Split a token into [prefix, url] when it holds a URL, else null. */
function urlInToken(raw: string): [string, string] | null {
  // Leading backslashes are escapes a renderer drops ("\\evil.com").
  const lead = /^\\+/.exec(raw)?.[0] ?? '';
  const tok = raw.slice(lead.length);
  const hit = urlInBareToken(tok);
  return hit ? [lead + hit[0], hit[1]] : null;
}

function urlInBareToken(tok: string): [string, string] | null {
  if (BARE_IPV4.test(tok)) return ['', tok];
  const m = SCHEME_IN_TOKEN.exec(tok);
  if (m) return [tok.slice(0, m.index), tok.slice(m.index)];
  // Protocol-relative (//host/path) is a link to whatever host follows.
  if (tok.startsWith('//')) return BARE_DOMAIN.test(tok.replace(/^\/+/, '').replace(/[/?#].*$/, '') + '/') ? ['', tok] : null;
  // No dot, no domain: skip the unicode pattern entirely (it is the costly one).
  const d = tok.includes('.') ? BARE_DOMAIN.exec(tok) : null;
  if (d && (d[2] || TLD_SET.has(d[1]!.toLowerCase()))) return ['', tok];
  return null;
}

function hostOf(token: string): string | null {
  // A renderer unescapes "\\@" to "@" while URL() reads "\\" as "/": they disagree
  // about the host, so a backslash is never allowed.
  if (token.includes('\\')) return null;
  const t = /^[a-z][a-z0-9+.-]*:/i.test(token) ? token : `https://${token}`;
  try {
    const u = new URL(t);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (u.username || u.password) return null;
    return u.hostname.toLowerCase();
  } catch {
    return null;
  }
}

function allowedHost(host: string | null, roots: readonly string[]): boolean {
  if (!host) return false;
  return roots.some((r) => {
    const root = r.toLowerCase().replace(/^\.+/, '');
    return host === root || host.endsWith(`.${root}`);
  });
}

/**
 * Keep http(s) links only to `allowedHosts` and their subdomains. Every other
 * URL-shaped token is removed wherever it appears (markdown target or title,
 * reference definition, autolink, HTML attribute, code). Markdown and HTML
 * scaffolding left empty is cleaned up so the visible words survive.
 */
export function enforceLinkAllowlist(text: string, allowedHosts: readonly string[]): string {
  // A browser drops tabs and newlines inside a URL ("ht\ttps:" is https:), so
  // they are removed inside link targets and href values before tokenizing.
  // A link target or href is kept only when it is an allowed http(s) URL;
  // anything else (vbscript:, file:, data:, a bare word) is emptied. Browsers
  // drop tabs and newlines inside a URL, so those are removed first.
  const targetOk = (raw: string) => {
    const url = raw.replace(/[\t\r\n]/g, '').trim().split(/\s/)[0]!.replace(/^<|>$/g, '');
    return /^https?:\/\//i.test(url) && allowedHost(hostOf(url), allowedHosts);
  };
  const squeezed = normalizeForGuard(text)
    // One level of parens inside the target ('vbscript:msgbox(1)'); each branch starts
    // on a different character, so the repetition cannot backtrack.
    .replace(/\]\(((?:[^()]|\([^()]*\))*)\)/g, (_m, inner: string) => (targetOk(inner) ? `](${inner.replace(/[\t\r\n]/g, '')})` : ']()'))
    .replace(/\bhref\s*=\s*("[^"<>]*"|'[^'<>]*')/gi, (_m, v: string) => (targetOk(v.slice(1, -1)) ? `href=${v.replace(/[\t\r\n]/g, '')}` : ''));
  let out = squeezed.replace(TOKEN_RE, (tok) => {
    const hit = urlInToken(tok);
    if (!hit) return tok;
    const [prefix, url] = hit;
    const clean = url.replace(/[.:?'"_]+$/, '');
    const tail = url.slice(clean.length);
    return allowedHost(hostOf(clean), allowedHosts) ? tok : prefix + tail;
  });
  // Every pattern excludes its own opener from its body, so none can scan to
  // the end of the input once per opener (the quadratic case).
  out = out
    .replace(/<a\b[^<>]*>/gi, '')
    .replace(/<\/a>/gi, '')
    .replace(/\[([^\[\]]*)\]\([ \t]*(?:\([^()\n]*\)|'[^'\n]*'|"[^"\n]*")?[ \t]*\)/g, '$1') // [title]() with only a title left
    .replace(/\[([^\[\]]*)\]\[[^\[\]]*\]/g, '$1') // ref-style use
    .replace(/^[ \t]*\[[^\[\]\n]+\]:[ \t]*$/gm, '') // ref definition whose target was removed
    .replace(/<[ \t]*>/g, '');
  return out;
}

// N then Q, two check digits, then 24..32 Nimiq base32 characters, with any
// run of separators a renderer would hide: spaces, newlines, dashes, dots,
// markdown emphasis or code ticks.
// Any run (up to 24) of non-alphanumerics between characters: a renderer can hide or
// join across nearly every punctuation mark, so none is trusted as a boundary.
// Any run of non-alphanumerics, unbounded: HTML collapses whitespace and markdown turns
// long '=', '-' or '*' runs into rules or headings, so no length is a safe boundary.
// One character class between fixed anchors: linear, no catastrophic backtracking.
const SEP = String.raw`[^0-9A-Za-z]*`;
const NQ_LIKE = new RegExp(
  String.raw`N${SEP}Q${SEP}\d${SEP}\d(?:${SEP}[0-9A-HJ-NP-VXY]){24,32}`,
  'gi',
);
const compact = (a: string) => a.replace(/[^0-9A-Z]/gi, '').toUpperCase();

/** What a reader actually sees: comments, tags and markdown link/image syntax
 *  removed, link text and image alts kept. Addresses are scanned here, because
 *  markup can split an address the renderer shows whole. */
export function visibleText(normalized: string): string {
  return stripComments(normalized)
    .replace(/<[^<>]*>/g, '')
    .replace(/!?\[([^\[\]]*)\]\([^()]*\)/g, '$1')
    .replace(/!?\[([^\[\]]*)\]\[[^\[\]]*\]/g, '$1')
    .replace(/^[ \t]*\[[^\[\]\n]+\]:.*$/gm, '')
    // Fragments of tags a renderer would swallow (unclosed, or broken by a '>' in an attribute).
    .replace(/<\/?[a-z!][^\s>]*/gi, '');
}

/**
 * Replace every address-shaped token not in `verified` (any spelling). When an
 * unverified address only appears once markup is removed, the markup goes:
 * the visible text, with the address replaced, is returned.
 */
export function stripUnverifiedNqAddresses(text: string, verified: readonly string[], replacement = 'your NQ address'): string {
  const ok = new Set(verified.map(compact));
  // Match on the folded copy (same length), splice into the original text.
  const scrub = (t: string) => {
    const f = foldForMatch(t);
    let out = '';
    let at = 0;
    for (const m of f.matchAll(NQ_LIKE)) {
      const i = m.index!;
      const end = i + m[0].length;
      out += t.slice(at, i) + (ok.has(compact(m[0])) ? t.slice(i, end) : replacement);
      at = end;
    }
    return out + t.slice(at);
  };
  const direct = scrub(normalizeForGuard(text));
  const seen = visibleText(direct);
  const cleaned = scrub(seen);
  return cleaned === seen ? direct : cleaned;
}

/** Both guards in the safe order: links first, then addresses on what remains. */
export function guardModelText(text: string, o: { allowedHosts: readonly string[]; verifiedAddresses: readonly string[] }): string {
  return stripUnverifiedNqAddresses(enforceLinkAllowlist(text, o.allowedHosts), o.verifiedAddresses);
}

const LINE_SPLIT = new RegExp('\\r\\n|[\\r\\n\\u2028\\u2029\\u0085\\v\\f]');
const ROLE =
  /^(?:system|human|user|assistant|developer|tool|function|context|instruction|instructions|admin|operator)\b[^:\n]{0,24}:/i;

/** Drop lines in USER input that pose as a role or context header. */
export function stripForgedLines(userInput: string): string {
  return normalizeForGuard(userInput)
    .split(LINE_SPLIT)
    .filter((line) => {
      if (/<\|[a-z_]*\|>/i.test(line)) return false; // chat-template tokens anywhere
      // Strip markdown decoration a header could hide behind.
      const bare = line.replace(/^[\s>#*_\-+`~|]+/, '').replace(/^\d+[.)]\s*/, '').replace(/[*_`~]/g, '');
      if (/^\[(?:system|assistant|developer|tool|user|human)\]/i.test(foldForMatch(bare))) return false;
      // Match on the folded form (a Cyrillic S in 'System:'), keep the original line.
      return !ROLE.test(foldForMatch(bare));
    })
    .join('\n');
}
