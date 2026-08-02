# nimiq-app-shell

<!-- nimiq-north-star -->
> 🧭 **North Star** · Every Nimiq project aligns to one shared set of values and a single mission. See the canonical [Nimiq Values & North Star](https://github.com/Andjroo111/nimiq.life/blob/main/NORTH-STAR.md).

Framework-agnostic vanilla-TS **shell** for the Nimiq app fleet. One small
package that gives every chain app the same four things, with no framework
lock-in (the chain apps are vanilla, not Vue):

1. **Dual-mode wallet** — one unified API that auto-detects whether it's running
   inside **Nimiq Pay** (the official mini-app SDK) or as a **standalone web app**
   (the Nimiq **Hub**), and routes every call to the right backend.
2. **nim-format** — `fmtNim` / `fmtFiat` / `lunaToNim` / `nimToLuna` / `parseNim`:
   the fleet-canonical luna/NIM formatter (registry `amount` component semantics,
   U+202F grouping, no float loss).
3. **i18n engine** — a zero-dependency translator with `?lang=` / Nimiq-Pay /
   `localStorage` / browser language resolution, runtime switching, and no reload.
4. **Vanilla UI** — a profile widget (identicon + label + address + balance) and a
   flag-hex language switcher, both mountable into any container.

It is built for **Bun** and for **no-bundler vanilla PWAs**. It does **no chain
reads** (balances, settlement watching) — that's
[`nimiq-settlement`](https://github.com/Andjroo111/nimiq-settlement)'s job — and it
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

The package exports source TypeScript (`"exports": "./src/index.ts"`) — Bun and
modern bundlers consume it directly, the same pattern as `nimiq-settlement`.

Peer deps: `@nimiq/hub-api` and `@nimiq/mini-app-sdk` are runtime dependencies and
come along automatically. `@nimiq/iqons` is an **optional** peer — install it only
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

wallet.disconnect();
```

### How detection works

| Signal | Result |
| --- | --- |
| `window.nimiqPay` present (Nimiq Pay injects it before your script runs) | **miniapp** mode → `@nimiq/mini-app-sdk` (`window.nimiq`) |
| `window.nimiq` provider present | **miniapp** mode |
| neither present | **hub** mode → `@nimiq/hub-api` (popup on desktop, redirect on mobile) |

Detection is **synchronous** (`detectModeSync`) — it never blocks boot on the
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

The mini-app SDK returns the serialized transaction (not a hash), so in miniapp
mode `txHash` carries that serialized form and `serializedTx` is set too — callers
always get a non-empty handle.

---

## NIM formatting (`nim-format`)

The fleet-canonical luna/NIM formatter — the single most re-implemented snippet
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

lunaToNim(100000);                     // 1
nimToLuna(12.5);                       // 1250000
parseNim('12 345.6789');               // 1234567890 (validates; throws on junk,
                                       //  >5 decimals, unsafe range)
```

**Vendored bundle:** apps on the scaffold's `build:shell` pattern (esbuild →
`public/vendor/app-shell.js`) get all of this in the same single file:
`import { fmtNim } from './vendor/app-shell.js'`. There is no separate
standalone build — the module rides the shell bundle.

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

1. `?lang=` URL param — for deep-links and the **nimiq.life** handoff
2. `window.nimiqPay?.language` — the language the user picked in Nimiq Pay
3. `localStorage` — the visitor's last explicit choice
4. `navigator.language.split('-')[0]` — e.g. `pt-BR` → `pt`
5. `fallback` (default `'en'`)

The resolved language is persisted to `localStorage`, mirrored to
`document.documentElement.lang`, and `setLanguage` emits `onChange` so the UI
re-renders in place. Unknown keys fall back to the fallback locale, then to the
key itself.

#### `?lang=` and the nimiq.life handoff

A directory/hub like **nimiq.life** can link to any app with `?lang=es`, and the
app boots in Spanish without the visitor touching a switcher — the URL param is
the highest-priority signal, and it persists so subsequent plain visits keep the
language.

### Shell strings

The shell ships its own ~dozen UI strings (`shell.connectWallet`,
`shell.disconnect`, `shell.copyAddress`, …) in **5 locales**: `en` (authoritative)
+ `de`, `es`, `fr`, `pt`. Spread `shellLocales` into your `createI18n` so the
profile widget and switcher render in the active language.

---

## Vanilla UI

```ts
import { mountLanguagePill, mountWalletPill } from 'nimiq-app-shell';

// The fleet-standard topbar chrome: a compact language pill + a wallet connect.
mountLanguagePill(document.querySelector('#lang')!, { i18n });        // 11 featured langs
mountWalletPill(document.querySelector('#wallet')!, { wallet, i18n }); // connect ↔ profile
```

- **`mountLanguagePill`** — the compact control: current flag + caret → a
  scrollable white dropdown of the 11 `FEATURED_LANGUAGES`. **Theme-adaptive**
  (`currentColor`), so it reads on a navy header or a light one.
- **`mountWalletPill`** — hashmark-style **Connect wallet** pill that becomes a
  compact identicon pill + profile dropdown (address / copy / disconnect) once
  connected. Theme-adaptive.
- **`mountLanguageSwitcher`** — the flag-hex **row** (one button per language), for
  headers that prefer a row over the pill.
- **`mountProfileWidget`** — identicon + label + address + optional balance + copy /
  disconnect, for embedding a full profile.
- **`buildFlagHex(code)`** — the underlying renderer: a flag clipped into the Nimiq
  hexagon with a faint grey **flags-on-white** edge and per-flag fits (`FLAG_FIT`).
  Flag artwork is **inlined** (data URIs) — no CDN, no asset files to vendor.

All inject their own `<style>` once and return a handle with `destroy()`.

### Report a bug (v0.8.0)

The corner control carries the fleet's bug reporter. Pass `reportBug` and a
**Report a bug** row appears in the menu, above the footer; leave it off and there
is no row, like every other seam here.

```ts
mountCornerControl(document.querySelector('#wallet-slot')!, {
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
with the report. At mount, not at open: by the time someone taps the row, the
error they are reporting happened minutes ago and nobody can retype a stack.

Deliberate choices worth knowing:

- **No floating button.** The corner is the fleet's one header control; a
  reporter doesn't get to add a second permanent affordance to every page. (The
  nimiq.bot widget does mount one — this is the same service without it.)
- **Ungated by wallet state** — it shows connected or not, hub or mini-app,
  because a bug on a wallet-less page is still a bug.
- **Addresses are redacted client-side**, from the text, the captured context and
  the title the service returns. In bot mode nothing of yours sits between the
  browser and the issue, so this cannot be a server's job.
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
git tag — no install, no bundler, no vendored assets:

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
- **Cashlinks** — no cashlink method; mint via `signAndSend` + your own offline
  codec.
- **HTLC / contract-creation signing** — the Hub backend signs basic transfers
  only; apps needing HTLC drop to `@nimiq/hub-api` directly (see Hashmark).

---

## Develop

```bash
bun install
bun test        # bun:test — wallet mode detection + routing, i18n resolution
bun run check   # tsc --noEmit
```

## License

MIT
