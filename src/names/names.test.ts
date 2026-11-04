// The fixtures are two real mainnet answers for `gaston`, recorded 2026-09-26
// from both shipped resolvers. They carry real Merkle proofs, so the "found"
// test runs THEIR verification end to end offline, not a mock of it.
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ANCHORED_TOPIC0 } from '@nimiqnames/anchor';
import { CONSTANTS } from '@nimiqnames/core';
import { DEFAULT_ANCHOR_PUBLISHERS } from '@nimiqnames/resolver';
import { addressIsVerified, createNameResolver, isNameInput, nameQuery, nimQuery, NNS_RESOLVERS } from './index';
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

  test('a query is at least 5 characters, so the prefix in the docs is one that can answer', () => {
    expect(nameQuery('gast')).toBeNull();
    expect(nameQuery('gasto')).toBe('gasto');
    for (const path of ['../../README.md', '../ui/name-lookup.ts']) {
      expect(readFileSync(join(import.meta.dir, path), 'utf8')).not.toContain('`gast`');
    }
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

  // Pinned by value, so upstream rewording its comment passes and a new resolver or
  // anchor publisher fails here, which is the moment the one operator text goes stale.
  test('the shipped resolvers and publishers are the ones the docs describe', () => {
    expect(NNS_RESOLVERS.map((r) => r.url)).toEqual(['https://api.nimiqnames.com', 'https://nns.sonartech.pro']);
    expect(DEFAULT_ANCHOR_PUBLISHERS).toEqual([]);
  });

  test('the header does not count the states, and each registry is described as it is', () => {
    const header = read('index.ts').split('import {')[0]!.replace(/\s*\n\/\/\s*/g, ' ');
    expect(header).not.toMatch(/\b(three|four|five|six) states\b/);
    expect(header).toContain('The registry for bare names is NOT ours');
    expect(header).toContain('`alice.nim` is a different namespace');
    const option = read('index.ts').replace(/\s*\n\s*\*?\s*/g, ' ');
    expect(option).toContain('the shipped list does not meet that: one operator runs both');
  });

  test('every @nimiqnames package a test imports is declared', () => {
    const pkg = JSON.parse(read('../../package.json'));
    const declared = { ...pkg.dependencies, ...pkg.devDependencies };
    const imported = [...read('names.test.ts').matchAll(/from '(@nimiqnames\/[a-z]+)'/g)].map((m) => m[1]!);
    expect(imported).toContain('@nimiqnames/anchor');
    for (const name of imported) expect(declared[name]).toBeDefined();
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

describe('characters a sender cannot see', () => {
  // Refused, not cleaned. Stripping them would resolve text whose bytes differ from
  // what it shows, and a bidi override can show one name while holding another.
  const INVISIBLE: Record<string, string> = {
    'zero-width space': '\u200b',
    'zero-width joiner': '\u200d',
    'right-to-left mark': '\u200f',
    'right-to-left override': '\u202e',
    'soft hyphen': '\u00ad',
  };
  for (const [what, c] of Object.entries(INVISIBLE)) {
    test(`a name holding a ${what} is refused by nameQuery`, () => {
      expect(nameQuery(`gas${c}ton`)).toBeNull();
      expect(nameQuery(`${c}gaston`)).toBeNull();
      expect(nameQuery(`gaston${c}`)).toBeNull();
      expect(nameQuery(`ali${c}ce.nim`)).toBeNull();
    });

    test(`a name holding a ${what} is refused by nimQuery`, () => {
      expect(nimQuery(`ali${c}ce.nim`)).toBeNull();
      expect(nimQuery(`${c}alice.nim`)).toBeNull();
      expect(nimQuery(`alice.nim${c}`)).toBeNull();
    });
  }
});

describe('looksLikeAddress through isNameInput', () => {
  const ADDRESS = 'NQ12ACQM28QLU8T2L9J1GVN4NJPL1P3GENVG';
  test('paste debris does not stop an address being one', () => {
    for (const text of [`\u200b${ADDRESS}`, 'NQ 12 ACQM', `nimiq://${ADDRESS}`, `"${ADDRESS}"`, `\u200bnimiq:${ADDRESS}`]) {
      expect(isNameInput(text)).toBe(false);
    }
  });
  test('@ and .nim still mean a name, whatever is around them', () => {
    for (const text of [`@${ADDRESS}`, `"@${ADDRESS}`, `\u200b@${ADDRESS}`, `nimiq:@${ADDRESS}`, `${ADDRESS}.nim`, `"${ADDRESS}.NIM"`, `${ADDRESS}.nim\u200b`]) {
      expect(isNameInput(text)).toBe(true);
    }
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
