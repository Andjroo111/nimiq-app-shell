// Two things are worth pinning about host branding, and neither is "does it
// set a variable".
//
//   1. An app that passes NO theme must be byte-identical Nimiq. Ten apps ship
//      the untouched control, so a derivation that shifts a tint by 1% is a
//      regression across the fleet with nobody to notice it.
//   2. The stylesheet must not grow a new hardcode. Every colour it paints has
//      to come from a var or be derived from one, because the list of things a
//      host cannot reach is exactly the bug this lane closes; the guard below
//      is what stops it reopening one property at a time.
import { describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { applyTheme, themeVars } from './theme';
import { mountMiniWallet, type CornerControlOptions } from './corner-control';
import { createI18n } from '../i18n';
import { shellLocales } from '../locales';

describe('themeVars', () => {
  test('an empty theme stamps nothing, so Nimiq stays the default', () => {
    expect(themeVars({})).toEqual({});
  });

  test('surface and text light up every derived menu tone', () => {
    const v = themeVars({ surface: '#0b2b26', text: '#e6f4f1' });
    expect(v['--nq-cc-menu-bg']).toBe('#0b2b26');
    expect(v['--nq-cc-menu-fg']).toBe('#e6f4f1');
    // muted, hover and hairline are the point: a host names two colours and the
    // control stops looking like it was pasted in from a light page.
    expect(v['--nq-cc-menu-muted']).toContain('#e6f4f1');
    expect(v['--nq-cc-menu-hover']).toContain('#e6f4f1');
    expect(v['--nq-cc-menu-line']).toContain('#e6f4f1');
  });

  test('the raised current card is the surface, because the well is the tint', () => {
    expect(themeVars({ surface: '#0b2b26' })['--nq-cc-card-bg']).toBe('#0b2b26');
  });

  test('the face pill follows the surface until it is named separately', () => {
    expect(themeVars({ surface: '#0b2b26' })['--nq-cc-face-bg']).toBe('#0b2b26');
    expect(themeVars({ surface: '#0b2b26', face: '#fff' })['--nq-cc-face-bg']).toBe('#fff');
  });

  test('one brand colour builds the button, its lit corner and its hover', () => {
    const v = themeVars({ primary: '#0f766e' });
    expect(v['--nq-cc-connect-bg']).toBe('#0f766e');
    expect(v['--nq-cc-connect-image']).toStartWith('radial-gradient(100% 100% at 100% 100%');
    expect(v['--nq-cc-connect-image']).toContain('#0f766e');
    // hover is darker than rest, which is the only relationship that has to hold
    expect(v['--nq-cc-connect-image-hover']).toContain('68%, black');
  });

  test('accent is one token reaching Send, the rings and the copy tint', () => {
    const v = themeVars({ accent: '#14b8a6' });
    expect(v['--nq-cc-accent']).toBe('#14b8a6');
    expect(v['--nq-cc-send-bg']).toBe('#14b8a6');
    expect(v['--nq-cc-send-image']).toContain('#14b8a6');
  });

  test('a warning carries its own fill and ring, not an opacity', () => {
    const v = themeVars({ warning: '#b45309' });
    expect(v['--nq-cc-warning']).toBe('#b45309');
    // washed toward white rather than made transparent: a translucent guard
    // would let the menu behind it bleed through the one box that must be read.
    expect(v['--nq-cc-warn-bg']).toContain('white');
    expect(v['--nq-cc-warn-line']).toContain('white');
  });

  test('a token may be any CSS colour, including the host own var', () => {
    const v = themeVars({ accent: 'var(--brand-teal)' });
    expect(v['--nq-cc-send-image']).toContain('var(--brand-teal)');
  });
});

describe('applyTheme', () => {
  test('stamps inline, so it beats a rule the app set earlier', () => {
    const win = new Window();
    const el = win.document.createElement('div') as unknown as HTMLElement;
    applyTheme(el, { accent: '#14b8a6', font: 'inherit' });
    expect(el.style.getPropertyValue('--nq-cc-accent')).toBe('#14b8a6');
    expect(el.style.getPropertyValue('--nq-cc-font')).toBe('inherit');
  });
});

describe('the mounted control wears the theme', () => {
  const mount = (theme?: Parameters<typeof applyTheme>[1]) => {
    const win = new Window();
    const doc = win.document as unknown as Document;
    const prevDoc = globalThis.document;
    (globalThis as { document?: Document }).document = doc;
    try {
      const host = doc.createElement('div');
      doc.body.appendChild(host);
      const i18n = createI18n({ locales: shellLocales, initial: 'en' });
      const opts = { i18n, ...(theme ? { theme } : {}) } as CornerControlOptions;
      mountMiniWallet(host as unknown as HTMLElement, opts);
      return { doc, root: host.querySelector('.nq-cc') as unknown as HTMLElement };
    } finally {
      (globalThis as { document?: Document }).document = prevDoc;
    }
  };

  test('no theme leaves the root free of inline vars', () => {
    const { root } = mount();
    expect(root.getAttribute('style')).toBeNull();
  });

  test('a theme lands on the root, where the menu inherits it', () => {
    const { root } = mount({ surface: '#0b2b26', text: '#e6f4f1', accent: '#14b8a6' });
    expect(root.style.getPropertyValue('--nq-cc-menu-bg')).toBe('#0b2b26');
    expect(root.style.getPropertyValue('--nq-cc-accent')).toBe('#14b8a6');
  });
});

describe('the stylesheet has no colour a host cannot reach', () => {
  const sheet = (): string => {
    const win = new Window();
    const doc = win.document as unknown as Document;
    const prevDoc = globalThis.document;
    (globalThis as { document?: Document }).document = doc;
    try {
      const host = doc.createElement('div');
      doc.body.appendChild(host);
      mountMiniWallet(host as unknown as HTMLElement, {
        i18n: createI18n({ locales: shellLocales, initial: 'en' }),
      } as CornerControlOptions);
      return doc.getElementById('nimiq-shell-corner-control-style')!.textContent ?? '';
    } finally {
      (globalThis as { document?: Document }).document = prevDoc;
    }
  };

  test('every brand colour is a var default or a mix of one', () => {
    const css = sheet();
    expect(css.length).toBeGreaterThan(1000);
    const unexpected = unreachableColours(css);
    expect(unexpected).toEqual([]);
  });

  // The guard has to be able to FAIL, and a regex soup here could not: a lazy
  // "var(--x, … ))" pattern spans from one rule to a closing pair several rules
  // later and swallows whatever sits between, so an injected hardcode vanished
  // instead of being caught. Balanced parens are the only honest read.
  test('the guard catches a hardcode that is not inside a var or a mix', () => {
    expect(unreachableColours('.a { color:#ff00aa; }')).toEqual(['#ff00aa']);
    expect(unreachableColours('.a { color:var(--x, #ff00aa); }')).toEqual([]);
    expect(
      unreachableColours('.a { background:var(--x, radial-gradient(50% 50%, #ff00aa, #00ff00)); }'),
    ).toEqual([]);
    expect(unreachableColours('.a { color:color-mix(in srgb, var(--x, #123456) 6%, transparent); }'))
      .toEqual([]);
    // and a hardcode sitting AFTER a var() on the same declaration is still one
    expect(unreachableColours('.a { color:var(--x, #123456); border-color:#ff00aa; }'))
      .toEqual(['#ff00aa']);
  });
});

/** Colour literals a host has no way to override: everything except a var()
 *  fallback (which IS the default), a color-mix() (which derives from a var),
 *  a comment, a neutral rgba(0,0,0,…) elevation shadow, and the tooltip's
 *  navy-tinted elevation, which is a shadow rather than a brand colour. */
function unreachableColours(css: string): string[] {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const shields = (s: string[]): boolean => s.includes('var') || s.includes('color-mix');
  let out = '';
  const stack: string[] = [];
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i]!;
    if (ch === '(') {
      const before = shields(stack);
      stack.push(/([a-z-]+)$/.exec(src.slice(0, i))?.[1] ?? '');
      // keep the paren of an UNSHIELDED call, so rgba(…) still reads as one
      if (!before && !shields(stack)) out += ch;
      continue;
    }
    if (ch === ')') {
      const inside = shields(stack);
      stack.pop();
      if (!inside) out += ch;
      continue;
    }
    if (!shields(stack)) out += ch;
  }
  const found = out.match(/#[0-9a-fA-F]{3,8}|rgba?\(\d[^)]*\)|oklch\([^)]*\)/g) ?? [];
  return found.filter(
    (c) => !/^rgba\(0,0,0,[^)]*\)$/.test(c) && !/^rgba\(31,35,72,\.[0-9]+\)$/.test(c),
  );
}
