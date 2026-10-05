// Guards for model-written text before a user sees it (recon C2-297).
//
// A model invents links and addresses. A made-up URL is a phishing link with
// our name on it; a made-up NQ address is one a user may pay. Pure string
// functions, no deps. Fenced and inline code is left alone, so code samples
// survive.

const NQ_RE = /\bNQ\d{2}(?:[ \t]?[0-9A-HJ-NP-VXY]{4}){8}\b/gi;
const MD_LINK_RE = /\[([^\]\n]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g;
const BARE_URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>()\]]+/gi;

/** Run `fn` on the prose parts only, leaving ```fenced``` and `inline` code as is. */
function onProse(text: string, fn: (s: string) => string): string {
  return text
    .split(/(```[\s\S]*?```|`[^`\n]*`)/g)
    .map((part, i) => (i % 2 === 1 ? part : fn(part)))
    .join('');
}

const compact = (a: string) => a.replace(/\s+/g, '').toUpperCase();

function hostOf(url: string): string | null {
  try {
    return new URL(/^www\./i.test(url) ? `https://${url}` : url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** True when `host` is an allowed root or a subdomain of one. */
function allowedHost(host: string | null, roots: readonly string[]): boolean {
  if (!host) return false;
  return roots.some((r) => {
    const root = r.toLowerCase().replace(/^\.+/, '');
    return host === root || host.endsWith(`.${root}`);
  });
}

/**
 * Keep links only to `allowedHosts` (and their subdomains). A disallowed
 * markdown link keeps its title text; a disallowed bare URL is removed.
 * Only http(s) links ever survive.
 */
export function enforceLinkAllowlist(text: string, allowedHosts: readonly string[]): string {
  return onProse(text, (prose) =>
    prose
      .replace(MD_LINK_RE, (m, title: string, url: string) => {
        const ok = /^https?:\/\//i.test(url) && allowedHost(hostOf(url), allowedHosts);
        return ok ? m : title;
      })
      .replace(BARE_URL_RE, (url, offset: number, whole: string) => {
        // Inside a kept markdown link target: leave it.
        if (whole[offset - 1] === '(' && whole[offset - 2] === ']') return url;
        const clean = url.replace(/[.,;:!?'"]+$/, '');
        const tail = url.slice(clean.length);
        return allowedHost(hostOf(clean), allowedHosts) ? url : tail;
      }),
  );
}

/** Replace any NQ address not in `verified` (any spelling) with `replacement`. */
export function stripUnverifiedNqAddresses(
  text: string,
  verified: readonly string[],
  replacement = 'your NQ address',
): string {
  const ok = new Set(verified.map(compact));
  return onProse(text, (prose) => prose.replace(NQ_RE, (m) => (ok.has(compact(m)) ? m : replacement)));
}

/** Drop lines in USER input that pose as a role or context header. */
export function stripForgedLines(userInput: string): string {
  return userInput
    .split(/\r?\n/)
    .filter((l) => !/^\s*(system|context|assistant|developer)\s*:/i.test(l))
    .join('\n');
}
