import { describe, expect, test } from 'bun:test';
import { addressFromPublicKey, signedMessageDigest, type SignMessageDomain } from '../vendor/settlement/sign-message';
import { checkBackupEnvelope, compactAddress, createStateBackup, type BackupEnvelope, type BackupTransport } from './backup';
import { nimiqBackupVerifier } from './backup-verifier';
import type { SignMessageResult } from '../wallet/types';

const APP = 'nimiq.party';
const ORIGIN = 'https://nimiq.party';
const hex = (b: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('');

// A real Ed25519 wallet that signs the way Nimiq does: over the prefixed digest.
async function wallet(domain: SignMessageDomain = 'signed-message') {
  const kp = (await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify'])) as CryptoKeyPair;
  const pk = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
  const address = addressFromPublicKey(pk);
  const signMessage = async (message: string): Promise<SignMessageResult> => {
    const sig = await crypto.subtle.sign('Ed25519', kp.privateKey, (await signedMessageDigest(message, domain)) as BufferSource);
    return { address, message, publicKeyHex: hex(pk), signatureHex: hex(sig), prefix: domain === 'signed-message' ? 'signed-message' : 'connect-challenge' };
  };
  return { address, signMessage };
}

const server = (verify = nimiqBackupVerifier()) => {
  const rows = new Map<string, BackupEnvelope>();
  const t: BackupTransport & { rows: typeof rows; lastPut?: BackupEnvelope } = {
    rows,
    async get(a) {
      return rows.get(a) ?? null;
    },
    async put(e) {
      t.lastPut = e;
      const c = await checkBackupEnvelope(e, { app: APP, origin: ORIGIN, minVersion: rows.get(e.address)?.version ?? 0, verifySignature: verify });
      if (!c.ok) throw new Error(c.reason);
      rows.set(e.address, e);
    },
  };
  return t;
};

describe('nimiqBackupVerifier', () => {
  test('a real Nimiq signature round-trips: save, wipe, restore with the check on', async () => {
    const w = await wallet();
    const srv = server();
    expect(await createStateBackup({ app: APP, origin: ORIGIN, signMessage: w.signMessage, transport: srv }).save(w.address, { coins: 5 })).toEqual({ state: 'saved', version: 1 });
    const fresh = createStateBackup({ app: APP, origin: ORIGIN, signMessage: w.signMessage, transport: srv, verifySignature: nimiqBackupVerifier() });
    expect(await fresh.restore(w.address)).toEqual({ state: 'restored', value: { coins: 5 }, version: 1 });
  });

  test('wallet B signing an envelope that claims wallet A is refused', async () => {
    const a = await wallet();
    const b = await wallet();
    const srv = server();
    const forged = createStateBackup({ app: APP, origin: ORIGIN, transport: srv, signMessage: async (m) => ({ ...(await b.signMessage(m)), address: a.address }) });
    expect(await forged.save(a.address, { coins: 9999 })).toEqual({ state: 'refused', reason: 'signature does not verify' });
    expect(srv.rows.size).toBe(0);
  });

  test('a tampered signature or message fails', async () => {
    const w = await wallet();
    const srv = server();
    await createStateBackup({ app: APP, origin: ORIGIN, signMessage: w.signMessage, transport: srv }).save(w.address, { x: 1 });
    const e = srv.rows.get(compactAddress(w.address))!;
    const v = nimiqBackupVerifier();
    const flip = (s: string) => (s[0] === '0' ? '1' : '0') + s.slice(1);
    expect(await v(e)).toBe(true);
    expect(await v({ ...e, signatureHex: flip(e.signatureHex) })).toBe(false);
    expect(await v({ ...e, message: e.message + ' ' })).toBe(false);
  });

  test('a connect-challenge signature is refused unless the caller opts in', async () => {
    const w = await wallet('connect-challenge');
    const srv = server();
    await createStateBackup({ app: APP, origin: ORIGIN, signMessage: w.signMessage, transport: srv }).save(w.address, { x: 1 });
    expect(srv.rows.size).toBe(0);
    const e = srv.lastPut!;
    expect(await nimiqBackupVerifier()(e)).toBe(false);
    expect(await nimiqBackupVerifier({ accept: ['signed-message', 'connect-challenge'] })(e)).toBe(true);
  });

  test('the all-zero key is refused (forgeable on WebCrypto)', async () => {
    const w = await wallet();
    const srv = server();
    await createStateBackup({ app: APP, origin: ORIGIN, signMessage: w.signMessage, transport: srv }).save(w.address, { x: 1 });
    const e = srv.rows.get(compactAddress(w.address))!;
    expect(await nimiqBackupVerifier()({ ...e, publicKeyHex: '0'.repeat(64), signatureHex: '0'.repeat(128) })).toBe(false);
  });
});
