// The fixtures are two real mainnet answers for `gaston`, recorded 2026-09-26
// from both shipped resolvers. They carry real Merkle proofs, so the "found"
// test runs THEIR verification end to end offline, not a mock of it.
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ANCHORED_TOPIC0 } from '@nimiqnames/anchor';
import { CONSTANTS } from '@nimiqnames/core';
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
