// Host branding for the mini wallet.
//
// TWO LAYERS, and the split is the whole design:
//
//   1. `--nq-cc-*` custom properties are the MECHANISM. Every colour the
//      control paints reads one, and each var holds a WHOLE value (a colour, a
//      shadow list, a background-image) rather than a component of one, so a
//      host can hand it a flat colour where Nimiq uses a radial and the rule
//      still makes sense. There is no ceiling on what they can express, and
//      every default is the Nimiq value it replaced, byte for byte.
//   2. `theme` is the FRONT DOOR: eleven semantic tokens that this file expands
//      into that var set. It exists because the honest answer to "how do I make
//      this match my brand" should not be "learn twenty-six variable names",
//      and because the expansion is real work — Nimiq's buttons are two-stop
//      radials with hand-tuned hover pairs, and deriving those from one brand
//      colour is exactly the kind of thing a package should do once.
//
// The two compose: `theme` is stamped inline on the mount root, so a host can
// pass the tokens AND still override any single var in its own stylesheet for
// the one thing the tokens do not reach. Set nothing and the control is Nimiq.
//
// Most tints are NOT here, on purpose. The muted text, the hover wash, the
// hairline, the scrollbar and the address well are all derived in CSS with
// color-mix() from the foreground and accent that a theme already sets, so they
// follow a brand without anyone naming them. What survives in this file is only
// what cannot be derived: a hue the shell has no way to guess.

/** Eleven tokens, all optional. Anything omitted stays Nimiq. */
export interface ShellTheme {
  /** Font stack for the whole control, face and menu. Nimiq ships Mulish and
   *  inherits nothing from the host, which is the single loudest tell that a
   *  control was dropped in from somewhere else. Pass `inherit` to take the
   *  host page's font. */
  font?: string;
  /** The signed-out Connect button: the primary call to action on every page a
   *  visitor lands on. Nimiq navy. */
  primary?: string;
  /** Label on `primary`. Default white, which is right for any brand dark
   *  enough to be a button ground and wrong the moment one is not. */
  primaryText?: string;
  /** The one colour that means ACT: Send, send-confirm, every focus ring, the
   *  input focus border, the copied-address tint and its tooltip, the contact
   *  chips. Nimiq light blue. */
  accent?: string;
  /** Label on `accent`. Default white. Hashmark is the case that forces it to
   *  exist: its brand colour is a lime bright enough that white text on it is
   *  unreadable, so the pair has to be nameable. */
  accentText?: string;
  /** The menu card. Every muted tone, hairline, hover wash and well is derived
   *  from `text` over this, so the pair is usually all a dark theme needs. */
  surface?: string;
  /** Text on `surface`. */
  text?: string;
  /** The language-only face pill, which sits on the HOST's header rather than
   *  on `surface` and so themes separately. Defaults to `surface`. */
  face?: string;
  /** Text and caret on `face`. Defaults to `text`. Set it with `face` or a
   *  dark pill hides its own caret. */
  faceText?: string;
  /** Send failures, and the Disconnect hover. Nimiq red. */
  danger?: string;
  /** The sent confirmation. Nimiq green. */
  success?: string;
  /** The wrong-network guard and the TESTNET badge; the guard's fill and ring
   *  are derived from it. Nimiq orange. */
  warning?: string;
}

/** `color-mix` and not a JS colour library: the input may be any CSS colour the
 *  host can write — a hex, an oklch, a `var()` pointing at their own design
 *  token — and only the browser can resolve that. It is already the file's
 *  baseline (the outline pill has mixed currentColor since v0.5.0), so this
 *  costs no support that was not already spent. */
const darken = (c: string, keep: number): string =>
  `color-mix(in srgb, ${c} ${keep}%, black)`;
const soft = (c: string, pct: number): string =>
  `color-mix(in srgb, ${c} ${pct}%, transparent)`;

/** A Nimiq button is a radial lit from the bottom-right corner. The far stop is
 *  the brand colour itself and the near stop is a shade of it, which is why one
 *  token is enough to build the pair.
 *
 *  Nimiq's own two pairs are hue SHIFTS, not shades (navy #1f2348 lifts to
 *  purple #260133, blue #0582ca to indigo #265dd7). Those stay as literal
 *  defaults in the stylesheet so the untouched control is pixel-exact; a host
 *  brand gets the shade, which reads as the same idiom without guessing at a
 *  hue the host never gave us. */
const radial = (near: string, far: string): string =>
  `radial-gradient(100% 100% at 100% 100%, ${near}, ${far})`;

/** Hover keeps ~68% of the base, measured off Nimiq's own hover pairs
 *  (#1f2348 → #151833 is .69, #260133 → #180021 is .64). */
const HOVER_KEEP = 68;
/** The near stop sits a TOUCH darker than the far one, so the corner reads lit
 *  without the button turning into a two-tone. Nimiq's own pair is close in
 *  lightness (#265dd7 next to #0582ca), and a bigger drop is loud on a bright
 *  brand: mixing lime toward black at 86% read olive across most of the fill. */
const NEAR_KEEP = 92;

/** Expand the tokens into the `--nq-cc-*` set. Pure, so the arithmetic is
 *  testable without a DOM — the same reason `menuShift` is a function. */
export function themeVars(theme: ShellTheme): Record<string, string> {
  const v: Record<string, string> = {};
  const set = (name: string, value: string | undefined): void => {
    if (value) v[name] = value;
  };

  set('--nq-cc-font', theme.font);

  if (theme.surface) {
    set('--nq-cc-menu-bg', theme.surface);
    // The raised "current" card is the surface itself sitting on the well,
    // which is the surface tinted with the foreground. That relationship is
    // what makes it read as raised, so it holds at any lightness.
    set('--nq-cc-card-bg', theme.surface);
  }
  if (theme.text) {
    set('--nq-cc-menu-fg', theme.text);
    set('--nq-cc-menu-muted', soft(theme.text, 60));
    set('--nq-cc-menu-hover', soft(theme.text, 6));
    set('--nq-cc-menu-line', soft(theme.text, 8));
  }

  // The face pill falls back to the card so a host that themes one gets both;
  // they differ only for an app whose header is not its menu surface.
  const face = theme.face ?? theme.surface;
  const faceText = theme.faceText ?? theme.text;
  set('--nq-cc-face-bg', face);
  set('--nq-cc-face-bg-hover', face);
  set('--nq-cc-face-fg', faceText);

  if (theme.primary) {
    set('--nq-cc-connect-bg', theme.primary);
    set('--nq-cc-connect-image', radial(darken(theme.primary, NEAR_KEEP), theme.primary));
    set(
      '--nq-cc-connect-image-hover',
      radial(
        darken(theme.primary, Math.round((NEAR_KEEP * HOVER_KEEP) / 100)),
        darken(theme.primary, HOVER_KEEP),
      ),
    );
  }
  if (theme.accent) {
    set('--nq-cc-accent', theme.accent);
    set('--nq-cc-send-bg', theme.accent);
    set('--nq-cc-send-image', radial(darken(theme.accent, NEAR_KEEP), theme.accent));
    set(
      '--nq-cc-send-image-hover',
      radial(
        darken(theme.accent, Math.round((NEAR_KEEP * HOVER_KEEP) / 100)),
        darken(theme.accent, HOVER_KEEP),
      ),
    );
  }

  set('--nq-cc-connect-fg', theme.primaryText);
  set('--nq-cc-send-fg', theme.accentText);

  set('--nq-cc-danger', theme.danger);
  set('--nq-cc-success', theme.success);
  if (theme.warning) {
    set('--nq-cc-warning', theme.warning);
    // A warning has to stay legible as a filled box, so its fill and ring are
    // the same hue washed most of the way out rather than an opacity, which
    // would let whatever is behind the menu bleed through the guard.
    set('--nq-cc-warn-bg', `color-mix(in srgb, ${theme.warning} 12%, white)`);
    set('--nq-cc-warn-line', `color-mix(in srgb, ${theme.warning} 22%, white)`);
  }

  return v;
}

/** Stamp a theme onto an element as inline custom properties.
 *
 *  Inline and not a generated stylesheet, for two reasons: two mini wallets on
 *  one page can carry different themes, and inline beats a rule, so `theme`
 *  reliably wins over any `--nq-cc-*` an app set earlier without the package
 *  having to reason about specificity. */
export function applyTheme(el: HTMLElement, theme: ShellTheme): void {
  const vars = themeVars(theme);
  for (const name of Object.keys(vars)) el.style.setProperty(name, vars[name]!);
}
