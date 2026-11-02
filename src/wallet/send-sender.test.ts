import { describe, expect, test } from 'bun:test';
import { classifySendResult } from './send-handle';
import { checkSendSender, DIFFERENT_ACCOUNT_MESSAGE } from './send-sender';

const ME = 'NQ63 9K3A TULC 1SFU BYSE 11VP 36BT REST BF61';
const OTHER = 'NQ20 8P9L 3YMD GQYT 1TAA 8D0G MC12 5HBQ 1Q8A';
const SERIALIZED = 'ab'.repeat(80);
const decodeAs = (who: string | null) => (_hex: string) => who;

describe('checkSendSender (recon C2-441)', () => {
  test('a serialized tx from the session account matches, whatever the spacing or case', () => {
    const h = classifySendResult(SERIALIZED);
    expect(checkSendSender(h, ME, decodeAs(ME.toLowerCase().replace(/ /g, '')))).toEqual({ state: 'match' });
  });

  test('a serialized tx from another account is a mismatch with a plain message', () => {
    const r = checkSendSender(classifySendResult(SERIALIZED), ME, decodeAs(OTHER));
    expect(r).toEqual({ state: 'mismatch', sender: OTHER, expected: ME, message: DIFFERENT_ACCOUNT_MESSAGE });
  });

  test('a hash-only, opaque or missing handle has no sender to read', () => {
    expect(checkSendSender(classifySendResult('a'.repeat(64)), ME, decodeAs(OTHER))).toEqual({ state: 'unknown', why: 'no-serialized-tx' });
    expect(checkSendSender(classifySendResult('0xnope'), ME, decodeAs(OTHER))).toEqual({ state: 'unknown', why: 'no-serialized-tx' });
    expect(checkSendSender(null, ME, decodeAs(OTHER))).toEqual({ state: 'unknown', why: 'no-serialized-tx' });
  });

  test('no decoder, a null answer or a throwing decoder is unknown, never a match', () => {
    const h = classifySendResult(SERIALIZED);
    expect(checkSendSender(h, ME)).toEqual({ state: 'unknown', why: 'no-decoder' });
    expect(checkSendSender(h, ME, decodeAs(null))).toEqual({ state: 'unknown', why: 'undecodable' });
    expect(checkSendSender(h, ME, decodeAs(''))).toEqual({ state: 'unknown', why: 'undecodable' });
    const boom = () => {
      throw new Error('bad bytes');
    };
    expect(checkSendSender(h, ME, boom)).toEqual({ state: 'unknown', why: 'undecodable' });
  });
});
