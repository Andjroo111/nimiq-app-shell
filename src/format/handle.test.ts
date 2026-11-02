import { describe, expect, test } from 'bun:test';
import {
  buildHandleClaimPayload,
  HANDLE_REGISTRY_ADDRESS,
  handleOf,
  isHandleAvailable,
  normalizeHandle,
  parseHandleClaim,
  type RegistryTx,
  resolveHandleRegistry,
} from './handle';

const A = 'NQ63 9K3A TULC 1SFU BYSE 11VP 36BT REST BF61';
const B = 'NQ20 8P9L 3YMD GQYT 1TAA 8D0G MC12 5HBQ 1Q8A';
const HTLC = 'NQ02 FCGC CB5D E9FU 9SPP 1N6A 8XQL L7QG EME6';
const textHex = (s: string) => [...s].map((c) => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');

let n = 0;
const claim = (handle: string, sender: string, blockNumber: number, txIndex = 0, over: Partial<RegistryTx> = {}): RegistryTx => ({
  hash: `${(++n).toString(16).padStart(64, '0')}`,
  sender,
  recipient: HANDLE_REGISTRY_ADDRESS,
  recipientData: buildHandleClaimPayload(handle).rawHex,
  blockNumber,
  txIndex,
  executionResult: true,
  ...over,
});

describe('@handle registry (recon C1-381)', () => {
  test('the claim payload matches the protocol doc byte for byte (chuck)', () => {
    expect(buildHandleClaimPayload('chuck')).toEqual({
      recipient: 'NQ19 LLHP G0ML 37RM 5JJD RME1 GLFY 75PQ 402Y',
      handle: 'chuck',
      rawHex: '4e460101636875636b',
      extraData: 'NFH:4e460101636875636b',
    });
  });

  test('handle names: 3 to 31 of [a-z0-9_], @ and case forgiven on input only', () => {
    expect(normalizeHandle('@Chuck ')).toBe('chuck');
    expect(normalizeHandle('ab')).toBeNull();
    expect(normalizeHandle('a'.repeat(32))).toBeNull();
    expect(normalizeHandle('bad-name')).toBeNull();
    expect(normalizeHandle(42)).toBeNull();
    expect(() => buildHandleClaimPayload('x')).toThrow(RangeError);
  });

  test('parse reads both the binary (Hub) and the NFH: text (Nimiq Pay) forms', () => {
    expect(parseHandleClaim('4e460101636875636b')).toBe('chuck');
    expect(parseHandleClaim(textHex('NFH:4e460101636875636b'))).toBe('chuck');
    expect(parseHandleClaim('0x4E460101636875636B')).toBe('chuck');
  });

  test('parse refuses anything that is not exactly a claim', () => {
    expect(parseHandleClaim('4e460102636875636b')).toBeNull(); // wrong type
    expect(parseHandleClaim('4e460101436875636b')).toBeNull(); // "Chuck": uppercase is not a claim
    expect(parseHandleClaim('4e4601016368')).toBeNull(); // too short a name
    expect(parseHandleClaim(textHex('NFH:zz'))).toBeNull();
    expect(parseHandleClaim('abc')).toBeNull();
    expect(parseHandleClaim(null)).toBeNull();
    expect(parseHandleClaim('')).toBeNull();
  });

  test('earliest (blockNumber, txIndex) wins, whatever order the RPC returns', () => {
    const late = claim('chuck', B, 100, 0);
    const sameBlockLater = claim('chuck', B, 50, 3);
    const winner = claim('chuck', A, 50, 1);
    const r = resolveHandleRegistry([late, sameBlockLater, winner]);
    expect(r.get('chuck')).toMatchObject({ owner: A, blockNumber: 50, txIndex: 1, hash: winner.hash });
  });

  test('failed txs, txs to another address and junk data claim nothing', () => {
    const r = resolveHandleRegistry([
      claim('chuck', B, 1, 0, { executionResult: false }),
      claim('chuck', B, 2, 0, { recipient: A }),
      claim('chuck', B, 3, 0, { recipientData: 'deadbeef' }),
      claim('chuck', A, 9, 0),
    ]);
    expect(r.get('chuck')?.owner).toBe(A);
  });

  test('ownerOf credits an HTLC claim to its creator; unknown keeps the sender', () => {
    const r = resolveHandleRegistry([claim('payuser', HTLC, 5), claim('other', B, 6)], (s) => (s === HTLC ? A : null));
    expect(r.get('payuser')?.owner).toBe(A);
    expect(r.get('other')?.owner).toBe(B);
  });

  test('by address: the earliest winning claim; availability checks the name too', () => {
    const r = resolveHandleRegistry([claim('second', A, 20), claim('first', A, 10), claim('bee', B, 15)]);
    expect(handleOf(r, A.replace(/ /g, '').toLowerCase())?.handle).toBe('first');
    expect(handleOf(r, HTLC)).toBeNull();
    expect(isHandleAvailable(r, '@First')).toBe(false);
    expect(isHandleAvailable(r, 'free_name')).toBe(true);
    expect(isHandleAvailable(r, 'no')).toBe(false);
  });
});
