// The name row under the send sheet's recipient field.
//
// Type `gaston` and a row appears: the face, the name, the first blocks of the
// address it proves to. Tapping it fills the field with that address and moves
// to the amount step, where Back returns to the full address. A name never goes
// straight to the signer.
//
// No auto-advance on typing, unlike a 36-character address. An address is
// finished when it is long enough; a name is not: `gasto` might be registered
// too, and a sheet that jumped on the first hit would pay whoever holds the
// prefix.
//
// A DELEGATED answer is a different row, because the host behind `shop.gaston`
// picked the address and nothing proves it, and that host can choose an address
// whose first blocks match the one the sender expects. So the row shows all nine
// blocks and says the address is not verified, and only a tap on its own button
// continues. The amount sheet then shows the first three blocks, not the name;
// all nine were on this row before it.
//
// Pending, missing, undelegated and failed each get one grey line and nothing to
// tap, and so does text in name mode that cannot be queried at all, so the field
// never sits there saying nothing. See ../names for why each state is what it is;
// this file only draws them.

import type { I18n } from '../i18n';
import { addressIsVerified, isNameInput, nameQuery, type NameResolver } from '../names';
import { formatAddressBlocks } from './address-input';

/** How long typing must pause before a lookup. Each lookup is two resolver
 *  requests, so a keystroke-rate query would be ten per name. */
export const NAME_LOOKUP_DEBOUNCE_MS = 350;

/** How long text must sit before it is called unqueryable. Every address starts
 *  `n`, `nq`, and the row is a live region: said at keystroke rate, a screen
 *  reader user typing a valid address would be told it is invalid. Longer than the
 *  lookup debounce because the cost of waiting is a hint arriving late. */
export const NAME_INVALID_DELAY_MS = 800;

export interface NameLookupHandle {
  /** The name the field's address came from, when it came from one. */
  nameFor(compactAddress: string): string | null;
  /** The field was written from code, which fires no input event. Whatever the
   *  row holds or is waiting on was for the text that write replaced. */
  fieldWritten(): void;
  /** The sheet opened: forget the last pick and check what the field still
   *  holds. The field keeps its text across a close, a name as much as an
   *  address, so a name on screen gets its row back. */
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
  // `gasto` under a field that now says `gaston`.
  let ticket = 0;
  let picked: { name: string; address: string } | null = null;

  function note(key: string, name: string): void {
    const text = i18n.t(key, { name });
    // The row is a live region, so rewriting the same words says them again.
    const shown = row.firstElementChild;
    if (!row.hidden && shown?.className === 'nq-cc-name-note' && shown.textContent === text) return;
    row.hidden = false;
    row.textContent = '';
    const line = document.createElement('p');
    line.className = 'nq-cc-name-note';
    line.textContent = text;
    row.appendChild(line);
  }

  /** The keyboard takes half a phone. An answer nobody can see is no answer. */
  function reveal(el: HTMLElement): void {
    el.scrollIntoView?.({ block: 'nearest' });
  }

  function faceFor(address: string): HTMLElement | null {
    if (!opts.identicon) return null;
    const face = document.createElement('span');
    face.className = 'nq-cc-name-icon';
    face.appendChild(opts.identicon(address, 32));
    return face;
  }

  function labelFor(name: string): HTMLElement {
    const label = document.createElement('span');
    label.className = 'nq-cc-name-label';
    label.textContent = name;
    return label;
  }

  function offer(name: string, address: string): void {
    row.hidden = false;
    row.textContent = '';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nq-cc-name-hit';
    const face = faceFor(address);
    if (face) btn.appendChild(face);
    const text = document.createElement('span');
    text.className = 'nq-cc-name-text';
    const addr = document.createElement('span');
    addr.className = 'nq-cc-name-addr nq-cc-mono';
    const spaced = formatAddressBlocks(address).replace(/\n/g, ' ');
    addr.textContent = `${spaced.slice(0, 14)} ...`;
    text.append(labelFor(name), addr);
    btn.appendChild(text);
    btn.title = spaced;
    btn.setAttribute('aria-label', i18n.t('shell.payName', { name }));
    btn.addEventListener('click', () => {
      picked = { name, address };
      row.hidden = true;
      opts.onPick(spaced);
    });
    row.appendChild(btn);
    reveal(btn);
  }

  /** Not a button: reading it must not be one mis-tap from the amount sheet. */
  function offerUnverified(name: string, address: string): void {
    row.hidden = false;
    row.textContent = '';
    const box = document.createElement('div');
    box.className = 'nq-cc-name-unverified-box';
    const head = document.createElement('div');
    head.className = 'nq-cc-name-unverified-head';
    const face = faceFor(address);
    if (face) head.appendChild(face);
    const text = document.createElement('span');
    text.className = 'nq-cc-name-text';
    const warn = document.createElement('span');
    warn.className = 'nq-cc-name-unverified';
    warn.textContent = i18n.t('shell.nameUnverified');
    text.append(labelFor(name), warn);
    head.appendChild(text);
    const full = document.createElement('p');
    full.className = 'nq-cc-name-full nq-cc-mono';
    full.textContent = formatAddressBlocks(address);
    const go = document.createElement('button');
    go.type = 'button';
    go.className = 'nq-cc-name-continue';
    go.textContent = i18n.t('shell.nameUseAddress');
    // Starts with the visible words, so voice control can say what it sees (WCAG 2.5.3).
    go.setAttribute('aria-label', `${i18n.t('shell.nameUseAddress')}: ${name}. ${i18n.t('shell.nameUnverified')}`);
    go.addEventListener('click', () => {
      picked = null;
      row.hidden = true;
      opts.onPick(formatAddressBlocks(address).replace(/\n/g, ' '));
    });
    box.append(head, full, go);
    row.appendChild(box);
    reveal(box);
    reveal(go);
  }

  function clear(): void {
    row.hidden = true;
    row.textContent = '';
  }

  function check(): void {
    clearTimeout(timer);
    const query = nameQuery(field.value);
    ticket += 1;
    if (!query) {
      clear();
      if (isNameInput(field.value)) timer = setTimeout(() => note('shell.nameInvalid', ''), NAME_INVALID_DELAY_MS);
      return;
    }
    const mine = ticket;
    note('shell.nameChecking', query);
    timer = setTimeout(async () => {
      const got = await resolver.lookup(query);
      if (mine !== ticket) return;
      if (got.state === 'found') {
        if (addressIsVerified(got.verification)) offer(got.query, got.address);
        else offerUnverified(got.query, got.address);
      }
      else if (got.state === 'missing') note('shell.nameMissing', query);
      else if (got.state === 'pending') note('shell.namePending', query);
      else if (got.state === 'undelegated') note('shell.nameUndelegated', query);
      else if (got.state === 'nim-off') note('shell.nameNimOff', query);
      else note('shell.nameFailed', query);
    }, NAME_LOOKUP_DEBOUNCE_MS);
  }

  field.addEventListener('input', check);

  return {
    nameFor(compact) {
      return picked && picked.address === compact ? picked.name : null;
    },
    fieldWritten() {
      clearTimeout(timer);
      ticket += 1;
      clear();
    },
    reset() {
      picked = null;
      check();
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
/* A name wraps where the sender checks it. Cutting shop.gaston off at the dot
   would hide the parent, which is the part that says whose name this is. */
.nq-cc-party-name.nq-cc-mono.nq-cc-is-name { font-family:inherit; font-size:12px;
  white-space:normal; overflow:visible; overflow-wrap:anywhere; }
.nq-cc-name-row { width:100%; margin-top:10px; display:flex; justify-content:center; }
.nq-cc-name-row[hidden] { display:none; }
.nq-cc-name-note { margin:0; max-width:100%; font-size:12px; font-weight:600; text-align:center;
  overflow-wrap:anywhere; color:color-mix(in srgb, var(--nq-cc-menu-fg, #1f2348) 70%, transparent); }
.nq-cc-name-hit { display:flex; align-items:center; gap:10px; max-width:100%;
  padding:8px 14px 8px 8px; border:none; border-radius:500px; font-family:inherit; cursor:pointer;
  background:var(--nq-cc-menu-hover, rgba(31,35,72,.06)); color:var(--nq-cc-menu-fg, #1f2348); }
.nq-cc-name-hit:hover .nq-cc-name-label { color:var(--nq-cc-accent, #0582ca); }
.nq-cc-name-hit:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:2px; }
.nq-cc-name-icon { display:block; flex:none; width:32px; height:32px; }
.nq-cc-name-icon > * { display:block; width:100%; height:100%; }
.nq-cc-name-text { display:flex; flex-direction:column; align-items:flex-start; min-width:0; }
.nq-cc-name-label { font-size:14px; font-weight:700; text-align:left; overflow-wrap:anywhere; }
.nq-cc-name-addr { font-family:'Fira Mono',ui-monospace,monospace; font-size:11px; white-space:nowrap; color:var(--nq-cc-menu-muted, rgba(31,35,72,.6)); }
/* The wash and ring are the warning; the words are the foreground, so they stay
   readable on any surface a host themes. Nimiq orange as text is 2.18:1 on white. */
.nq-cc-name-unverified-box { width:100%; padding:12px; border-radius:10px;
  display:flex; flex-direction:column; gap:10px;
  background:color-mix(in srgb, var(--nq-cc-warning, #fc8702) 12%, transparent);
  box-shadow:inset 0 0 0 1.5px var(--nq-cc-warning, #fc8702); }
.nq-cc-name-unverified-head { display:flex; align-items:center; gap:10px; min-width:0; }
.nq-cc-name-unverified { font-size:12px; font-weight:700; color:var(--nq-cc-menu-fg, #1f2348); }
.nq-cc-name-full { margin:0; font-family:'Fira Mono',ui-monospace,monospace; font-size:13px; line-height:1.5;
  text-align:center; white-space:pre-line;
  color:var(--nq-cc-menu-fg, #1f2348); }
.nq-cc-name-continue { align-self:center; min-height:44px; padding:0 20px; border:none; border-radius:500px;
  font-family:inherit; font-size:13px; font-weight:700; cursor:pointer;
  background:var(--nq-cc-menu-hover, rgba(31,35,72,.06)); color:var(--nq-cc-menu-fg, #1f2348); }
.nq-cc-name-continue:focus-visible { outline:2px solid var(--nq-cc-accent, #0582ca); outline-offset:2px; }
`;
