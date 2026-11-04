import { describe, expect, test } from 'bun:test';
import { HubBackend } from './hub-backend';
import { MiniAppBackend, type MiniAppProvider } from './miniapp-backend';
import { buildHandleClaimPayload, parseHandleClaim } from '../format/handle';

// What lands on chain, one fixture per wallet. No wallet is involved in this file.
//
// The Pay model is measured, not read off a contract: the SDK types `data` as a bare
// string and Pay utf-8 encodes it. selfcrypto/nns measured a 14-byte message landing
// as 28 bytes, and the @handle registry NQ19 LLHP... holds 78 "NFH:..." text memos
// (newest e99d0ef0dcb6, 2026-09-28) beside 3 from senders who hexed first, which
// landed as the ASCII of the digits (e21fc77cd20c decodes to "636174616c6f67").
// A real send through this code is still unproven.
const payStores = (data: string) => new TextEncoder().encode(data);

const RECIPIENT = 'NQ22 2222 2222 2222 2222 2222 2222 2222 2222';
const SENDER = 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000';
const utf8 = (s: string) => new TextEncoder().encode(s);
const hexOf = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');

function pay() {
  const calls: string[] = [];
  const onChain: Uint8Array[] = [];
  const provider: MiniAppProvider = {
    listAccounts: async () => [SENDER],
    sendBasicTransaction: async () => (calls.push('basic'), 'ser-basic'),
    sendBasicTransactionWithData: async (tx) => (calls.push('data'), onChain.push(payStores(tx.data)), 'ser-data'),
    sign: async () => ({ publicKey: '', signature: '' }),
  };
  return { backend: new MiniAppBackend({ provider }), calls, onChain };
}

function hub() {
  const signed: (Uint8Array | undefined)[] = [];
  const checkedOut: (Uint8Array | undefined)[] = [];
  const backend = new HubBackend({
    client: {
      chooseAddress: async () => ({ address: SENDER, label: '' }),
      signTransaction: async (req: { extraData?: Uint8Array }) => (signed.push(req.extraData), { serializedTx: 's', hash: 'h' }),
      checkout: async (req: { extraData?: Uint8Array }) => (checkedOut.push(req.extraData), { serializedTx: 's', hash: 'h' }),
      signMessage: async () => { throw new Error('unused'); },
    } as never,
  });
  backend.restore({ address: SENDER, label: '' });
  return { backend, signed, checkedOut };
}

const send = { recipient: RECIPIENT, valueLuna: 1, validityStartHeight: 7 };

const CARRIED: [string, string | Uint8Array, Uint8Array][] = [
  ['a text memo', 'np:42:hé 🐶', utf8('np:42:hé 🐶')],
  ['text bytes', utf8('ng:abc:fee'), utf8('ng:abc:fee')],
  ['text that reads as hex stays that text', 'cafe', utf8('cafe')],
  ['a leading BOM is kept', new Uint8Array([0xef, 0xbb, 0xbf, 0x61]), new Uint8Array([0xef, 0xbb, 0xbf, 0x61])],
  ['a claim, control bytes and all', new Uint8Array([0x4e, 0x46, 0x01, 0x01, 0x61]), new Uint8Array([0x4e, 0x46, 0x01, 0x01, 0x61])],
];

describe('the bytes on chain are the bytes the caller meant', () => {
  for (const [name, data, want] of CARRIED) {
    test(`Pay: ${name}`, async () => {
      const { backend, onChain } = pay();
      await backend.signAndSend({ ...send, data });
      expect(onChain).toEqual([want]);
    });

    test(`Hub: ${name}`, async () => {
      const { backend, signed, checkedOut } = hub();
      await backend.signAndSend({ ...send, data });
      await backend.pay({ ...send, data });
      expect(signed).toEqual([want]);
      expect(checkedOut).toEqual([want]);
    });
  }

  test('Pay never hands over hex for text, so no digits land', async () => {
    const { backend, onChain } = pay();
    await backend.signAndSend({ ...send, data: 'hi' });
    expect(onChain[0]!.length).toBe(2);
    expect(hexOf(onChain[0]!)).toBe('6869');
  });

  test('a Pay handle claim reads back from the chain as a claim, in its single-hex form', async () => {
    const claim = buildHandleClaimPayload('chuck');
    const { backend, onChain } = pay();
    await backend.pay({ ...send, data: claim.extraData });
    expect(hexOf(onChain[0]!)).toBe(hexOf(utf8(claim.extraData)));
    expect(parseHandleClaim(hexOf(onChain[0]!))).toBe('chuck');
  });

  test('Pay refuses bytes it cannot carry before anything is sent; the Hub carries them', async () => {
    const binary = new Uint8Array([0, 255, 16]);
    const p = pay();
    await expect(p.backend.signAndSend({ ...send, data: binary })).rejects.toThrow(/nothing was sent/);
    expect(p.calls).toEqual([]);

    const h = hub();
    await h.backend.pay({ ...send, data: binary });
    expect(h.checkedOut).toEqual([binary]);
  });

  test('empty data is a basic send on Pay and no extraData on the Hub', async () => {
    const p = pay();
    await p.backend.signAndSend({ ...send, data: '' });
    await p.backend.signAndSend({ ...send, data: new Uint8Array() });
    expect(p.calls).toEqual(['basic', 'basic']);
    const h = hub();
    await h.backend.pay({ ...send, data: '' });
    expect(h.checkedOut).toEqual([undefined]);
  });
});
