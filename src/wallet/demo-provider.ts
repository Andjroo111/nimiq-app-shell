// A stand-in Nimiq Pay provider for browser previews and CI (recon C2-302, C2-264).
//
// Plugs into the real code path (new MiniAppBackend({ provider })), so every
// screen runs end to end with no phone, no chain and no money. It is loud
// about what it is: the account is a fixed DEMO address, every "tx hash" it
// returns starts with `demo`, which is not 64-hex, so any server that
// verifies on chain refuses it, and `isDemo` is true on the object.
//
// Never wire it as a production fallback on a money path. createDemoProvider
// throws unless `allow` is true, so it cannot be reached by accident.

import type { MiniAppProvider } from './miniapp-backend';

/** Checksum-valid but unspendable: the all-zero burn address. */
export const DEMO_ADDRESS = 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000';

export interface DemoProviderOptions {
  /** Must be true. Pass it from a dev/test-only flag. */
  allow: boolean;
  address?: string;
  latencyMs?: number;
  /** Make the next calls fail like a real wallet: 'cancel' | 'syncing' | 'insufficient'. */
  failWith?: 'cancel' | 'syncing' | 'insufficient' | null;
  /** Starting block height for getBlockNumber. */
  startHeight?: number;
}

export interface DemoProvider extends MiniAppProvider {
  readonly isDemo: true;
  isConsensusEstablished(): Promise<boolean>;
  getBlockNumber(): Promise<number>;
  /** Everything "sent", for assertions in tests. */
  sent(): { recipient: string; value: number; data?: string; handle: string }[];
  setFailure(f: DemoProviderOptions['failWith']): void;
}

const ERRORS = {
  cancel: { error: { type: 'USER_REJECTED', message: 'User rejected the request' } },
  syncing: { error: { type: 'SYNCING', message: 'Your wallet is still syncing your account' } },
  insufficient: { error: { type: 'INSUFFICIENT_FUNDS', message: 'insufficient balance' } },
} as const;

export function createDemoProvider(o: DemoProviderOptions): DemoProvider {
  if (o.allow !== true) throw new Error('createDemoProvider: pass { allow: true } from a dev/test-only flag');
  const address = o.address ?? DEMO_ADDRESS;
  const latency = Math.max(0, Number.isFinite(o.latencyMs) ? (o.latencyMs as number) : 300);
  let failure = o.failWith ?? null;
  let height = Number.isSafeInteger(o.startHeight) ? (o.startHeight as number) : 1_000_000;
  const log: { recipient: string; value: number; data?: string; handle: string }[] = [];
  let n = 0;
  const wait = () => new Promise<void>((r) => setTimeout(r, latency));

  const send = async (tx: { recipient: string; value: number; data?: string }) => {
    await wait();
    if (failure) return ERRORS[failure];
    if (!Number.isSafeInteger(tx.value) || tx.value <= 0) return { error: { type: 'INVALID', message: 'invalid amount' } };
    const handle = `demo-${(++n).toString().padStart(4, '0')}-${Date.now().toString(36)}`;
    log.push({ recipient: tx.recipient, value: tx.value, ...(tx.data !== undefined ? { data: tx.data } : {}), handle });
    height += 1;
    return handle;
  };

  return {
    isDemo: true,
    async listAccounts() {
      await wait();
      return failure === 'cancel' ? ERRORS.cancel : [address];
    },
    sendBasicTransaction: (tx) => send(tx),
    sendBasicTransactionWithData: (tx) => send(tx),
    async sign(message) {
      await wait();
      if (failure === 'cancel') return ERRORS.cancel;
      const text = typeof message === 'string' ? message : message.message;
      // Not a signature: 64 bytes of a recognisable pattern that never verifies.
      return { publicKey: '00'.repeat(32), signature: `de${'00'.repeat(63)}`, demoSignedText: text } as never;
    },
    async isConsensusEstablished() {
      return failure !== 'syncing';
    },
    async getBlockNumber() {
      return height;
    },
    sent: () => log.map((x) => ({ ...x })),
    setFailure(f) {
      failure = f ?? null;
    },
  };
}
