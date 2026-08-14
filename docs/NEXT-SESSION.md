# nimiq-app-shell, next session

## What this is

The **mini wallet**: the fleet's one header control. `mountMiniWallet` is the
canonical export; `mountCornerControl` is kept as an alias because ~25 apps
import that name.

**Current: v0.18.1**, tagged and on jsDelivr:
`https://cdn.jsdelivr.net/gh/Andjroo111/nimiq-app-shell@v0.18.1/dist/app-shell.js`

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

**9 of 20 apps converted**, the six CDN and the three bundled. PRs are open and
none are merged.

| Model | Apps | Work per app |
| --- | --- | --- |
| CDN | cards ✅, gives ✅, ninja ✅, software ✅, stream ✅, swellet ✅ | one URL + one mount call |
| Bundled | casino ✅, life ✅, work ✅ | dep bump + mount swap |
| Vendored | cool, gift, money, name, party, talk, tax, tips, splitlink | bump **and rebuild `public/vendor/app-shell.js`**, or it is a no-op live |
| Own shape | sale, vote | needs a look each |

Open PRs: `nimiq.gives` #58, `nimiq.ninja` #108, `nimiq.software` #65,
`nimiq.stream` #48, `swellet` #99, `nimiq.casino` #31, `nimiq.life` #39,
`nimiq.work` #129. CI is green on all seven repos that run it; swellet has a
deploy-only workflow, so it was verified by its own `bun test` (1245 pass) and
in a browser.

**nimmesh is out of the sweep** (Andrew, 2026-08-14): it is a wallet, and a
wallet does not wear the mini wallet. Same reason `nimiq.ninja/app` was always
excluded while its landing converted. That takes the sweep from 21 to 20.

13 of the 20 mount a language pill only, no wallet; those become the
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
