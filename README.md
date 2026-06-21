# nimiq-app-shell

Framework-agnostic vanilla-TS **shell** for the Nimiq app fleet. One small
package that gives every chain app the same three things, with no framework
lock-in (the chain apps are vanilla, not Vue):

1. **Dual-mode wallet** — one unified API that auto-detects whether it's running
   inside **Nimiq Pay** (the official mini-app SDK) or as a **standalone web app**
   (the Nimiq **Hub**), and routes every call to the right backend.
2. **i18n engine** — a zero-dependency translator with `?lang=` / Nimiq-Pay /
   `localStorage` / browser language resolution, runtime switching, and no reload.
3. **Vanilla UI** — a profile widget (identicon + label + address + balance) and a
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

## i18n engine

```ts
import { createI18n, shellLocales, mergeLocales } from 'nimiq-app-shell';
import myAppLocales from './locales'; // your own { en: {...}, de: {...}, … }

const i18n = createI18n({
  locales: mergeLocales(shellLocales, myAppLocales), // shell strings + yours
  fallback: 'en',
});

i18n.t('shell.connectWallet');            // → "Connect wallet"
i18n.t('welcome', { name: 'Andrew' });    // → interpolates {name}
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
import { mountProfileWidget, mountLanguageSwitcher } from 'nimiq-app-shell';

mountLanguageSwitcher(document.querySelector('#lang')!, { i18n });

mountProfileWidget(document.querySelector('#profile')!, {
  wallet,
  i18n,
  getBalance: async (addr) => `${await myBalanceLookup(addr)} NIM`, // optional; shell does no chain reads
});
```

- **Profile widget** — identicon (via `@nimiq/iqons` if installed, else the
  hexagon placeholder) + label + address + optional injected balance + copy /
  disconnect buttons. Re-renders on account change and language change.
- **Language switcher** — a row of flag-hexagon buttons, one per language, with the
  Nimiq tooltip styling. Clicking one calls `i18n.setLanguage(id)`.

Both inject their own `<style>` once and return a handle with `destroy()`.

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
