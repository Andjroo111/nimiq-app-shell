# nimiq-app-shell, next session

## What this is

The **mini wallet**: the fleet's one header control. `mountMiniWallet` is the
canonical export; `mountCornerControl` is kept as an alias because ~25 apps
import that name.

**Current: v0.20.3**, tagged and on jsDelivr:
`https://cdn.jsdelivr.net/gh/Andjroo111/nimiq-app-shell@v0.20.3/dist/app-shell.js`

**All 19 fleet apps pin v0.20.3.** No split, and the pin is deliberate: see
"How the fleet takes an update" below before proposing a floating tag.

## Playground, the way to see any of this

```bash
bun run playground     # builds dist/, serves http://localhost:4321
```

Blank page, mini wallet in a navy header and a light one, every seam as a live
switch. Mock wallet by default, so every state is reachable with no Hub, no
chain and no network. The failure modes are switchable too: a throwing reader, a
slow read, an unpriced asset, and the three send outcomes.

**Use 127.0.0.1, not localhost**, when driving it with Playwright. The IPv6
route makes `page.goto` time out while curl works fine, which reads as a broken
page for a while.

## Shipped 2026-08-14 and 08-15

| Release | What |
| --- | --- |
| v0.19.0 (#143) | host branding: the `--nq-cc-*` layer finished, plus a `theme` option. Written up below. |
| v0.19.1 (#144) | the playground can deep-link a state, which is what made the menu lintable at all |
| v0.19.2 (#145) | a saved recipient was a 23px tap target |
| v0.20.0 (#146) | the send and receive screens are the wallet's own: the 3x3 recipient grid, a recipient identicon, a built-in QR |
| v0.20.1 (#148) | the report-bug glyph: legs and antennae that reach the shell, and the right size beside the hexagon |
| v0.20.2 (#149) | the report-bug glyph goes SOLID: filled body, negative-space seam, a head whose underside arcs with the shell |
| v0.20.3 (#151) | switch account's stroke 0.72 → 1.28, so it reads at the solid bug's weight |

**⚠ THE SWITCH-ACCOUNT SHAPE IS ANDREW'S AND DOES NOT MOVE.** He asked for it to "go solid
too" alongside the bug; a filled version was drawn and rejected the moment he saw it
("I like the arrows that I originally created", 2026-08-15). Every solid reading of a hexagon
either loses the two arrows (a filled hex with a seam is a hexagon with a minus sign) or turns
the cut ends into ragged notches. The mismatch was WEIGHT, and weight is all that moved. If
this comes up again, change the stroke, never the path.

The bug glyph is visible in exactly ONE app: `nimiq.work` is the only repo in the fleet that
wires `reportBug` at all.

### What the review rounds on v0.20.0 changed

Andrew drove the running playground and called these, in order:

- **A title is not a back button.** The sub-views used their own name as the way
  out ("< Send"). Now a bare chevron left, the name centred, on a three-column
  grid so the title centres on the CARD. New `shell.back` in all 13 locales.
- **The two icon rows were different weights, and it was the icons, not the
  type.** Both labels measured 600/14px in the same colour. Report a bug drew at
  1.6px while the cashlink and switch glyphs drew at 0.94, because it is stroke
  1.6 on a 24 viewBox and they are 2.5 on a 64.
- **The bug glyph was also SMALLER.** getBBox put its artwork at 18x16 inside
  the 24x24 box it declared, rendering 18x16 beside a hexagon rendering
  20.5x20. Cropping the viewBox to the artwork's bounds fixed it, and its
  stroke had to come DOWN to hold the same weight at the bigger crop.
- **Switch account is the hexagon itself**, Andrew's drawing: the shipped
  outline path cut at its left and right points into two halves, each ending in
  an arrowhead, each stopping 0.9 short so the break reads at 24px.
- **A FILLED glyph ended the leg-join problem outright.** An outline bug is a diagram, and
  every join in it is a detail somebody has to get right; a silhouette has no joins. The seam
  is negative space between two half ellipses, so it stays one crisp width at any size, and
  the limbs start INSIDE the fill so their joins are hidden. If another hand-drawn glyph starts
  costing rounds, that is the move.
- **The bug glyph took five rounds before that, all of them found by ZOOMING.** Legs that
  floated 1.1 units off the shell; then an inset that fixed the float and gave
  every leg a cap nub; then a crop that was rendering it smaller than the
  hexagon; then a ladybug that was rejected for a plain bug out of six drawn
  together; then legs and antennae swapped, because a leg joints ONTO the shell
  and a feeler comes out from UNDER it. None of it is visible at 24px. If a
  glyph changes again, draw it at 150 and look, and draw the alternatives beside
  it rather than one at a time.
- **There is no bug in the official asset library** (searched bug, beetle,
  ladybug, insect, feedback, report), so this glyph is hand-drawn and will stay
  a judgement call. Andrew's read on the six: "none of them are great". The
  honest fix is a commissioned registry icon, not another redraw here.
- ⚠ **THE PLAYGROUND WAS RESTYLING THE COMPONENT IT EXISTS TO SHOW.** A bare
  `label { display: flex }` for its own control rows leaked into the mounted
  mini wallet, so a correctly centred label rendered left HERE and would have
  been right in every real app. Both ends fixed: the playground scopes its rule,
  and the component declares `display` on its own labels. Assume nothing about
  bare element selectors on a host page.

## Shipped 2026-08-13

Eleven releases, v0.11.0 → v0.17.1.

| PR | What |
| --- | --- |
| #117 | mini wallet naming, the playground, and the mount read `mountAssetList` never did |
| #126 | corrected the BTC example, the rename spec and the onboard row |
| #129 | per-asset receive, and the chain named where the decision is made |
| #128 | switch account, saved recipients, balances that do not outlive an address |
| #130 | an asset with no address of its own must not open receive |
| #131 | `switchAccount: false`, for wallets whose `connect()` is not a picker |
| #132 | 11 languages by default (was 5), and Mexico from 80 KB to 7 KB |
| #133 | every currency the wallet offers now has a flag |
| #134 | flag letterboxing, and a scroll fade |
| #135 | a chevron, because the fade alone was not read |
| #136 | the six offered languages that did nothing now translate |
| #137 | the Switch account row had no glyph, so it hung left of its neighbours |

Registry: `nimiq-branding-cli` #30 (rename/onboard notes) and #31 (the
`address-display` ethereum format silently truncated any non-42 address).

## The fleet sweep, issue #112, CLOSED 2026-08-14

**All 19 apps converted, merged and deployed. Every one is on v0.20.1.** There is
no split version left in the fleet.

**splitlink is not a nineteenth app.** `Andjroo111/splitlink` was RENAMED to
`Andjroo111/nimiq.party`; the GitHub API redirects, and `~/gdkc/projects/splitlink`
is a stale local clone of that same repo whose `origin` still points at
nimiq.party. Its five chrome files were byte-identical to party's, which is what
gave it away. 20 becomes 19, and party #176 covered it.

**nimmesh is out of the sweep** (Andrew, 2026-08-14): it is a wallet, and a wallet
does not wear the mini wallet. Same reason `nimiq.ninja/app` was always excluded
while its landing converted.

| Model | Apps | Work per app |
| --- | --- | --- |
| CDN | cards, gives, ninja, software, stream, swellet, vote | one URL + one mount call |
| Bundled | casino, life, work | dep bump + mount swap |
| Vendored | party, cool, gift, money, name, talk, tax, tips | bump **and rebuild the committed bundle**, or it is a no-op live |
| Hand-vendored | sale | replace `public/js/vendor/app-shell.js` with the dist; no dep, no build script |

Merged PRs: gift #56, money #58, name #34, talk #52, tips #130, tax #23, vote #91,
sale #115, gives #58, ninja #108, software #65, stream #48, work #129, swellet #99,
casino #31, life #39, party #176.

**The nine that had sat on v0.18.2 were split before merge, on the evidence.**
Everything v0.18.2→v0.20.1 changed lands on the SEND and RECEIVE screens, and
`viewHeader` is called by those two views alone. So the five language-only apps
merged as-is; only the four with a wallet were re-pinned. If it comes up again,
the test is whether the mount call passes `wallet`.

### What the conversion cost, per app

Traps that were not in the v0.18.2 round:

- ⚠ **A clip box on the mount's ancestor hides the menu, and it looks like a
  no-op.** `nimiq.name`'s `.lang-slot` carried `overflow:hidden` to contain the old
  flag row's overscan; `nimiq.sale`'s `.app-bar` carries it on a 52px bar. Both
  cut the menu to whatever falls inside. sale's was hiding the OLD wallet pill's
  dropdown too and nobody had noticed, because a profile card nobody opens looks
  fine shut. The menu measures correctly in `getBoundingClientRect` while being
  invisible, so only a screenshot catches it.
- **A shorthand `padding` beats a shared utility class at equal specificity.**
  `nimiq.tax`'s `.site-header` carries `.site-header` AND `.wrap`; writing
  `padding: var(--space-3) 0` silently dropped `.wrap`'s horizontal gutter and ran
  the header edge to edge. Invisible behind a small Connect button; obvious the
  moment a wide pill lands flush against the screen.
- **`--nq-flag-w` is language-switcher-only.** The mini wallet never reads it, so
  every per-page override sizing the old flag row becomes dead code that still
  reads as deliberate. nimiq.tips had seven.
- **`MiniAppProvider` gained a required `sign()`** between v0.1.0/v0.2.0 and
  v0.20.0. Any test fake of that shape needs one; nothing calls it.
- **Service-worker caches are load-bearing on this change, not hygiene.** money v4→v5,
  vote nv-v1→nv-v2, sale v45→v46. A returning visitor otherwise keeps the precached
  old bundle and mounts a control into slots the same commit removed.
- ⚠ **sale's shell fingerprint has to be refreshed AFTER the last shell edit.** I
  refreshed it, then edited `app.1.css` again, and shipped a hash describing the
  shell one edit ago. CI caught it. Re-run `bun test` as the final step, not the
  middle one.
- **tips has NINE pages with chrome**, each with its own slot id and inline sizing.
  Grep the whole `public/`, never just `index.html`.

### Where a wallet is deliberately NOT passed

`mountMiniWallet` renders language-only without a wallet, and three apps use that
on purpose. Do not "fix" these by handing them one:

- **gift** has no wallet at all: the service mints the cashlink, the claim page
  hands off to the Hub.
- **tips** would otherwise grow a Connect pill competing with the one action the
  fan page exists for; the tip resolves its account at Hub checkout. Its profile
  widget only ever mounted in-app, which is exactly the mode the fleet control
  treats the wallet as ambient.
- **vote** never connects one: a poll is a link, and governance weight is read from
  the chain by address.

### Host branding, and which apps need it

Andrew, 2026-08-15: *"some of my apps are gonna need their own branded version."*

**swellet is the worked example, and it was HALF done.** Its `--nq-cc-*` block
themed the menu (card, ink, hairlines, focus ring) and never touched the buttons.
Connect kept painting fleet navy, which is the one part of the control a
first-time visitor looks at. swellet #100 adds `--nq-cc-connect-*` and
`--nq-cc-send-*` from `var(--nq-blue-grad)`, the app's own CTA gradient.

- **Theme through the `--nq-cc-*` vars, not the `theme` option, when an app
  already has a var block.** `theme` is stamped INLINE, so it beats a stylesheet
  rule for anything it touches. The vars also reach three values the tokens do
  not: the menu border, its shadow, and the card tint.
- **A gradient cannot be `color-mix`'d**, so a hover pair has to be stated rather
  than derived. 68% of each stop is the ratio Nimiq's own pairs use.
- **Pass `var()` references, not hex**, for anything that should follow a
  light/dark toggle. swellet's menu follows `--nq-card` / `--nq-navy`; its buttons
  deliberately do not, because its own primary button does not either.

### Earlier rounds, kept for the traps

From the v0.18.x round. The apps are all converted now, but these still describe
how each model behaves.

#### What the CDN six actually cost

Four were the advertised one-liner. Two were not:

- **stream carried the block on four pages**, not one. Grep the whole `public/`,
  never just `index.html`.
- **ninja found a real app-shell bug.** The menu is right-anchored at a fixed
  272px. ninja is the first app to put anything (a CTA) to the pill's right, so
  the card ran off the left edge at every phone width. Every app converted before
  it happened to put the pill hard right. Fixed in #140 (v0.18.1). If the
  next app puts the pill mid-header, it is already handled; if it puts it inside
  a scroll container or a transformed ancestor, measure again.
- **Version bumps are per-repo law.** gives, software, stream and swellet each
  require a `package.json` bump plus a CHANGELOG entry per PR. ninja requires
  neither. Read the repo's own CLAUDE.md first.

#### And what the bundled three cost

All three were on the git dep `#v0.2.0`, a sixteen-release jump to `#v0.18.1`.
`tsc --noEmit` was clean in all three across that jump, so the package's shape
has not drifted.

- **casino and life had TWO controls** (`#lang-pill` + `#wallet-slot`), so they
  consolidate like swellet. Both parents are flex rows with a `gap`, so the
  emptied `#lang-pill` div has to be **removed**, not left behind, or it leaves a
  hole. work had one control and was a straight rename.
- **The bigger bundle can break a file-size guard.** casino commits its minified
  `public/dist/chrome.js`, and v0.18.1's inlined flag artwork took it from under
  800 lines to 842. Excluded `public/dist/` from its guard, which is what
  nimiq.life's own CI already did. Expect this in any repo that commits a
  minified bundle and counts lines on it.
- **An app can offer more languages than it translates.** nimiq.life renders 5
  (`lifeLocales`) and its picker offered 11, now 13. Preserve whatever the app
  chose rather than narrowing it: ninja filters to 4 on purpose, swellet to 5,
  life defaults. Narrowing uninvited is a product change.

#### The vendored batch, worked through party

`git remote -v` FIRST in every vendored repo. That is how splitlink turned out to
be nimiq.party renamed, and a push would have fought party's own branch.

- **The vendored apps are on an older chrome than the CDN ones were.** They mount
  `mountLanguageSwitcher` + `mountProfileWidget`, not `mountLanguagePill` +
  `mountWalletPill`. Both old names still export from v0.18.1, so a bump alone
  compiles and changes nothing, which is the trap.
- **Most of the work is deleting the app's own code.** party hand-rolled a
  Connect button, its connecting/retry text, and a profile re-mount on every
  account change, because the old chrome was two components and neither owned the
  signed-out state. The mini wallet owns that swap. Keep only what the shell
  cannot know: party mirrors the connected account into `state` as the app's
  identity.
- ⚠ **Do not "tidy" that mirror into clearing on disconnect.** `boot()` falls back
  to a demo account and `split-entry.js` dereferences `state.account.address`, so
  clearing throws instead of degrading. I wrote that bug and caught it reading the
  call sites.
- **A wider pill can wrap.** party's `.app-header` wraps, and the mini wallet is
  wider than the old Connect button, so on a phone it takes its own line and
  `margin-left:auto` has nothing to push against. `.shell-chrome` needed
  `flex: 1 1 auto`. Only the browser catches this.
- ⚠ **party and splitlink CI grep the built bundle for API symbols**, including
  the two mount names that just went away, so the guard fires on exactly this
  change. The marker list has to move with the API. **The Mac-mini `gh` token has
  no `workflow` scope**, so that edit cannot be pushed: `gh auth refresh -s
  workflow` first. party #176 is red for this reason alone and carries the exact
  diff in a comment.

## Host branding, SHIPPED in v0.19.0 (#143)

Andrew, 2026-08-14: *"if the person installs it onto their app, they should be
able to also make it match their branding"*. Two layers, and the split is the
design.

**The vars are the mechanism.** Every painted value reads a `--nq-cc-*` whose
default is the Nimiq value it replaced, so the ten apps on the untouched control
are unchanged. Each var holds a WHOLE value rather than a component, so
`--nq-cc-connect-image` can be a flat colour where Nimiq uses a radial.

**Most tints were never brand colours.** `rgba(31,35,72,.06)` IS `#1f2348` at
6%, and that IS the default `--nq-cc-menu-fg`, so it is now a `color-mix` of
that var: identical untouched, and it follows the foreground the moment a host
themes one. The address well, currency grid, scrollbar, hairlines and hover wash
came along without being named. Same for the light-blue washes at 8% and 12% of
`--nq-cc-accent`. That is why the token layer is eleven wide rather than thirty.

**`theme` is the front door**: `font`, `primary`/`primaryText`,
`accent`/`accentText`, `surface`, `text`, `face`/`faceText`, `danger`,
`success`, `warning`. Stamped INLINE on the mounted element, so two mini wallets
on a page can differ and `theme` beats a rule an app set earlier.

Worth knowing before touching it again:

- **`accentText` exists because hashmark forced it.** Its lime is bright enough
  that white on it is unreadable, and nothing shipping in CSS picks a readable
  label colour from an arbitrary one. `color-contrast()` is still not there.
- **The report-bug sheet PORTALS to `document.body`**, so it cannot inherit vars
  stamped on the control. `ReportBugOptions.theme` takes them and the corner
  forwards its own. Any future portal has the same problem.
- **The near stop of a themed radial is 92% of the brand, not 86%.** Nimiq's own
  pair is close in lightness (`#265dd7` beside `#0582ca`); a bigger drop turned
  hashmark's lime olive across most of the fill.
- **`rgba(255,255,255,0)` in the grid fade was a bug on any non-white surface.**
  It is a workaround for a browser bug that is gone; gradients interpolate in
  premultiplied alpha, so plain `transparent` is both correct and theme-following.
- **The guard is `theme.test.ts`**, which reads the stylesheet and fails on any
  colour literal outside a var fallback or a `color-mix`. Its first shape COULD
  NOT FAIL: a lazy `var(--x, … ))` regex spans from one rule to a closing pair
  several rules later and swallowed an injected hardcode. It parses balanced
  parens now, and a test asserts it catches one. Do not simplify it back.

The playground has all three brands as a switch and repaints its strips with
them. `bun run playground`, then Host brand.

**All 19 sweep apps are on v0.20.1 as of 2026-08-14**, so theming is available
fleet-wide. Only swellet uses it (#100). Every other app paints Nimiq navy/gold/
light-blue as its actual identity, so the untouched default is correct for them.

## How the fleet takes an update

**Decided 2026-08-15: everything stays PINNED.** Andrew asked whether a future
release could move all 19 apps on its own. It cannot,
and the answer is not "not yet", it is "the mechanism only reaches a third of them".

**The fleet consumes this package two ways:**

- **7 apps fetch at RUNTIME from jsDelivr** (cards, gives, ninja, software, stream,
  swellet, vote). jsDelivr does resolve floating refs for this repo, verified:
  `@v0.20`, `@v0.20.x` and `@latest` all return 200 and served v0.20.3 within
  minutes of the tag. So these could float.
- **12 apps BAKE the shell into their own committed artifact** (casino, life, work,
  party, cool, gift, money, name, talk, tax, tips, and sale's hand-copied dist). No
  version syntax reaches them. Even a floating dep only lands at the next install,
  rebuild and deploy.

**Decision: keep every app pinned** (Andrew, 2026-08-15, "pinned it is"). Two reasons,
both worth re-reading before anyone reopens this:

1. Floating solves 7 of 19 and permanently splits the fleet into two update models.
   Today every app moves the same way, which is why the v0.20.3 sweep was one pass.
2. The blast radius is wrong for the mechanism. A glyph shipped today; the same pipe
   carries the SEND screen. A floating pin puts a bad tag on seven live apps with no
   PR, no CI in those repos, no review, and no rollback but another tag. cool's CI
   greps its built bundle for API symbols precisely because this fleet has been bitten
   by silent shell drift.

The usual counter-argument, that urgent fixes land instantly, is weak here: the shell
has no auth, no secrets and no network calls of its own. It is chrome.

**What to build instead of floating:** a committed `scripts/bump-fleet.sh` that does
what the v0.20.3 pass did by hand. Loop the repos, bump the pin, install, rebuild the
committed artifact, run that repo's own gates, apply its version-and-CHANGELOG law,
open the PR. The pin was never the bottleneck; the rebuilds and the per-repo law were.
NOT BUILT YET, and Andrew has not asked for it.

### What the v0.20.3 sweep cost

- **Per-repo law is not uniform.** cards, gives, software, stream, swellet, money,
  tips, casino, life, work, party and talk each need a `package.json` bump AND a
  CHANGELOG entry. ninja, vote, gift, name and tax need neither. Read the repo.
- **ninja keeps its app under `app/`**, not `public/`. A `grep public src` misses it and
  reports "no change" while doing nothing.
- **stream carries the URL on four pages**, tips on nine. Never just `index.html`.
- **life, work and talk have GITIGNORED bundles**, so the bump is package.json only and
  nothing to commit. Build anyway and check the artifact carries the change, or a
  broken dep resolution looks identical to a clean no-op.
- ⚠ **cool is a contested clone.** A parallel session merged #209 mid-flight and both
  sides had rebuilt `public/vendor/app-shell.js`. Resolve a built artifact by
  REGENERATING it, never by picking a side. cool also had 19 failing tests that came in
  with #209; confirmed by stashing, they are not the bumper's.
- ⚠ **macOS `/bin/bash` is 3.2 and has no associative arrays.** `declare -A` fails
  silently enough that a commit loop reports success while committing nothing. Use a
  `case`, and verify with `git log` rather than the loop's own echo.

## What the Hub will not allow

Read from `nimiq/hub@master` `src/lib/RpcApi.ts`, not from doc comments.
Third-party whitelist: CHECKOUT, SIGN_TRANSACTION, SIGN_STAKING, SIGN_MESSAGE,
CHOOSE_ADDRESS, CREATE_CASHLINK, MANAGE_CASHLINK, CONNECT_ACCOUNT,
SIGN_POLYGON_TRANSACTION.

Everything else is refused, including RENAME, EXPORT, ADD_ADDRESS, LOGOUT, LIST
and ONBOARD. They all extend `SimpleRequest`, which needs an `accountId`, and
`chooseAddress` never returns one. That single fact is the root cause.

**BTC is shut deliberately.** `SIGN_BTC_TRANSACTION` is commented out, and worse
for us, `chooseAddress` returns a different unused BTC address every call, so a
balance read against it is not the user's balance. BTC through the Hub is
unreadable as well as unsendable. Issue #124 has the three routes.

## Lessons that cost real time here

- **The CSS lives in a JS template literal.** A backtick in a comment turns the
  whole stylesheet into a tagged-template call. `tsc` and the tests both catch
  it; skipping straight to the browser does not.
- **A NUL byte in `src/flags/data.ts` since v0.10.0** made `grep` treat the file
  as binary, so searching it silently returned nothing. Stripped in #130.
- **Flag artwork was 45% of the bundle**, and one flag (Mexico) was 37% of it.
  Coat-of-arms flags rasterise to ~5 KB with no visible loss at 26px.
  `gen-flags.mjs` now throws on a rasterized flag rather than re-inlining it.
- **Two art sources means two aspect ratios.** nimiq.tech is 1:1, flag-icons 4x3
  is 1.333:1, and assuming 1:1 letterboxes the wide ones inside the hexagon.
  `FLAG_ASPECT` is generated from each viewBox now, so it cannot drift again.
- **iOS ignores `::-webkit-scrollbar` entirely.** A styled scrollbar is invisible
  there until a finger is already moving, which is why the grids needed a
  chevron rather than just a fade.
- **A test asserting `ships 5 locales`** is what let six offered languages do
  nothing for eleven versions. It now asserts every language the picker OFFERS
  has strings.
- **`right:0` is not a position, it is an assumption about the host.** The menu
  looked correct for eighteen versions because every app that mounted it put the
  pill hard right. `menuShift` is a pure function so the arithmetic can be tested
  without a browser; `getBoundingClientRect` is the only part that needs one.
- **An app's committed bundle can be older than its source.** swellet's
  `public/dist/main.js` is gitignored, and the checked-out copy predated the
  `window.__swelletLang` bridge, so the corner silently never mounted. That reads
  exactly like a broken conversion. Build the app before blaming the change.

## Repo rules

- Feature branch, PR, squash merge, delete branch. CI is `typecheck + tests`.
- `bun run check && bun test` before pushing; `ai-slop <file>` on any prose.
- `bun run build:dist` and commit `dist/`; jsDelivr serves it from the tag.
- Tag every release and verify the CDN returns 200 for the new tag.
- **Re-derive the version before bumping.** Parallel sessions merge here; a
  `sed` on the version you remember silently no-ops.
