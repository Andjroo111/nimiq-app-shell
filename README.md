# nimiq-app-shell

<!-- nimiq-north-star -->
> 🧭 **North Star** · Every Nimiq project aligns to one shared set of values and a single mission. See the canonical [Nimiq Values & North Star](https://github.com/Andjroo111/nimiq.life/blob/main/NORTH-STAR.md).

Framework-agnostic vanilla-TS **shell** for the Nimiq app fleet. One small
package that gives every chain app the same four things, with no framework
lock-in (the chain apps are vanilla, not Vue):

1. A **dual-mode wallet**, one unified API that auto-detects whether it's running
   inside **Nimiq Pay** (the official mini-app SDK) or as a **standalone web app**
   (the Nimiq **Hub**), and routes every call to the right backend.
2. **nim-format**, the `fmtNim` / `fmtFiat` / `lunaToNim` / `nimToLuna` /
   `parseNim` luna formatter (registry `amount` component semantics, U+202F
   grouping, no float loss).
3. An **i18n engine**, a zero-dependency translator with `?lang=` / Nimiq-Pay /
   `localStorage` / browser language resolution, runtime switching, and no reload.
4. The **mini wallet**, the fleet's ONE header control. Wallet state on the
   face; language, reference currency, balances, receive/send and the bug
   reporter one click away in a single menu. Mountable into any container.

It is built for **Bun** and for **no-bundler vanilla PWAs**. It does **no chain
reads** (balances, settlement watching), that's
[`nimiq-settlement`](https://github.com/Andjroo111/nimiq-settlement)'s job, and it
has **no cashlink method**: apps mint cashlinks via `signAndSend` plus their own
offline codec.

---

## Install (Bun git-dep)

```jsonc
// package.json
{
  "dependencies": {
    "nimiq-app-shell": "github:Andjroo111/nimiq-app-shell#v0.1.0"
  }
}
```

```bash
bun add github:Andjroo111/nimiq-app-shell#v0.1.0
```

The package exports source TypeScript (`"exports": "./src/index.ts"`), Bun and
modern bundlers consume it directly, the same pattern as `nimiq-settlement`.

Peer deps: `@nimiq/hub-api` and `@nimiq/mini-app-sdk` are runtime dependencies and
come along automatically. `@nimiq/iqons` is an **optional** peer, install it only
if you want real identicons in the profile widget (otherwise it shows the Nimiq
hexagon placeholder).

---

## Dual-mode wallet

```ts
import { createWallet } from 'nimiq-app-shell';

const wallet = createWallet({ appName: 'My Nimiq App' });
// wallet.mode === 'miniapp'  when running inside Nimiq Pay
// wallet.mode === 'hub'      when running as a standalone web app

const account = await wallet.connect(); // { address, label } | null
//  null on a mobile Hub redirect — the account arrives via onAccountChange on return.

wallet.onAccountChange((acc) => render(acc));

const { txHash } = await wallet.signAndSend({
  recipient: 'NQ…',
  valueLuna: 100_000,        // 1 NIM = 100 000 Luna
  // data: 'thanks!',         // optional UTF-8 or Uint8Array — apps encode cashlinks here
});

// Prove wallet ownership by signing a challenge (Sign-in-with-Nimiq). Requires
// a connected account. The returned proof is the exact shape a Nimiq signed-
// message verifier (e.g. @nimiq-captcha/core) consumes — hand it straight in.
const proof = await wallet.signMessage(serverChallengeString);
// → { address, message, publicKeyHex, signatureHex }

wallet.disconnect();
```

### How detection works

| Signal | Result |
| --- | --- |
| `window.nimiqPay` present (Nimiq Pay injects it before your script runs) | **miniapp** mode → `@nimiq/mini-app-sdk` (`window.nimiq`) |
| `window.nimiq` provider present | **miniapp** mode |
| neither present | **hub** mode → `@nimiq/hub-api` (popup on desktop, redirect on mobile) |

Detection is **synchronous** (`detectModeSync`), it never blocks boot on the
mini-app SDK's `init()` poll (which times out ~10s standalone). You can force a
backend with `createWallet({ mode: 'hub' })` and inject fakes via the advanced
options (used by the tests).

### Routing

| Unified call | miniapp backend | hub backend |
| --- | --- | --- |
| `connect()` | `provider.listAccounts()[0]` → `{address, label:''}` | `hub.chooseAddress()` → `{address, label}` |
| `signAndSend({…, data})` | `sendBasicTransactionWithData` (data hex-encoded) | `signTransaction` (basic transfer, `extraData` bytes) |
| `signAndSend({…})` | `sendBasicTransaction` | `signTransaction` |
| result | `{ txHash: serializedTx, serializedTx }` | `{ txHash: hash, serializedTx }` |
| `signMessage(message)` | `provider.sign(message)` (hex pubkey/sig) | `hub.signMessage({signer, message})` (bytes → hex) |
| result | `{ address, message, publicKeyHex, signatureHex }` | `{ address, message, publicKeyHex, signatureHex }` |

`signMessage` returns a normalised wallet-proof both backends agree on. The Hub
path is interop-verified against `@nimiq-captcha/core`'s signed-message verifier
(the Nimiq `"\x16Nimiq Signed Message:\n"` prefix convention); pass the
verifier's canonical challenge string **unmodified**.

The mini-app SDK returns the serialized transaction (not a hash), so in miniapp
mode `txHash` carries that serialized form and `serializedTx` is set too, callers
always get a non-empty handle.

---

## NIM formatting (`nim-format`)

The fleet-canonical luna/NIM formatter, the single most re-implemented snippet
in the fleet, now implemented once. String-based digit math (no float loss,
bigint-safe) following the `nq` registry `amount` component's semantics exactly:
half-up rounding, trailing-zero trim padded to `minDecimals`, and integer digit
grouping with U+202F (narrow no-break space) only above 4 integer digits.

```ts
import { fmtNim, fmtFiat, lunaToNim, nimToLuna, parseNim } from 'nimiq-app-shell';

fmtNim(1234567890);                    // '12 345.6789'  (U+202F separators)
fmtNim(500000);                        // '5.00'          (minDecimals 2 default)
fmtNim(123500, { maxDecimals: 2 });    // '1.24'          (half-up)
fmtNim(500000, { signed: true });      // '+5.00'         (tx-feed style)
fmtNim(1234567890, { grouping: false }) // '12345.6789'

fmtFiat(12.5, 'USD', 'en-US');         // '$12.50' (narrow symbol, Intl decimals)

// Same engine at any asset's decimals (v0.10.0) — `fmtNim` is this, pinned to 5.
fmtUnits(45200000n, 6);                // '45.20'    (USDT)
fmtUnits(120000n, 8);                  // '0.0012'   (BTC — maxDecimals defaults
                                       //  to the asset's own width, then trims,
                                       //  so never '0.00120000')
fmtUnits(9007199254740993n, 8);        // '90 071 992.54740993' — exact past
                                       //  2^53, where `Number(x) / 1e8` lands
                                       //  on ...92 and shows a wrong balance

lunaToNim(100000);                     // 1
nimToLuna(12.5);                       // 1250000
parseNim('12 345.6789');               // 1234567890 (validates; throws on junk,
                                       //  >5 decimals, unsafe range)
```

**Vendored bundle:** apps on the scaffold's `build:shell` pattern (esbuild →
`public/vendor/app-shell.js`) get all of this in the same single file:
`import { fmtNim } from './vendor/app-shell.js'`. There is no separate
standalone build, the module rides the shell bundle.

---

## i18n engine

```ts
import { createI18n, shellLocales, mergeLocales } from 'nimiq-app-shell';
import myAppLocales from './locales'; // your own { en: {...}, de: {...}, … }

const i18n = createI18n({
  locales: mergeLocales(shellLocales, myAppLocales), // shell strings + yours
  fallback: 'en',
});

i18n.t('shell.connectWallet');            // → "Connect wallet"
i18n.t('welcome', { name: 'Andjroo' });    // → interpolates {name}
i18n.setLanguage('de');                   // runtime switch, persists, no reload
i18n.onChange((id) => rerender());
```

### Language resolution priority (on init)

1. `?lang=` URL param, for deep-links and the **nimiq.life** handoff
2. `window.nimiqPay?.language`, the language the user picked in Nimiq Pay
3. `localStorage`, the visitor's last explicit choice
4. `navigator.language.split('-')[0]`, e.g. `pt-BR` → `pt`
5. `fallback` (default `'en'`)

The resolved language is persisted to `localStorage`, mirrored to
`document.documentElement.lang`, and `setLanguage` emits `onChange` so the UI
re-renders in place. Unknown keys fall back to the fallback locale, then to the
key itself.

#### `?lang=` and the nimiq.life handoff

A directory/hub like **nimiq.life** can link to any app with `?lang=es`, and the
app boots in Spanish without the visitor touching a switcher, the URL param is
the highest-priority signal, and it persists so subsequent plain visits keep the
language.

### Shell strings

The shell ships its own ~dozen UI strings (`shell.connectWallet`,
`shell.disconnect`, `shell.copyAddress`, …) in **5 locales**: `en` (authoritative)
+ `de`, `es`, `fr`, `pt`. Spread `shellLocales` into your `createI18n` so the
profile widget and switcher render in the active language.

---

## The mini wallet

**This is the standard.** One control in the header corner, not a language
picker next to a wallet button. Mount it and you are done:

```ts
import { mountMiniWallet } from 'nimiq-app-shell';

mountMiniWallet(document.querySelector('#corner')!, { wallet, i18n });
```

The face shows wallet state: outline **Connect wallet ▾**, then identicon +
short label once connected. Everything else lives one click away in a single
menu. That menu holds the balance block, a Receive / Send action bar, the
address behind Receive, Language and **Show amounts in** as collapsed rows, an
opt-in cashlink row, a network row on testnet only, Report a bug, and a quiet
Disconnect.

Inside Nimiq Pay (`wallet.mode === 'miniapp'`) the wallet is ambient, so the
face collapses to the current-language flag and the menu keeps language alone.
Omit `wallet` and you get the same pill in language-only form, for pages with no
wallet concept at all.

> **Naming.** The component is the **mini wallet** and every doc here calls it
> that. `mountCornerControl` is its original name, kept as an alias so a version
> bump never costs an app an edit. `MiniWalletOptions` / `MiniWalletHandle`
> alias the `CornerControl*` types the same way. New code should use the mini
> wallet names.

### Single-asset and multi-asset are the SAME component

There is one mini wallet, not a NIM edition and a multi-chain edition. Which one
an app gets is decided by which balance seam it wires, and nothing else:

| The app holds | Wire | The account row shows |
| --- | --- | --- |
| NIM only | `getBalanceLuna` | the NIM balance |
| more than NIM | `assets` | the fiat **total** over a per-asset stack |
| nothing to show | neither | no balance block at all |

Two components would mean two things to keep pixel-identical forever, which is
the exact drift this package exists to end. A betting app that adds USDC next
quarter changes one option; it does not migrate to a different control.

### The older pills

`mountLanguagePill`, `mountWalletPill` and `mountLanguageSwitcher` are the
**superseded** v0.2.x chrome: a separate language control and a separate wallet
control. They still work and are still exported, but they are not the standard
and new apps should not reach for them.

```ts
// superseded — prefer mountMiniWallet
mountLanguagePill(document.querySelector('#lang')!, { i18n });
mountWalletPill(document.querySelector('#wallet')!, { wallet, i18n });
```

- **`mountLanguagePill`**, the compact control: current flag + caret → a
  scrollable white dropdown of the 11 `FEATURED_LANGUAGES`. **Theme-adaptive**
  (`currentColor`), so it reads on a navy header or a light one.
- **`mountWalletPill`**, hashmark-style **Connect wallet** pill that becomes a
  compact identicon pill + profile dropdown (address / copy / disconnect) once
  connected. Theme-adaptive.
- **`mountLanguageSwitcher`**, the flag-hex **row** (one button per language), for
  headers that prefer a row over the pill.
- **`mountProfileWidget`**, identicon + label + address + optional balance + copy /
  disconnect, for embedding a full profile.
- **`buildFlagHex(code)`**, the underlying renderer: a flag clipped into the Nimiq
  hexagon with a faint grey **flags-on-white** edge and per-flag fits (`FLAG_FIT`).
  Flag artwork is **inlined** (data URIs), no CDN, no asset files to vendor.
  The hexagon clip is applied to a `<g>` wrapping the `<image>`, never to the
  `<image>` itself: WebKit skips a `clip-path` referenced directly by an `<image>`
  whose data URI decodes after first paint, and the flag then renders as a rounded
  rectangle (v0.9.3, seen on a real iPhone). `flagHexMarkup(code)` is the same
  renderer returning a string, which is what the tests pin.

All inject their own `<style>` once and return a handle with `destroy()`.

### Multi-asset balances (v0.10.0)

The mini wallet was NIM-only: `getBalanceLuna?: (address) => Promise<number>`
is one address, one chain, luna's 5 decimals. Apps holding more than NIM pass
`assets` instead, and the account row's figure becomes the fiat **total**:

```ts
mountMiniWallet(el, {
  wallet, i18n,
  assets: () => [
    { ticker: 'NIM',  name: 'Nimiq',  decimals: 5, balance: () => nimBalance() },
    { ticker: 'USDT', name: 'Tether', decimals: 6, balance: () => usdtBalance(),
      address: polygonAddress },
    { ticker: 'BTC',  name: 'Bitcoin', decimals: 8, balance: () => btcBalance(),
      address: btcAddress },
  ],
  fiat: { currencies: ['USD', 'EUR'], rate: (fiat, asset) => price(asset, fiat) },
});
```

Three things the shape is deliberate about:

- **One address and one reader per asset.** The shell cannot derive a Polygon
  address from a NIM one, and has no business knowing what an RPC is. The Hub
  hands all three addresses back from a single `chooseAddress` with **no**
  balances attached, so reading them is always the host's job.
- **Rows resolve independently, not as one batched read.** Nimiq consensus, a
  Polygon RPC and a BTC explorer answer at very different speeds; a single
  `read(): Promise<Balance[]>` would pin the list to the slowest chain.
- **Smallest units as bigint, with the asset's own decimals**, formatted through
  `fmtUnits`. A 6- or 8-decimal token through a float is exactly the drift
  `nim-format` exists to end.

A reader that throws or resolves `null` keeps the last known value on screen, a balance that vanishes reads as *your money is gone*, not *the RPC is flaky*, and an asset that never priced is left **out** of the total rather than counted
as zero. `getBalanceLuna` still works on its own and still supplies the Send
view's cap; pass `assets` alone and the cap comes from its `NIM` row.

The same stack mounts standalone via `mountAssetList` for a wallet or funding
screen of your own. A standalone list reads its balances **at mount**. The mini
wallet passes `autoRefresh: false` because it reads on menu-open instead: firing
a Polygon RPC and a BTC explorer on every page load, for a panel most visitors
never open, is the cost that lazy read exists to avoid.

Before v0.11.0 there was no mount read at all, so a standalone list sat at a
dash in every row until the host happened to call `refresh()`.

### Report a bug (v0.8.0)

The corner control carries the fleet's bug reporter. Pass `reportBug` and a
**Report a bug** row appears in the menu, above the footer; leave it off and there
is no row, like every other seam here.

```ts
mountMiniWallet(document.querySelector('#wallet-slot')!, {
  wallet, i18n,
  reportBug: {
    bot: { repo: 'nimiq.kids', labels: ['surface:parent'] },  // files via bot.nimiq.tech
    context: { surface: 'parent', version: '1.4.0' },         // static fields, sent verbatim
  },
});
```

That is the whole integration. **No endpoint of your own and no GitHub token
anywhere**: [nimiq.bot](https://bot.nimiq.tech) drafts the issue with an LLM and
files it into `repo`, exactly as its floating widget does, so a report from the
corner and a report from the widget read the same in your issue tracker.

Apps that must keep reports on their own origin can pass `endpoint: '/api/feedback'`
instead and file them themselves; the payload is flat JSON and a non-2xx with a
`fallbackMailto` in the body becomes an "email instead" link.

**Page context comes for free.** `installReportCapture()` runs at mount and rings
the last 20 console errors, unhandled rejections and failed requests, which ship
with the report and land as their own sections in the issue. At mount, not at
open: by the time someone taps the row, the error they are reporting happened
minutes ago and nobody can retype a stack. Whatever you put in `context` rides
along too, as a line under the report, since the service has no field for it.

Deliberate choices worth knowing:

- **No floating button.** The corner is the fleet's one header control; a
  reporter doesn't get to add a second permanent affordance to every page. (The
  nimiq.bot widget does mount one, this is the same service without it.)
- **Ungated by wallet state**, it shows connected or not, hub or mini-app,
  because a bug on a wallet-less page is still a bug.
- **Identifiers are redacted client-side**, NQ addresses **and UUIDs**, from the
  text, the captured context and the title the service returns. In bot mode
  nothing of yours sits between the browser and the issue, so this cannot be a
  server's job. The captured `url` and `referrer` are cut at the first `?` or `#`
  for the same reason: a query string is where an app leaks the ids it never
  meant to send, and a hash route carries them one layer down. (v0.9.2. nimiq.kids
  had to run with `diagnostics: false` until this landed, nearly every call it
  makes is addressed by child UUID, and `POST /api/kids/<uuid>/buy → 400` was
  going into public issues.)
- **No draft to approve.** The service can hand back an editable issue draft; the
  sheet files straight through. Asking a parent to proofread a GitHub issue is
  not a review step, it is an obstacle.

Pass a function instead (`reportBug: () => openMyOwnForm()`) to keep the row and
render your own UI. `openReportBugSheet`, `submitToBot`, `submitFeedback` and
`validateFeedbackInput` are exported for hosts with another entry point.

---

## Use without a bundler (prebuilt ESM)

Apps with **no build step** (raw `<script type="module">`, no bundler) can't
import the TS source. For them the shell ships a **prebuilt, self-contained browser
ESM** (`dist/app-shell.js`, all deps inlined) that jsDelivr serves straight from a
git tag, no install, no bundler, no vendored assets:

```html
<div id="lang"></div>
<div id="wallet"></div>
<script type="module">
  import {
    createI18n, createWallet, mergeLocales, shellLocales,
    mountLanguagePill, mountWalletPill,
  } from 'https://cdn.jsdelivr.net/gh/Andjroo111/nimiq-app-shell@v0.2.1/dist/app-shell.js';

  const i18n = createI18n({ locales: mergeLocales(shellLocales), fallback: 'en' });
  const wallet = createWallet({ appName: 'My App' });
  mountLanguagePill(document.getElementById('lang'), { i18n });
  mountWalletPill(document.getElementById('wallet'), { wallet, i18n });
</script>
```

Rebuild the bundle with `bun run build:dist` (it's committed so the CDN can serve
it at the tagged ref). Bundled apps should keep importing the TS source instead.

---

## What's intentionally NOT here

- **Chain reads** (balance, settlement watching) → use `nimiq-settlement`.
- **Cashlinks**, no cashlink method; mint via `signAndSend` + your own offline
  codec.
- **HTLC / contract-creation signing**, the Hub backend signs basic transfers
  only; apps needing HTLC drop to `@nimiq/hub-api` directly (see Hashmark).

---

## Playground

```bash
bun run playground     # builds dist/, serves http://localhost:4321
```

A blank page with the mini wallet in two headers, navy and light, because
theme-adaptivity is a claim worth falsifying in one glance. Alongside them sits
**every seam as a live switch**: hub vs miniapp, connected vs not, wallet vs
language-only, no balance vs NIM-only vs multi-asset, and each of send / scan /
cashlink / onboard / openInPay / reportBug / receive / identicon / qr / testnet.
Flipping one remounts both corners.

The wallet is a **mock** by default, implementing the same `Wallet` interface
the mini wallet consumes, the way Hashmark's betting-key adapter does. That
means you can click through every state with no Hub, no chain and no network.
Switch the backend to **Real Hub** to drive the actual popup.

Three things worth using it for:

- **Failure modes.** Toggle *USDT reader throws* and watch the row keep its last
  value rather than blanking. Toggle *BTC has no price* and watch it drop out of
  the fiat total instead of counting as zero. Toggle *Slow BTC read* and watch
  the other rows land without waiting on it.
- **The event log**, which is the only way to see that a seam fired.
- **Console cleanliness.** It ends at zero errors; if it does not, something
  regressed.

It loads the real `dist/app-shell.js`, so it tests the artifact jsDelivr serves
rather than a separately-compiled copy that could drift. After editing `src/`,
run `bun run build:dist` and reload.

## Develop

```bash
bun install
bun test        # bun:test — wallet mode detection + routing, i18n, asset-list DOM
bun run check   # tsc --noEmit
```

The DOM-level tests use `happy-dom`. Most of the suite pins SHAPE rather than
rendering, but the mini wallet's balance stack has real mount behaviour that a
type test cannot reach, and did ship a bug there once.

## License

MIT
