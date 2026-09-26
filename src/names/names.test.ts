// The fixtures are two real mainnet answers for `gaston`, recorded 2026-09-26
// from both shipped resolvers. They carry real Merkle proofs, so the "found"
// test runs THEIR verification end to end offline, not a mock of it.
import { describe, expect, test } from 'bun:test';
import { createNameResolver, isNameInput, nameQuery } from './index';
import a from './fixtures/gaston.api.nimiqnames.com.json';
import b from './fixtures/gaston.nns.sonartech.pro.json';

const GASTON = 'NQ12ACQM28QLU8T2L9J1GVN4NJPL1P3GENVG';

const reply = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

/** A fetch that answers per host, so each resolver can disagree on purpose. */
function fakeFetch(byHost: Record<string, () => Promise<Response>>): typeof fetch {
  return ((url: string) => {
    const host = new URL(url).host;
    const answer = byHost[host];
    if (!answer) throw new Error(`unexpected host ${host}`);
    return answer();
  }) as typeof fetch;
}

describe('nameQuery', () => {
  test('a name is a name, whatever case it was typed in', () => {
    expect(nameQuery('gaston')).toBe('gaston');
    expect(nameQuery('  Gaston ')).toBe('gaston');
    expect(nameQuery('@gaston')).toBe('gaston');
  });

  test('a dotted query is a subdomain and still a name', () => {
    expect(nameQuery('alice.gaston')).toBe('alice.gaston');
  });

  test('an address is never a name, even the prefix that is legal name syntax', () => {
    expect(nameQuery('nq4')).toBeNull();
    expect(nameQuery('NQ48')).toBeNull();
    expect(nameQuery('NQ12 ACQM 28QL')).toBeNull();
    expect(nameQuery('nimiq:NQ12ACQM')).toBeNull();
  });

  test('text outside their syntax is not a name', () => {
    expect(nameQuery('')).toBeNull();
    expect(nameQuery('bad_name')).toBeNull();
    expect(nameQuery('a1b')).toBeNull();
    expect(nameQuery('a.b.c')).toBeNull();
  });
});

describe('isNameInput', () => {
  test('anything typed that is not an address, including prefixes too short to query', () => {
    expect(isNameInput('g')).toBe(true);
    expect(isNameInput('nobo')).toBe(true);
    expect(isNameInput('nq')).toBe(true);
    expect(isNameInput('nq4')).toBe(false);
    expect(isNameInput('NQ12 ACQM')).toBe(false);
    expect(isNameInput('  ')).toBe(false);
  });
});

describe('lookup', () => {
  test('two agreeing resolvers with a proof give the address', async () => {
    const r = createNameResolver({
      fetch: fakeFetch({
        'api.nimiqnames.com': () => reply(200, a),
        'nns.sonartech.pro': () => reply(200, b),
      }),
    });
    const got = await r.lookup('Gaston');
    expect(got).toEqual({ state: 'found', query: 'gaston', address: GASTON, verification: 'PROVEN', agreed: 2 });
  });

  test('an unregistered name is missing, not failed', async () => {
    const miss = () => reply(404, { error: 'NOT_FOUND', name: 'nobodyhere', height: 1 });
    const r = createNameResolver({
      fetch: fakeFetch({ 'api.nimiqnames.com': miss, 'nns.sonartech.pro': miss }),
    });
    expect((await r.lookup('nobodyhere')).state).toBe('missing');
  });

  test('one resolver down means no address, never the other one alone', async () => {
    const r = createNameResolver({
      fetch: fakeFetch({
        'api.nimiqnames.com': () => reply(200, a),
        'nns.sonartech.pro': () => reply(500, { error: 'INTERNAL' }),
      }),
    });
    expect((await r.lookup('gaston')).state).toBe('failed');
  });

  const OTHER = 'NQ48 8CKH BA24 2VR3 N249 N8MN J5XX 74DB 5XJ8';

  test('a target the proof does not back is pending, never an address', async () => {
    const forged = { ...a, target: OTHER };
    const r = createNameResolver({
      fetch: fakeFetch({
        'api.nimiqnames.com': () => reply(200, forged),
        'nns.sonartech.pro': () => reply(200, forged),
      }),
    });
    expect(await r.lookup('gaston')).toEqual({ state: 'pending', query: 'gaston' });
  });

  test('a tampered proof fails and is refused', async () => {
    const forged = { ...a, target: OTHER, proof: { ...a.proof, target: OTHER } };
    const r = createNameResolver({
      fetch: fakeFetch({
        'api.nimiqnames.com': () => reply(200, forged),
        'nns.sonartech.pro': () => reply(200, forged),
      }),
    });
    expect((await r.lookup('gaston')).state).toBe('failed');
  });
});
