// createWallet — the single entry point. Auto-detects the runtime and returns
// one unified Wallet that routes connect/signAndSend/onAccountChange/disconnect
// to the selected backend (mini-app or Hub).

import type {
  Account,
  AccountChangeListener,
  CreateWalletOptions,
  SendArgs,
  SendResult,
  Wallet,
  WalletMode,
} from './types';
import type { WalletBackend } from './backend';
import { detectModeSync } from './detect';
import { MiniAppBackend, type MiniAppBackendOptions } from './miniapp-backend';
import { HubBackend, type HubBackendOptions } from './hub-backend';

export type {
  Account,
  AccountChangeListener,
  CreateWalletOptions,
  SendArgs,
  SendResult,
  Wallet,
  WalletMode,
};
export { detectModeSync, isMiniAppHost, hasNimiqProvider } from './detect';
export { MiniAppBackend, type MiniAppProvider } from './miniapp-backend';
export { HubBackend, type HubClient } from './hub-backend';
export type { WalletBackend } from './backend';

/** Extra (test/advanced) knobs forwarded to the chosen backend. Not part of the
 *  public happy path — apps generally only need CreateWalletOptions. */
export interface CreateWalletAdvanced {
  miniApp?: MiniAppBackendOptions;
  hub?: Omit<HubBackendOptions, 'appName' | 'hubEndpoint'>;
}

export function createWallet(
  opts: CreateWalletOptions = {},
  advanced: CreateWalletAdvanced = {},
): Wallet {
  const mode: WalletMode =
    opts.mode && opts.mode !== 'auto' ? opts.mode : detectModeSync();

  const backend: WalletBackend =
    mode === 'miniapp'
      ? new MiniAppBackend(advanced.miniApp)
      : new HubBackend({
          appName: opts.appName ?? 'Nimiq App',
          hubEndpoint: opts.hubEndpoint,
          ...advanced.hub,
        });

  const listeners = new Set<AccountChangeListener>();
  let account: Account | null = null;

  backend.setAccountChange((next) => {
    account = next;
    for (const cb of listeners) cb(next);
  });

  const wallet: Wallet = {
    mode,
    get account() {
      return account;
    },
    set account(v: Account | null) {
      account = v;
    },
    async connect(): Promise<Account | null> {
      const result = await backend.connect();
      // Backends fire setAccountChange themselves; keep the getter in sync for
      // the desktop path where connect resolves the account directly.
      if (result) account = result;
      return result;
    },
    signAndSend(args: SendArgs): Promise<SendResult> {
      return backend.signAndSend(args);
    },
    onAccountChange(cb: AccountChangeListener): () => void {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    disconnect(): void {
      backend.disconnect();
      account = null;
    },
  };

  return wallet;
}
