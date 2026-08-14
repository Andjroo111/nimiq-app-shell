// The recipient field, as the wallet types it: nine four-character blocks in a
// 3x3 grid, not one long line.
//
// Ported from the registry's `address-input` (the wallet's own send modal). The
// LOOK and the BEHAVIOUR come across; the rem values do not. That component is
// 24px type in a 228px box built for a 420px SmallPage, and this menu is 272px
// wide, so copying its numbers would make the recipient field the loudest thing
// on the card. Scaled to the menu, per Andrew, 2026-08-14.
//
// ONE textarea, not nine inputs. The registry makes the same choice and it is
// the right one: a single caret, so selection, paste, undo and a screen reader
// all behave the way they do in any text field. Nine inputs would need
// hand-written auto-advance, backspace-to-previous and paste-spreading, and
// would read as nine fields to anyone not looking at it.
//
// THE COLUMNS ARE MEASURED IN `ch`, WHICH IS THE WHOLE TRICK. A formatted line
// is exactly 14 characters ("XXXX XXXX XXXX"), so in any monospace font the
// blocks land at the same FRACTIONS of the line no matter which one actually
// loaded. The registry's px/rem geometry drifts the moment Fira Mono is missing
// and the fallback's advance differs, which the nimiq-ui skill calls out by
// name as why address grids "look wonky". This cannot drift.

/** 36 chars: NQ + 2 check digits + 32 of Nimiq's base32 alphabet. */
export const NIM_ADDRESS_LENGTH = 36;

/** Everything that survives typing: the characters, upper-cased, capped at an
 *  address. Spaces, dashes and a pasted `nimiq:` URI prefix all fall away. */
export function significantChars(raw: string): string {
  return raw
    .replace(/^\s*(?:nimiq:)?/i, '')
    .replace(/[^0-9A-Za-z]/g, '')
    .toUpperCase()
    .slice(0, NIM_ADDRESS_LENGTH);
}

/** Lay the significant characters out as up to three lines of three blocks.
 *  Partial input formats too, so the grid builds up as you type rather than
 *  snapping into place at the 36th character. */
export function formatAddressBlocks(raw: string): string {
  const chars = significantChars(raw);
  const blocks = chars.match(/.{1,4}/g) ?? [];
  const rows: string[] = [];
  for (let i = 0; i < blocks.length; i += 3) rows.push(blocks.slice(i, i + 3).join(' '));
  return rows.join('\n');
}

/** Where the caret belongs after reformatting, given how many significant
 *  characters were behind it.
 *
 *  Reformatting on every keystroke rewrites the whole value, and a textarea
 *  puts the caret at the end when you do that. Typing into the middle of an
 *  address then throws you to the end on every character, which is the failure
 *  that makes a formatted field unusable. Counting in significant characters
 *  and mapping back is the fix; both halves are pure so the mapping is testable
 *  without a DOM. */
export function caretForSignificant(formatted: string, count: number): number {
  if (count <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i += 1) {
    if (/[0-9A-Z]/.test(formatted[i]!)) {
      seen += 1;
      if (seen === count) return i + 1;
    }
  }
  return formatted.length;
}

/** Significant characters at or before `caret` in `raw`. */
export function significantBefore(raw: string, caret: number): number {
  return significantChars(raw.slice(0, caret)).length;
}

/** Reformat a textarea in place, keeping the caret where the typist left it. */
export function reformatInPlace(field: HTMLTextAreaElement): void {
  const caret = field.selectionStart ?? field.value.length;
  const count = significantBefore(field.value, caret);
  const next = formatAddressBlocks(field.value);
  if (next !== field.value) field.value = next;
  const at = caretForSignificant(next, count);
  field.setSelectionRange(at, at);
}
