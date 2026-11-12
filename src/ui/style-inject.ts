// The one place the mini wallet and the pieces it mounts put a <style> on the
// page. Shared so a strict-CSP host gets the same two answers from all of them:
// a nonce stamped on every element (`styleNonce`), or no element at all
// (`injectStyles: false`, with the host linking dist/app-shell.css instead).

export interface StyleInjection {
  /** false: create no <style> element. Default true. */
  injectStyles?: boolean;
  /** Stamped on the created <style> as both the property and the attribute,
   *  so a CSP `style-src 'nonce-...'` admits it. */
  styleNonce?: string;
}

/** Append `css` under `id` once per document. A second call with the same id
 *  is a no-op, which also means a nonce passed later does not reach an element
 *  an earlier mount already created without one. */
export function injectStyle(id: string, css: string, opts: StyleInjection = {}, doc?: Document): void {
  const d = doc ?? (typeof document === 'undefined' ? undefined : document);
  if (!d || opts.injectStyles === false || d.getElementById(id)) return;
  const style = d.createElement('style');
  style.id = id;
  if (opts.styleNonce) {
    style.nonce = opts.styleNonce;
    style.setAttribute('nonce', opts.styleNonce);
  }
  style.textContent = css;
  d.head.appendChild(style);
}
