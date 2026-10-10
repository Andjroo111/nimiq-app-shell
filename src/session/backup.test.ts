import { describe, expect, test } from 'bun:test';
import {
  backupMessage,
  canonicalJson,
  checkBackupEnvelope,
  createStateBackup,
  sha256Hex,
  type BackupEnvelope,
  type BackupSignatureVerifier,
  type BackupTransport,
} from './backup';
import type { SignMessageResult } from '../wallet/types';

const A = 'NQ45 78MF K2AA NREJ B39U YLRH C8B3 7S1X MH44';
const AC = A.replace(/ /g, '');
const B = 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000';
const APP = 'nimiq.party';
const ORIGIN = 'https://nimiq.party';

// A stand-in signer: the "signature" is sha256(key || message) twice over, the
// "public key" names the address. The real verifier checks Ed25519 over the
// Nimiq signed-message hash and derives the address from the key.
const keyFor = async (addr: string) => (await sha256Hex('pk:' + addr.replace(/ /g, '').toUpperCase())).slice(0, 64);
const sigFor = async (pk: string, msg: string) => (await sha256Hex(pk + msg)) + (await sha256Hex(msg + pk));
const signerFor = (addr: string, counter = { n: 0 }) => async (message: string): Promise<SignMessageResult> => {
  counter.n++;
  const publicKeyHex = await keyFor(addr);
  return { address: addr, message, publicKeyHex, signatureHex: await sigFor(publicKeyHex, message), prefix: 'signed-message' };
};
const verify: BackupSignatureVerifier = async (e) => e.publicKeyHex === (await keyFor(e.address)) && e.signatureHex === (await sigFor(e.publicKeyHex, e.message));

// A server that does what the docs say a server must: check, then keep the newest.
const server = () => {
  const rows = new Map<string, BackupEnvelope>();
  const t: BackupTransport & { rows: typeof rows } = {
    rows,
    async get(address) {
      return rows.get(address) ?? null;
    },
    async put(e) {
      const c = await checkBackupEnvelope(e, { app: APP, origin: ORIGIN, minVersion: rows.get(e.address)?.version ?? 0, verifySignature: verify, now: Date.now(), maxSkewMs: 600_000 });
      if (!c.ok) throw new Error(c.reason);
      rows.set(e.address, e);
    },
  };
  return t;
};

describe('canonicalJson', () => {
  test('sorts keys at every depth, rejects what JSON would lose', () => {
    expect(canonicalJson({ b: 1, a: { d: [1, { z: 0, y: null }], c: 'x' } })).toBe('{"a":{"c":"x","d":[1,{"y":null,"z":0}]},"b":1}');
    for (const bad of [undefined, () => 1, Number.NaN, 1n, { a: undefined }]) expect(() => canonicalJson(bad)).toThrow(TypeError);
    const cyc: Record<string, unknown> = {};
    cyc.self = cyc;
    expect(() => canonicalJson(cyc)).toThrow('cycle');
    const shared = { x: 1 };
    expect(canonicalJson([shared, shared])).toBe('[{"x":1},{"x":1}]');
  });
});

describe('createStateBackup', () => {
  test('wipe recovery: save on one device, restore after the storage is gone', async () => {
    const srv = server();
    const b1 = createStateBackup<{ name: string; cars: string[] }>({ app: APP, origin: ORIGIN, signMessage: signerFor(A), transport: srv });
    expect(await b1.save(A, { name: 'ACE', cars: ['red'] })).toEqual({ state: 'saved', version: 1 });
    const b2 = createStateBackup<{ name: string; cars: string[] }>({ app: APP, origin: ORIGIN, signMessage: signerFor(A), transport: srv, verifySignature: verify });
    expect(await b2.restore(A)).toEqual({ state: 'restored', value: { name: 'ACE', cars: ['red'] }, version: 1 });
    expect(await b2.restore(B)).toEqual({ state: 'none' });
  });

  test('unchanged payload does not open the wallet; a change bumps the version', async () => {
    const srv = server();
    const n = { n: 0 };
    const b = createStateBackup({ app: APP, origin: ORIGIN, signMessage: signerFor(A, n), transport: srv });
    await b.save(A, { a: 1, b: 2 });
    expect(await b.save(A, { b: 2, a: 1 })).toEqual({ state: 'unchanged', version: 1 });
    expect(n.n).toBe(1);
    expect(await b.save(A, { a: 2 })).toEqual({ state: 'saved', version: 2 });
    // A fresh page learns the version from the server before signing.
    const fresh = createStateBackup({ app: APP, origin: ORIGIN, signMessage: signerFor(A, n), transport: srv });
    expect(await fresh.save(A, { a: 2 })).toEqual({ state: 'unchanged', version: 2 });
    expect(await fresh.save(A, { a: 3 })).toEqual({ state: 'saved', version: 3 });
  });

  test('the signed message names app, origin, address, version and payload hash', async () => {
    const srv = server();
    let seen = '';
    await createStateBackup({ app: APP, origin: ORIGIN, transport: srv, signMessage: async (m) => ((seen = m), signerFor(A)(m)) }).save(A, { x: 1 });
    expect(seen.split('\n')).toEqual([
      'Nimiq app state backup',
      `App: ${APP}`,
      `Origin: ${ORIGIN}`,
      `Address: ${AC}`,
      'Version: 1',
      expect.stringMatching(/^Issued at: \d{4}-\d\d-\d\dT/),
      `Payload SHA-256: ${await sha256Hex('{"x":1}')}`,
    ]);
  });

  test('wallet cancel, wrong account, or a rewritten message: refused, nothing stored', async () => {
    const srv = server();
    const cancel = createStateBackup({ app: APP, origin: ORIGIN, transport: srv, signMessage: async () => { throw { code: 4001, message: 'User rejected' }; } });
    expect(await cancel.save(A, { x: 1 })).toEqual({ state: 'refused', reason: 'User rejected' });
    const other = createStateBackup({ app: APP, origin: ORIGIN, transport: srv, signMessage: signerFor(B) });
    expect((await other.save(A, { x: 1 })).state).toBe('refused');
    const swapped = createStateBackup({ app: APP, origin: ORIGIN, transport: srv, signMessage: async (m) => signerFor(A)(m + ' ') });
    expect(await swapped.save(A, { x: 1 })).toEqual({ state: 'refused', reason: 'the wallet signed a different message' });
    expect(srv.rows.size).toBe(0);
  });

  test('a server refusal is surfaced and the next save re-reads the version', async () => {
    const srv = server();
    const b = createStateBackup({ app: APP, origin: ORIGIN, signMessage: signerFor(A), transport: srv });
    await b.save(A, { x: 1 });
    // Another device writes v2 meanwhile.
    const other = createStateBackup({ app: APP, origin: ORIGIN, signMessage: signerFor(A), transport: srv });
    await other.restore(A);
    await other.save(A, { x: 2 });
    expect(await b.save(A, { x: 3 })).toEqual({ state: 'refused', reason: 'stale version' });
    expect(await b.save(A, { x: 3 })).toEqual({ state: 'saved', version: 3 });
  });

  test('restore: tampered or foreign envelopes are invalid, an outage is unreachable', async () => {
    const srv = server();
    await createStateBackup({ app: APP, origin: ORIGIN, signMessage: signerFor(A), transport: srv }).save(A, { coins: 5 });
    const good = srv.rows.get(AC)!;
    const b = createStateBackup({ app: APP, origin: ORIGIN, signMessage: signerFor(A), transport: srv, verifySignature: verify });
    srv.rows.set(AC, { ...good, payload: '{"coins":5000}' });
    expect(await b.restore(A)).toEqual({ state: 'invalid', reason: 'payload hash mismatch' });
    const otherApp = createStateBackup({ app: 'nimiq.tips', origin: ORIGIN, signMessage: signerFor(A), transport: srv });
    srv.rows.set(AC, good);
    expect(await otherApp.restore(A)).toEqual({ state: 'invalid', reason: 'wrong app' });
    const down = createStateBackup({ app: APP, origin: ORIGIN, signMessage: signerFor(A), transport: { get: async () => { throw new Error('503'); }, put: async () => {} } });
    expect(await down.restore(A)).toEqual({ state: 'unreachable', reason: '503' });
  });

  test('payload size cap', async () => {
    const b = createStateBackup({ app: APP, origin: ORIGIN, signMessage: signerFor(A), transport: server(), maxBytes: 16 });
    expect(await b.save(A, { s: 'x'.repeat(20) })).toEqual({ state: 'refused', reason: 'payload too large' });
  });

  test('app and origin must be single lines', () => {
    expect(() => createStateBackup({ app: 'a\nOrigin: evil', origin: ORIGIN, signMessage: signerFor(A), transport: server() })).toThrow(TypeError);
  });
});

describe('checkBackupEnvelope (the server side)', () => {
  const make = async (over: Partial<Parameters<typeof backupMessage>[0]> & { payload?: string } = {}) => {
    const payload = over.payload ?? '{"x":1}';
    const f = { app: APP, origin: ORIGIN, address: AC, version: 1, issuedAt: 1_700_000_000_000, payloadSha256: await sha256Hex(payload), ...over };
    const message = backupMessage(f);
    const s = await signerFor(f.address)(message);
    return { v: 1 as const, ...f, payload, message, publicKeyHex: s.publicKeyHex, signatureHex: s.signatureHex };
  };
  const opts = { app: APP, origin: ORIGIN, verifySignature: verify };

  test('accepts a well-formed signed envelope', async () => {
    expect(await checkBackupEnvelope(await make(), opts)).toEqual({ ok: true, value: { x: 1 } });
  });

  test('an unsigned write (MiniRush style) is refused', async () => {
    const e = await make();
    expect(await checkBackupEnvelope({ ...e, signatureHex: '0'.repeat(128) }, opts)).toEqual({ ok: false, reason: 'signature does not verify' });
  });

  test('another wallet\'s key cannot write this address', async () => {
    const e = await make();
    const pk = await keyFor(B);
    expect((await checkBackupEnvelope({ ...e, publicKeyHex: pk, signatureHex: await sigFor(pk, e.message) }, opts)).ok).toBe(false);
  });

  test('replay: same or older version is stale', async () => {
    const e = await make({ version: 3 });
    expect(await checkBackupEnvelope(e, { ...opts, minVersion: 3 })).toEqual({ ok: false, reason: 'stale version' });
    expect((await checkBackupEnvelope(e, { ...opts, minVersion: 2 })).ok).toBe(true);
  });

  test('fields edited after signing break the message match', async () => {
    const e = await make();
    expect((await checkBackupEnvelope({ ...e, version: 9 }, opts)).ok).toBe(false);
    expect(await checkBackupEnvelope({ ...e, origin: 'https://evil.example' }, { ...opts, origin: 'https://evil.example' })).toEqual({ ok: false, reason: 'message does not match fields' });
  });

  test('write-time freshness window', async () => {
    const e = await make();
    expect(await checkBackupEnvelope(e, { ...opts, now: e.issuedAt + 601_000, maxSkewMs: 600_000 })).toEqual({ ok: false, reason: 'issuedAt out of window' });
  });

  test('non-canonical payload, junk, a throwing verifier: refused, never throws', async () => {
    const p = '{ "x": 1 }';
    expect(await checkBackupEnvelope(await make({ payload: p }), opts)).toEqual({ ok: false, reason: 'payload is not canonical' });
    for (const junk of [null, 1, 'x', {}, { v: 1 }]) expect((await checkBackupEnvelope(junk, opts)).ok).toBe(false);
    expect(await checkBackupEnvelope(await make(), { ...opts, verifySignature: () => { throw new Error('boom'); } })).toEqual({ ok: false, reason: 'signature does not verify' });
  });
});
