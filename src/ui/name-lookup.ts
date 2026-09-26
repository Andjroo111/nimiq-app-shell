// The name row under the send sheet's recipient field.
//
// Type `gaston` and a row appears: the face, the name, the first blocks of the
// address it proves to. Tapping it FILLS the field with that address, the same
// way a contact chip does, so the address is on screen and checkable before
// the amount step. A name never goes straight to the signer.
//
// No auto-advance, unlike a 36-character address. An address is finished when
// it is long enough; a name is not: `gast` might be registered too, and a
// sheet that jumped on the first hit would pay whoever holds the prefix.
//
// Only a PROVEN or DELEGATED answer offers the row. Pending, missing and failed
// each get one grey line and nothing to tap. See ../names for why each state
// is what it is; this file only draws them.

import type { I18n } from '../i18n';
import { nameQuery, type NameResolver } from '../names';
import { formatAddressBlocks } from './address-input';

/** How long typing must pause before a lookup. Each lookup is two resolver
 *  requests, so a keystroke-rate query would be ten per name. */
export const NAME_LOOKUP_DEBOUNCE_MS = 350;

export interface NameLookupHandle {
  /** The name the field's address came from, when it came from one. */
  nameFor(compactAddress: string): string | null;
  /** Clear the row and forget the last pick (a new send). */
  reset(): void;
}

export function mountNameLookup(opts: {
  field: HTMLTextAreaElement;
  /** The row is inserted directly after this element. */
  after: HTMLElement;
  resolver: NameResolver;
  i18n: I18n;
  identicon?: (address: string, sizePx: number) => HTMLElement;
  /** Called with the spaced address once the row is tapped. */
  onPick: (address: string) => void;
}): NameLookupHandle {
  const { field, resolver, i18n } = opts;
  const row = document.createElement('div');
  row.className = 'nq-cc-name-row';
  row.hidden = true;
  row.setAttribute('aria-live', 'polite');
  opts.after.insertAdjacentElement('afterend', row);

  let timer: ReturnType<typeof setTimeout> | undefined;
  // Every lookup takes a ticket. An answer whose ticket is not the latest is
  // for text no longer in the field, and drawing it would offer the address of
  // `gast` under a field that now says `gaston`.
  let ticket = 0;
  let picked: { name: string; address: string } | null = null;

  function note(key: string, name: string): void {
    row.hidden = false;
    row.textContent = '';
    const line = document.createElement('p');
    line.className = 'nq-cc-name-note';
    line.textContent = i18n.t(key, { name });
    row.appendChild(line);
  }

  function offer(name: string, address: string): void {
    row.hidden = false;
    row.textContent = '';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nq-cc-name-hit';
    if (opts.identicon) {
      const face = document.createElement('span');
      face.className = 'nq-cc-name-icon';
      face.appendChild(opts.identicon(address, 32));
      btn.appendChild(face);
    }
    const text = document.createElement('span');
    text.className = 'nq-cc-name-text';
    const label = document.createElement('span');
    label.className = 'nq-cc-name-label';
    label.textContent = name;
    const addr = document.createElement('span');
    addr.className = 'nq-cc-name-addr nq-cc-mono';
    const spaced = formatAddressBlocks(address).replace(/\n/g, ' ');
    addr.textContent = `${spaced.slice(0, 14)} ...`;
    text.append(label, addr);
    btn.appendChild(text);
    btn.title = spaced;
    btn.setAttribute('aria-label', i18n.t('shell.payName', { name }));
    btn.addEventListener('click', () => {
      picked = { name, address };
      row.hidden = true;
      opts.onPick(spaced);
    });
    row.appendChild(btn);
  }

  function clear(): void {
    row.hidden = true;
    row.textContent = '';
  }

  field.addEventListener('input', () => {
    clearTimeout(timer);
    const query = nameQuery(field.value);
    ticket += 1;
    if (!query) { clear(); return; }
    const mine = ticket;
    note('shell.nameChecking', query);
    timer = setTimeout(async () => {
      const got = await resolver.lookup(query);
      if (mine !== ticket) return;
      if (got.state === 'found') offer(got.query, got.address);
      else if (got.state === 'missing') note('shell.nameMissing', query);
      else if (got.state === 'pending') note('shell.namePending', query);
      else note('shell.nameFailed', query);
    }, NAME_LOOKUP_DEBOUNCE_MS);
  });

  return {
    nameFor(compact) {
      return picked && picked.address === compact ? picked.name : null;
    },
    reset() {
      clearTimeout(timer);
      ticket += 1;
      picked = null;
      clear();
    },
  };
}

export const NAME_LOOKUP_CSS = `
/* A name is not an address: no upper-casing, no block rules, the UI face. */
.nq-cc-addr-is-name .nq-cc-addr-input { text-transform:none; text-align:center;
  width:100%; word-spacing:normal; font-family:inherit; font-size:18px; font-weight:600; }
.nq-cc-addr-is-name .nq-cc-addr-rules { visibility:hidden; }
/* Three classes: this sheet is injected BEFORE the component's, so a tie with
   .nq-cc-party-name.nq-cc-mono would go to the mono rule. */
.nq-cc-party-name.nq-cc-mono.nq-cc-is-name { font-family:inherit; font-size:12px; }
.nq-cc-name-row { width:100%; margin-top:10px; display:flex; justify-content:center; }
.nq-cc-name-row[hidden] { display:none; }
.nq-cc-name-note { margin:0; font-size:12px; font-weight:600; text-align:center;
  color:var(--nq-cc-menu-muted, rgba(31,35,72,.5)); }
.nq-cc-name-hit { display:flex; align-items:center; gap:10px; max-width:100%;
  padding:8px 14px 8px 8px; border:none; border-radius:500px; font-family:inherit; cursor:pointer;
  background:var(--nq-cc-menu-hover, rgba(31,35,72,.06)); color:var(--nq-cc-menu-fg, #1f2348); }
.nq-cc-name-hit:hover .nq-cc-name-label { color:var(--nq-cc-accent, #0582ca); }
.nq-cc-name-hit:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:2px; }
.nq-cc-name-icon { display:block; flex:none; width:32px; height:32px; }
.nq-cc-name-icon > * { display:block; width:100%; height:100%; }
.nq-cc-name-text { display:flex; flex-direction:column; align-items:flex-start; min-width:0; }
.nq-cc-name-label { font-size:14px; font-weight:700; }
.nq-cc-name-addr { font-size:11px; white-space:nowrap; color:var(--nq-cc-menu-muted, rgba(31,35,72,.6)); }
`;
