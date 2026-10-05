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
export function normalizeForGuard(text: string): string {
  return decodeEntities(text)
    .replace(/<!--[\s\S]*?(?:-->|$)/g, '')
    .replace(/<\/?[a-z][^>]*>/gi, (tag) => (/^<\/?a\b/i.test(tag) ? tag : ''))
    .normalize('NFKC')
    .replace(ZERO_WIDTH, '')
    .replace(/[  -   　]/g, ' ')
    .replace(/[Ͱ-ϿЀ-ӿ]/g, (c) => CONFUSABLE[c] ?? c);
}

const TLDS =
  'com|net|org|io|co|app|dev|xyz|me|info|biz|ai|link|site|online|top|ru|cn|tk|gg|fun|sale|cool|money|finance|wallet|click|live|vip|pro|club|shop|store|support|help|page|zip|mov|claims?|gift|win|cash|exchange';
// Any scheme URL, a www. host, an angle autolink target, or a bare domain with a
// known TLD or a path.
const URL_RE = new RegExp(
  String.raw`(?:\b(?:https?|ftp|wss?|mailto|javascript|data|nimiq|ipfs):[^\s<>"'\x60()\[\]]+|\bwww\.[^\s<>"'\x60()\[\]]+|\b(?:[a-z0-9-]+\.)+(?:${TLDS})\b(?:[/?#][^\s<>"'\x60()\[\]]*)?|\b(?:[a-z0-9-]+\.)+[a-z]{2,24}/[^\s<>"'\x60()\[\]]*)`,
  'gi',
);

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
  let out = normalizeForGuard(text).replace(URL_RE, (m) => {
    const clean = m.replace(/[.,;:!?)\]}'"*_]+$/, '');
    const tail = m.slice(clean.length);
    return allowedHost(hostOf(clean), allowedHosts) ? m : tail;
  });
  out = out
    .replace(/<a\b[^>]*>/gi, '')
    .replace(/<\/a>/gi, '')
    .replace(/\[([^\]]*)\]\(\s*(?:\([^)]*\)|'[^']*'|"[^"]*")?\s*\)/g, '$1') // [title]() with only a title left
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, '$1') // ref-style use
    .replace(/^\s*\[[^\]]+\]:\s*$/gm, '') // ref definition whose target was removed
    .replace(/<\s*>/g, '');
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
  String.raw`[NH]${SEP}Q${SEP}\d${SEP}\d(?:${SEP}[0-9A-HJ-NP-VXY]){24,32}`,
  'gi',
);
const compact = (a: string) => a.replace(/[^0-9A-Z]/gi, '').toUpperCase();

/** What a reader actually sees: comments, tags and markdown link/image syntax
 *  removed, link text and image alts kept. Addresses are scanned here, because
 *  markup can split an address the renderer shows whole. */
export function visibleText(normalized: string): string {
  return normalized
    .replace(/<!--[\s\S]*?(?:-->|$)/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/!?\[([^\]]*)\]\[[^\]]*\]/g, '$1')
    .replace(/^[ \t]*\[[^\]]+\]:.*$/gm, '')
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
  const scrub = (t: string) => t.replace(NQ_LIKE, (m) => (ok.has(compact(m)) ? m : replacement));
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
      if (/^\[(?:system|assistant|developer|tool|user|human)\]/i.test(bare)) return false;
      return !ROLE.test(bare);
    })
    .join('\n');
}
