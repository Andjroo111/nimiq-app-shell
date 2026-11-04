// The fixtures are two real mainnet answers for `gaston`, recorded 2026-09-26
// from both shipped resolvers. They carry real Merkle proofs, so the "found"
// test runs THEIR verification end to end offline, not a mock of it.
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ANCHORED_TOPIC0 } from '@nimiqnames/anchor';
import { CONSTANTS } from '@nimiqnames/core';
import { addressIsVerified, createNameResolver, isNameInput, nameQuery } from './index';
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

  test('1 to 4 characters are never queried, bare or as a parent', () => {
    expect(nameQuery('nobo')).toBeNull();
    expect(nameQuery('g')).toBeNull();
    expect(nameQuery('alice.nobo')).toBeNull();
    expect(nameQuery('nobod')).toBe('nobod');
  });

  test('a listed reserved name is left to the resolver, bare or as a parent', () => {
    const listed = CONSTANTS.RESERVED_NAMES.find((n) => n.length > 4)!;
    expect(nameQuery(listed)).toBe(listed);
    expect(nameQuery(`alice.${listed}`)).toBe(`alice.${listed}`);
  });
});

describe('the committed bundle', () => {
  const dist = readFileSync(join(import.meta.dir, '../../dist/app-shell.js'), 'utf8');

  test('does not carry the published reserved list', () => {
    const list: readonly string[] = CONSTANTS.RESERVED_NAMES;
    expect(list.length).toBeGreaterThan(100); // or this test proves nothing
    // Neighbouring entries, so a common word elsewhere in the bundle is no hit.
    const quote = '["\'`]';
    const carried = list.slice(1).filter((name, i) =>
      new RegExp(`${quote}${list[i]!}${quote},\\s*${quote}${name}${quote}`).test(dist),
    );
    expect(carried.length).toBe(0);
  });

  test('does not carry the anchor contract bytecode, and keeps the topic the resolver reads', () => {
    expect(dist).not.toMatch(/[0-9a-f]{128}/i);
    expect(dist).toContain(ANCHORED_TOPIC0);
  });

  test('still holds the resolver and its default endpoints', () => {
    expect(dist).toContain('api.nimiqnames.com');
    expect(dist).toContain('NAME_INVALID');
    expect(dist).toContain('nq-cc-name-unverified');
  });
});

describe('what the docs say about the resolvers', () => {
  const read = (path: string) => readFileSync(join(import.meta.dir, path), 'utf8');

  // Read off upstream's own file, so an upgrade that adds an independently run
  // resolver fails here and the docs get corrected.
  test('upstream still says one operator runs both', () => {
    const upstream = read('../../node_modules/@nimiqnames/resolver/dist/defaults.js').replace(/\s*\n\s*\*\s*/g, ' ');
    expect(upstream).toContain('both are run by the operator that publishes this package');
  });

  test('the README and the code state it, and nothing calls them independent', () => {
    const readme = read('../../README.md').replace(/\s+/g, ' ');
    expect(readme).toContain('Both resolvers are run by one operator');
    expect(readme).toContain("a found answer rests on that operator's honesty");
    expect(readme).not.toContain('two independent resolvers');
    const code = read('index.ts').replace(/\s*\n\s*\*?\s*/g, ' ');
    expect(code).toContain("A found NNS answer rests on one operator's honesty");
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

  test('a listed reserved name nobody holds is missing, after asking', async () => {
    const listed = CONSTANTS.RESERVED_NAMES.find((n) => n.length > 4)!;
    let asked = 0;
    const miss = () => {
      asked += 1;
      return reply(404, { error: 'NOT_FOUND', name: listed, height: 1 });
    };
    const r = createNameResolver({
      fetch: fakeFetch({ 'api.nimiqnames.com': miss, 'nns.sonartech.pro': miss }),
    });
    expect((await r.lookup(listed)).state).toBe('missing');
    expect(asked).toBe(2);
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

  describe('a delegated answer', () => {
    const FORGED_HOST = 'evil.example';
    const delegate = () => reply(200, { address: OTHER, ttl: 60 });

    test('a forged top-level host on both answers still comes back DELEGATED, never verified', async () => {
      const asked: string[] = [];
      const r = createNameResolver({
        fetch: fakeFetch({
          'api.nimiqnames.com': () => reply(200, { ...a, host: FORGED_HOST }),
          'nns.sonartech.pro': () => reply(200, { ...b, host: FORGED_HOST }),
          [FORGED_HOST]: () => { asked.push(FORGED_HOST); return delegate(); },
        }),
      });
      const got = await r.lookup('shop.gaston');
      // The parent's proof commits to no host at all, and that does not stop it:
      // this is why the row may not imply any part of the answer is proven.
      expect(a.proof.delegate).toBe('');
      expect(asked).toEqual([FORGED_HOST]);
      if (got.state !== 'found') throw new Error(got.state);
      expect(got.verification).toBe('DELEGATED');
      expect(addressIsVerified(got.verification)).toBe(false);
    });

    test('a forged host on one answer splits the quorum and is refused', async () => {
      const r = createNameResolver({
        fetch: fakeFetch({
          'api.nimiqnames.com': () => reply(200, { ...a, host: FORGED_HOST }),
          'nns.sonartech.pro': () => reply(200, b),
          [FORGED_HOST]: delegate,
        }),
      });
      expect((await r.lookup('shop.gaston')).state).toBe('failed');
    });

    test('a forged host does not touch a plain name, which never asks it', async () => {
      const r = createNameResolver({
        fetch: fakeFetch({
          'api.nimiqnames.com': () => reply(200, { ...a, host: FORGED_HOST }),
          'nns.sonartech.pro': () => reply(200, { ...b, host: FORGED_HOST }),
        }),
      });
      const got = await r.lookup('gaston');
      if (got.state !== 'found') throw new Error(got.state);
      expect(got.address).toBe(GASTON);
      expect(addressIsVerified(got.verification)).toBe(true);
    });

    test('a parent with no delegate host is undelegated, not a failure to retry', async () => {
      const r = createNameResolver({
        fetch: fakeFetch({
          'api.nimiqnames.com': () => reply(200, a),
          'nns.sonartech.pro': () => reply(200, b),
        }),
      });
      expect(await r.lookup('shop.gaston')).toEqual({ state: 'undelegated', query: 'shop.gaston' });
    });

    test('a delegate host that does not answer is still a failure', async () => {
      const r = createNameResolver({
        fetch: fakeFetch({
          'api.nimiqnames.com': () => reply(200, { ...a, host: FORGED_HOST }),
          'nns.sonartech.pro': () => reply(200, { ...b, host: FORGED_HOST }),
          [FORGED_HOST]: () => reply(500, {}),
        }),
      });
      expect((await r.lookup('shop.gaston')).state).toBe('failed');
    });

    test('only the named verified states count as verified', () => {
      expect(addressIsVerified('PROVEN')).toBe(true);
      expect(addressIsVerified('NIM_PROOF')).toBe(true);
      expect(addressIsVerified('DELEGATED')).toBe(false);
      expect(addressIsVerified('PROOF_PENDING')).toBe(false);
    });
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
