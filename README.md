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
| NIM, and no node of its own | **nothing** | the NIM balance, read by the shell |
| NIM, with its own reader | `getBalanceLuna` | the NIM balance, from your source |
| more than NIM | `assets` | the fiat **total** over a per-asset stack |
| nothing to show | `balance: false` | no balance block at all |

**The first row is the default as of v0.21.0, and it is a fix, not a feature.**
The balance stack shipped in v0.14 behind an opt-in `getBalanceLuna`, and by
v0.20.3 not one of the nineteen fleet apps had wired one — so every mini wallet
in the fleet showed a connected account with no money in it, which is what
Andrew hit on nimiq.cool. A control that calls itself a wallet has to answer
"how much", so the shell now reads it (`getAccountByAddress` against
`rpc.nimiqwatch.com`, cached 30s, one call per menu open) unless the host says
otherwise. `balance: { rpc }` keeps the read on your own node; `balance: false`
turns it off; `getBalanceLuna` and `assets` both override it outright.

⚠ **It is skipped on `network: 'test'`.** The public testnet RPCs are all dead,
and reading MAINNET figures into a testnet UI is a WRONG number — worse than a
missing one. A testnet app wires `getBalanceLuna` itself.

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
const account = await hub.chooseAddress({ appName, returnUsdcAddress: true });

mountMiniWallet(el, {
  wallet, i18n,
  assets: () => [
    { ticker: 'NIM',  name: 'Nimiq',      network: 'Nimiq',   decimals: 5,
      balance: () => nimBalance() },
    { ticker: 'USDC', name: 'USD Coin',   network: 'Polygon', decimals: 6,
      balance: () => usdcBalance(), address: account.usdcAddress },
    { ticker: 'USDT', name: 'Tether USD', network: 'Polygon', decimals: 6,
      balance: () => usdtBalance(), address: account.usdcAddress },
  ],
  fiat: { currencies: ['USD', 'EUR'], rate: (fiat, asset) => price(asset, fiat) },
});
```

> ### Bitcoin does not belong in this list
>
> Earlier versions of this example showed a `BTC` row. Through the Hub that row
> cannot be right, and the reason defeats reading as well as sending.
>
> `chooseAddress({ returnBtcAddress: true })` returns **a single unused BTC
> address, a different one on every call**, and change from any spend lands on
> yet another address. So a balance fetched for it is not the user's BTC
> balance; it is a fresh address holding approximately nothing. Sending is shut
> too: `SIGN_BTC_TRANSACTION` is deliberately absent from the Hub's
> third-party whitelist (`nimiq/hub` `src/lib/RpcApi.ts`).
>
> A BTC row is only correct for an app that holds its own BTC key and can
> therefore offer a stable address it derived itself. See issue #124 for the
> three identity models and which one an app is in.

USDC and USDT deliberately share one `address`: Polygon is account-model, so
both tokens live at the same address, and the ticker is what separates them.

**`network` is required** (v0.13.0). A ticker is not enough information to
receive safely: USDT exists on Ethereum, Tron, Polygon, Solana and BSC, and the
mini wallet can only ever accept the one the connected account holds. Someone
reading a bare `USDT` row and withdrawing from an exchange on Tron loses the
money. An optional field is a field that gets forgotten, and the cost of
forgetting this one is somebody's balance, so the compiler asks for it.

It shows in the row (`Tether USD · Polygon`, deduplicated when the name and the
network are the same word) and again on the receive screen, where the decision
is actually made.

### Receiving one asset (v0.13.0)

With `assets` wired, the balance rows are tappable and each opens a receive
screen for **that** asset: its own `address`, its own QR payload, and its chain
named on the screen rather than only in the row it was reached from.

Three things this gets right that one shared receive screen cannot:

- **The address is the asset's.** Before v0.13.0 the receive view always showed
  `wallet.account.address`, so a USDT row led to a NIM address, and
  `ShellAsset.address` was declared but read by nothing.
- **Every address gets the house grid**, at the row count its length calls for
  (see below). A 42-character Polygon address used to wrap as one ragged string
  with a stub second line.
- **The QR payload is not guessed from the ticker.** `nimiq:` is right for NIM
  and wrong for everything else, so it is only applied to the account address.
  An asset's default payload is the bare address, which every scanner
  understands, and `ShellAsset.uri` overrides it for hosts wanting EIP-681 or
  `bitcoin:`.

An asset without its own `address` is **not selectable**, and its row stays a
plain `div`. Falling back to the account address looked harmless and was the
opposite: the screen would print "Send USDT on Polygon only" over a NIM address,
and the warning made that pairing read as deliberate rather than as a bug.
Hashmark is exactly this shape, since its EVM key is not derived until a bet
flow runs, so its USDT row carries no address for most of a session.

### The address grid (v0.14.0)

Ported from the `nq` registry `address-display`, whose two formats agree on one
thing that is easy to miss: **the block is always three rows**. NIM is nine
four-character chunks in three columns; Ethereum is three fourteen-character
chunks in one. Keeping the row count constant is what makes a NIM address and a
Polygon one read as siblings at the same height.

| Address | Cells | Columns |
| --- | --- | --- |
| NIM, 36 chars | 9 of 4 | 3 |
| EVM / bech32, 42 chars | 3 of 14 | 1, upstream verbatim |
| legacy BTC, 34 chars | 3 of 12 and 11 | 1 |
| bech32m, 62 chars | 3 of 21 and 20 | 1 |

`addressGrid(address)` returns `{ cells, columns }` and is exported for hosts
rendering an address of their own.

**One upstream behaviour is deliberately not ported.** The registry does
`address.match(/.{14}/g)`, which returns only whole fourteen-character groups
and silently discards the tail: a 34-character legacy BTC address renders as 28
characters, truncated, and looks perfectly tidy while doing it. For a string
people paste money into that is not a rounding error. Rows here are near-equal
thirds instead, so every character survives at any length, and the 42-character
case still produces exactly the upstream split.

The invariant that matters: **the cells always rejoin to the input**, pinned
across five address formats.

### Languages and currencies (v0.15.0)

The mini wallet offers the **13 `FEATURED_LANGUAGES`** by default, the same 11
`mountLanguagePill` offered, because defaulting to the 5 the shell ships UI
strings for would silently cut every app on the old chrome from eleven languages
to five. nimiq.tech ships full translations for exactly these 11, so the pick is
real even where the shell's own strings fall back to English.

| Set | Count | |
| --- | --- | --- |
| Shell UI strings | 5 | en es de fr pt |
| `FEATURED_LANGUAGES` (the default) | 13 | + hi zh tr ha ko vi tl id |
| Nimiq wallet, for comparison | 9 | has nl ru uk, lacks hi ha ko tr vi |

Pass `languages` to narrow or widen it.

**Currencies: all 40 of the wallet's list carry flag artwork** (v0.16.0). The
package still does not limit them, since the host passes `fiat.currencies` and
an unknown ticker renders text-only rather than being refused. XOF is
deliberately text-only: the West African CFA franc is legal tender in eight
countries, so any single flag names the wrong one.

Both sets are checked against crypto ownership rather than intuition. Of the ten
largest crypto-owning countries, the mini wallet now speaks the language of six
(India, China, USA, Brazil, Vietnam, Nigeria) and shows the currency of nine.
The gaps are the Philippines, Pakistan, Indonesia and Iran; Filipino and
Indonesian are cheap to add, while Urdu and Persian need right-to-left support
this package does not have yet.

### Switching account (v0.14.0)

A quiet **Switch account** row above Disconnect. Connecting again IS the
switcher: `chooseAddress` reopens the Hub's own account picker, which is the
right screen for this and one we do not have to build. It needs no wiring and
appears on any mini wallet with a wallet, hub mode only.

Pass **`switchAccount: false`** when `connect()` means something other than
"choose an account". Hashmark is the case: its wallet is an adapter over a
betting key, so connect() means "set up betting", changes the funding address
and can route to onboarding. Offering that as "Switch account" would describe an
action the app does not have, one line above the real Disconnect.

There is deliberately no in-menu account list. A fleet app cannot enumerate the
user's accounts (`LIST` is not third-party callable), and a worse copy of a
screen the Hub already ships is not worth owning.

Two things it gets right that are easy to get wrong:

- **Cancelling is a no-op.** Dismissing the Hub picker leaves the current
  account connected. This row sits one line above Disconnect, so an exploratory
  tap must never be destructive.
- **The previous account's money does not survive the switch.** Every balance on
  screen belongs to one address, and the asset list keeps its last value on
  purpose (a flaky RPC must not blank a real balance). Across a switch that rule
  is exactly wrong, so the NIM figure, the asset stack, the fiat total and any
  open receive screen are all cleared the moment the address changes. A dash is
  honest; a stale number is not. `mountAssetList` gained `clear()` for this.

This applies to ANY account change, not only the new row. An app calling
`connect()` again for its own reasons was already showing the old balance.

### Saved recipients (v0.14.0)

Sending means typing 36 characters, or pasting them and hoping. The send view
validates the format, which catches a typo but not a wrong address.

```ts
mountMiniWallet(el, {
  wallet, i18n,
  contacts: {
    list: () => myAddressBook(),                 // may be async, may throw
    add: (entry) => saveToMyAddressBook(entry),  // optional
  },
});
```

Wired, the recipient field grows a row of quiet name pills. Absent, the field is
exactly as it was.

It is a **host** seam because there is no shared address book to read: the Hub
exposes no contacts API to a third-party origin. That is fine, because the host
is the only party that knows anything useful anyway (nimiq.kids knows a child by
name, a POS knows the till), and this package should not grow a second thing it
persists.

- **`asset` scopes an entry to one chain**, and entries without it are NIM.
  Offering a Polygon address while sending NIM is offering a mistake.
- **Picking fills the field rather than bypassing it**, and scrolls it back to
  the start, because an address you cannot see the beginning of is not one you
  can check. Handing an address straight to the signer because a name was tapped
  removes the last chance to notice it is the wrong one.
- **`add` is asked after the send lands**, never between Send and the money
  moving, and only for an address the book does not already hold.
- **A failed contacts read renders no chips** rather than breaking the send view.

### Report a bug (v0.8.0)

The corner control carries the fleet's bug reporter, as a **Report a bug** row in
the menu, below **Switch account** and above the footer. That order is Andrew's
call and it is deliberate: switching accounts is something a person DOES, and
reporting a bug is something that HAPPENS to them, so the frequent action goes
above the rare one and the rare one sits with the other exits.

**Since v0.21.0 a fleet app gets that row without wiring anything.** Left
undefined, `reportBug` files through nimiq.bot into the repo derived from the
page's own hostname — `nimiq.cool` → `nimiq.cool`, and `nimiq-cool.fly.dev` →
`nimiq.cool` so a preview reports against the app it previews. The derivation
answers only for hosts it can place against `REPORTABLE_REPOS`; anything else
(localhost, a stranger's domain, `nimiq.com` — Nimiq's own site, no repo of
ours) returns null and the row stays hidden, because a report filed into the
wrong repo is worse than no row. `reportBug: false` opts out.

Pass the object to say more than the default can derive — extra labels, a
surface, your app version:

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

### The send and receive screens (v0.20.0)

Both are the wallet's own, ported from the `nq` registry rather than approximated.

**The recipient field is the wallet's send-modal grid**: nine four-character
blocks in a 3x3 layout, formatting live as you type or paste (a `nimiq:` prefix,
lowercase and dashes all come off). It was one flat line until v0.20.0.

**A recipient identicon appears the moment the address is real**, next to the
label, and goes again if you edit it back into nonsense. That is the point of
the screen: nobody reads 36 characters back, but everybody recognises a face
they have seen before. It needs the `identicon` option wired; without one there
is deliberately no placeholder hexagon, because a placeholder there would say
"identity confirmed" while showing no identity.

**The receive QR is now built in** (registry `qr-code`: rounded modules, the
light-blue radial). `qr` stays a seam and still overrides it, but an app that
passes nothing gets the wallet's QR instead of no QR.

```ts
mountMiniWallet(slot, {
  wallet, i18n,
  identicon: (address, size) => Identicons.render(address, size),  // the recipient face
  // qr: myRenderer,   // optional; omit for the built-in
});
```

The QR sits on a white plate (`--nq-cc-qr-plate`). That is not decoration: a
reader needs dark modules on a light field, so a blue QR drawn straight onto a
dark themed card is unscannable, not just off-brand. Retint it with
`--nq-cc-qr-from` / `--nq-cc-qr-to` only if you have checked it still scans.

---

### Wearing your brand (v0.19.0)

Pass `theme` and the mini wallet stops looking like a Nimiq control someone
dropped onto your page. Eleven tokens, all optional; anything you leave out
stays Nimiq.

```ts
mountMiniWallet(document.querySelector('#wallet-slot')!, {
  wallet, i18n,
  theme: {
    font: 'inherit',        // take the page's own font
    surface: '#0E241B',     // the menu card
    text: '#E7F3EE',        // text on it
    primary: '#0C8C77',     // the signed-out Connect button
    accent: '#2FD9BE',      // Send, focus rings, the copied address, contacts
    accentText: '#04120C',  // label ON accent, for a brand too bright for white
  },
});
```

| Token | Reaches |
| --- | --- |
| `font` | face and menu |
| `primary`, `primaryText` | the Connect button, its lit corner and its hover |
| `accent`, `accentText` | Send, send-confirm, every focus ring, input focus, the copy tint and tooltip, contact chips |
| `surface`, `text` | the card, and every muted tone, hairline, hover wash, well and scrollbar derived from them |
| `face`, `faceText` | the language-only pill, which sits on YOUR header rather than on the card (defaults to `surface` / `text`) |
| `danger`, `success`, `warning` | send errors and Disconnect hover, the sent confirmation, the wrong-network guard and TESTNET badge |

Two tokens usually carry a dark theme, because the tints derive rather than
being named: `surface` + `text` also darken the address well, the currency grid,
the scrollbar, the hairlines and the hover wash.

**Under it are the `--nq-cc-*` custom properties**, still the mechanism.
`theme` expands into them. Set one directly for anything the tokens do not
reach:

```css
:root {
  --nq-cc-menu-shadow: 0 12px 32px rgba(8, 32, 26, .16);
  --nq-cc-menu-border: 1.5px solid rgba(236, 242, 235, .12);
}
```

Each var holds a WHOLE value rather than a component of one, so
`--nq-cc-connect-image` can be a flat colour where Nimiq uses a radial. `theme`
is stamped inline on the mounted element, so it wins where both are set, and two
mini wallets on one page can wear different brands.

A value may be any CSS colour, including a `var()` pointing at your own design
token: `accent: 'var(--brand-teal)'` works, and follows your dark-mode switch
for free.

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
  } from 'https://cdn.jsdelivr.net/gh/Andjroo111/nimiq-app-shell@v0.20.0/dist/app-shell.js';

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

### What the Hub will not let a fleet app do at all

Several things missing here are missing because the Hub refuses them to any
origin that is not Nimiq's own, not because nobody got to them. Dropping to
`@nimiq/hub-api` directly does not help. Read from `nimiq/hub@master`
`src/lib/RpcApi.ts`, where `_3rdPartyRequestWhitelist` is the enforcement:

**Allowed:** `CHECKOUT`, `SIGN_TRANSACTION`, `SIGN_STAKING`, `SIGN_MESSAGE`,
`CHOOSE_ADDRESS`, `CREATE_CASHLINK`, `MANAGE_CASHLINK`, `CONNECT_ACCOUNT`,
`SIGN_POLYGON_TRANSACTION`. Everything else answers
`<origin> is unauthorized to call <requestType>`.

| Wanted | Why it cannot be done |
| --- | --- |
| Rename in the wallet | `RenameRequest` needs `accountId`; `chooseAddress` never returns one, and `RENAME` is not whitelisted |
| Backup / export recovery words | same `accountId` blocker, and `EXPORT` is not whitelisted |
| Add an address, log out, change password | same, all `SimpleRequest` |
| List the user's accounts | `LIST` is not whitelisted |
| Send BTC | `SIGN_BTC_TRANSACTION` is deliberately excluded (see the Bitcoin note above) |
| `HubApi.onboard` | excluded on purpose: "exposes internal accountIds" |

Two consequences worth stating plainly, because both look like bugs otherwise:

- **The mini wallet's rename is local (localStorage, per address) and always
  will be.** It is not a placeholder for a Hub rename that someone will wire
  later. `onRename` exists so a host that has an `accountId` by some other route
  can sync it further.
- **The "New to Nimiq? Create a wallet" row must be wired to `connect()`**, not
  to `HubApi.onboard`. The choose-address flow offers wallet creation to a
  visitor who has none, which reaches the same funnel by an allowed route.

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

### Deep-link a state (v0.19.1)

```
?state=menu|receive|send   ?brand=swellet|hashmark|cool   ?connected=1   ?corner=light
```

The menu, the receive view and the send view sit behind `[hidden]` and
`display:none` until two clicks, and **`nq lint` probes the page as loaded**.
Every one of its rules is gated on `visible()`, so those three states were
therefore never linted at all: the same markup reports `1 error FAIL` when shown
and `0 errors clean pass` inside a `display:none` block. A URL that lands on a
state makes it reachable to the linter, reproducible as a screenshot, and
sendable as a bug report.

It drives ONE corner (navy by default). A click inside either menu dismisses
every other open one, which is what closes a menu you clicked away from, so
driving both left the first shut the moment the second was clicked.

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
