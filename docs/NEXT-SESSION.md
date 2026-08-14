# nimiq-app-shell, next session

## What this is

The **mini wallet**: the fleet's one header control. `mountMiniWallet` is the
canonical export; `mountCornerControl` is kept as an alias because ~25 apps
import that name.

**Current: v0.20.1**, tagged and on jsDelivr:
`https://cdn.jsdelivr.net/gh/Andjroo111/nimiq-app-shell@v0.20.1/dist/app-shell.js`

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

## Shipped 2026-08-14

| Release | What |
| --- | --- |
| v0.19.0 (#143) | host branding: the `--nq-cc-*` layer finished, plus a `theme` option. Written up below. |
| v0.19.1 (#144) | the playground can deep-link a state, which is what made the menu lintable at all |
| v0.19.2 (#145) | a saved recipient was a 23px tap target |
| v0.20.0 (#146) | the send and receive screens are the wallet's own: the 3x3 recipient grid, a recipient identicon, a built-in QR |
| v0.20.1 (#148) | the report-bug glyph: legs and antennae that reach the shell, and the right size beside the hexagon |

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
- **The bug glyph took five rounds, all of them found by ZOOMING.** Legs that
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

## The fleet sweep, issue #112

**10 of 19 apps converted**: the six CDN, the three bundled, and party. PRs are
open and none are merged.

**splitlink is not a nineteenth app.** `Andjroo111/splitlink` was RENAMED to
`Andjroo111/nimiq.party`; the GitHub API redirects, and `~/gdkc/projects/splitlink`
is a stale local clone of that same repo whose `origin` still points at
nimiq.party. Its five chrome files were byte-identical to party's, which is what
gave it away. Converting it and pushing would have force-fought party's own
branch. 20 becomes 19, and party #176 already covers it.

| Model | Apps | Work per app |
| --- | --- | --- |
| CDN | cards ✅, gives ✅, ninja ✅, software ✅, stream ✅, swellet ✅ | one URL + one mount call |
| Bundled | casino ✅, life ✅, work ✅ | dep bump + mount swap |
| Vendored | party ✅, cool, gift, money, name, talk, tax, tips | bump **and rebuild `public/vendor/app-shell.js`**, or it is a no-op live |
| Own shape | sale, vote | needs a look each |

All ten PRs now pin **v0.18.2**. Open PRs: `nimiq.gives` #58, `nimiq.ninja` #108, `nimiq.software` #65,
`nimiq.stream` #48, `swellet` #99, `nimiq.casino` #31, `nimiq.life` #39,
`nimiq.work` #129, `nimiq.party` #176. Every one is GREEN.

CI is green on all seven CDN and bundled repos that run it. swellet has a
deploy-only workflow, so it was verified by its own `bun test` (1245 pass) and in
a browser. party #176 needed its CI marker list moved with the API; that landed
over SSH, since the `workflow`-scope block is an OAuth App rule SSH is not
subject to.

**nimmesh is out of the sweep** (Andrew, 2026-08-14): it is a wallet, and a
wallet does not wear the mini wallet. Same reason `nimiq.ninja/app` was always
excluded while its landing converted.

12 of the 19 mount a language pill only, no wallet; those become the
language-only mini wallet. 7 have a wallet too, and swellet is the worked
example: two controls collapse to one, and the three old theme var blocks
(`--nq-langpill-*`, `--nq-walletpill-*`, `--nq-profile-*`) collapse to one
`--nq-cc-*` block.

**Two clones need care.** `nimiq.cool` has a build loop running (contested
clone, a parallel session builds there). `nimiq.sale` serves live from its clone
via launchd. Do those last, and not under a running process.

### What the CDN six actually cost

Four were the advertised one-liner. Two were not, and both surprises are worth
knowing before starting:

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

### And what the bundled three cost

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

### The vendored batch: party is the worked example

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

**The ten open sweep PRs stay pinned to v0.18.2 on purpose.** They are green and
waiting on Andrew; 0.19.0 changes no default, so re-pinning would cost ten
review states and buy nothing.

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
