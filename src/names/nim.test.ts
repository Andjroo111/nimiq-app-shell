// The fixture is real output of nimiq.name's own buildTree (src/merkle.ts), so the
// browser check below is proven against the registry's hashing, not a copy of it.
import { describe, expect, test } from 'bun:test';
import { createNameResolver, isNameInput, nameQuery } from './index';
import proofs from './fixtures/nim-proofs.json';

const ALICE = 'NQ12ACQM28QLU8T2L9J1GVN4NJPL1P3GENVG';
const BOB_SPACED = 'NQ88 XL24 NHPU MYVX 67AC TXLX NQX1 R471 EGM9';
const NOW = 1_800_000_000;
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

type Reply = unknown | 'down' | 404 | 400;
/** A fetch per host. Anything else that gets called, NNS included, throws. */
function hosts(byHost: Record<string, Reply>, calls: string[] = []): typeof fetch {
  return (async (url: string) => {
    calls.push(url);
    const u = new URL(url);
    if (!(u.host in byHost)) throw new Error(`unexpected host ${u.host}`);
    const r = byHost[u.host];
    if (r === 'down') throw new Error('unreachable');
    if (r === 404 || r === 400) return new Response('{"error":"not found"}', { status: r });
    return Response.json(r);
  }) as typeof fetch;
}
const two = (a: Reply, b: Reply, calls?: string[]) => createNameResolver({
  fetch: hosts({ 'a.test': a, 'b.test': b }, calls),
  nim: { endpoints: ['https://a.test', 'https://b.test'], now: () => NOW },
});
const one = (a: Reply, single = true) => createNameResolver({
  fetch: hosts({ 'a.test': a }),
  nim: { endpoints: ['https://a.test'], singleOperator: single, now: () => NOW },
});
/** A one-leaf tree for alice: self-consistent, whatever the target says. */
async function lone(target: string) {
  const leaf = { ...proofs.alice.leaf, target };
  const bytes = new TextEncoder().encode(`\0alice\0${leaf.owner}\0${target}\0${leaf.expiresAt}`);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return { root: Array.from(digest, (v) => v.toString(16).padStart(2, '0')).join(''), leaf, proof: [] };
}
const forged = () => { const f = clone(proofs.alice); f.leaf.target = BOB_SPACED; return f; };

describe('routing', () => {
  test('a .nim query is ours, in any case, and only the alphabet the registry allows', () => {
    expect(nameQuery('Alice.NIM')).toBe('alice.nim');
    expect(nameQuery(' alice.nim ')).toBe('alice.nim');
    expect(nameQuery('ab.nim')).toBeNull();
    expect(nameQuery('al_ice.nim')).toBeNull();
    expect(nameQuery('.nim')).toBeNull();
    expect(nameQuery('sub.alice.nim')).toBeNull();
    expect(nameQuery(`${'a'.repeat(33)}.nim`)).toBeNull();
  });

  test('NNS queries read exactly as before', () => {
    expect(nameQuery('gaston')).toBe('gaston');
    expect(nameQuery('alice.gaston')).toBe('alice.gaston');
    expect(nameQuery('NQ48')).toBeNull();
  });

  test('field mode: a pasted nq-looking .nim is a name, a short prefix still counts as a name', () => {
    expect(isNameInput('nq1cafe.nim')).toBe(true);
    expect(nameQuery('nq1cafe.nim')).toBe('nq1cafe.nim');
    expect(isNameInput('ab.nim')).toBe(true); // field stays a name while nameQuery says no lookup
    expect(isNameInput('NQ12 ACQM')).toBe(false);
  });

  test('a .nim lookup never touches NNS and asks the proof route', async () => {
    const calls: string[] = [];
    const got = await two(proofs.alice, proofs.alice, calls).lookup('alice.nim');
    expect(got.state).toBe('found');
    expect(calls.sort()).toEqual(['https://a.test/api/proof/alice', 'https://b.test/api/proof/alice']);
  });

  test('a bare name never touches the .nim hosts', async () => {
    const calls: string[] = [];
    const r = createNameResolver({ fetch: ((u: string) => { calls.push(u); return Promise.resolve(new Response('{}', { status: 404 })); }) as typeof fetch });
    await r.lookup('gaston');
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.some((u) => u.includes('nimiq.name') || u.includes('/api/proof/'))).toBe(false);
  });
});

describe('what counts as an answer', () => {
  test('two hosts agree: found, with the compact address the field expects', async () => {
    expect(await two(proofs.alice, proofs.alice).lookup('alice.nim')).toEqual({
      state: 'found', query: 'alice.nim', address: ALICE, verification: 'NIM_PROOF', agreed: 2,
    });
  });

  test('DEFAULT: the one real host is not a quorum, so nothing to tap and nothing asked', async () => {
    const calls: string[] = [];
    const r = createNameResolver({ fetch: hosts({ 'nimiq.name': proofs.alice }, calls) });
    expect((await r.lookup('alice.nim')).state).toBe('nim-off');
    expect(calls).toEqual([]);
  });

  test('one host spelled two ways is still one host', async () => {
    const r = createNameResolver({
      fetch: hosts({ 'a.test': proofs.alice, 'a.test:8443': proofs.alice }),
      nim: { endpoints: ['https://a.test', 'https://A.test:8443/'] },
    });
    expect((await r.lookup('alice.nim')).state).toBe('nim-off');
  });

  test('singleOperator is the one way to accept a lone proof, and it still checks the proof', async () => {
    expect((await one(proofs.alice).lookup('alice.nim')).state).toBe('found');
    expect((await one(forged()).lookup('alice.nim')).state).toBe('failed');
    expect((await one(proofs.alice, false).lookup('alice.nim')).state).toBe('nim-off');
  });

  test('the option a site passes, and nothing else, makes nimiq.name the sole resolver', async () => {
    const calls: string[] = [];
    const fetchOne = hosts({ 'nimiq.name': proofs.alice }, calls);
    const accepted = createNameResolver({ fetch: fetchOne, nim: { singleOperator: true, now: () => NOW } });
    expect(await accepted.lookup('alice.nim')).toMatchObject({ state: 'found', address: ALICE, agreed: 1 });
    expect(calls.map((u) => new URL(u).origin)).toEqual(['https://nimiq.name']);

    calls.length = 0;
    const byDefault = createNameResolver({ fetch: fetchOne, nim: { now: () => NOW } });
    expect((await byDefault.lookup('alice.nim')).state).toBe('nim-off');
    expect(calls).toEqual([]);
  });

  test('ATTACK: a forged target with a real proof fails, it does not pend', async () => {
    expect((await two(forged(), forged()).lookup('alice.nim')).state).toBe('failed');
    expect((await two(proofs.alice, forged()).lookup('alice.nim')).state).toBe('failed');
  });

  test('ATTACK: a top-level address beside a real proof is never read', async () => {
    const lying = { ...clone(proofs.alice), address: BOB_SPACED, target: BOB_SPACED };
    expect(await two(lying, lying).lookup('alice.nim')).toMatchObject({ state: 'found', address: ALICE });
  });

  test('ATTACK: a valid proof for another name is refused', async () => {
    expect((await two(proofs.bobbo, proofs.bobbo).lookup('alice.nim')).state).toBe('failed');
  });

  test('ATTACK: a self-consistent tree on each host, different addresses: no pick', async () => {
    const a = await lone(proofs.alice.leaf.target);
    const b = await lone(BOB_SPACED);
    expect((await two(a, a).lookup('alice.nim')).state).toBe('found'); // the shape is valid
    expect((await two(a, b).lookup('alice.nim')).state).toBe('failed');
  });

  test('a target that is not a valid address is refused, whatever its proof', async () => {
    const bad = await lone('NQ00 0000');
    expect((await two(bad, bad).lookup('alice.nim')).state).toBe('failed');
  });

  test('same address, different roots: pending, nothing to tap (PROOF_PENDING)', async () => {
    const behind = await lone(proofs.alice.leaf.target); // a host a batch behind
    expect(behind.root).not.toBe(proofs.alice.root);
    expect(await two(proofs.alice, behind).lookup('alice.nim')).toEqual({ state: 'pending', query: 'alice.nim' });
  });

  test('one host down is not a quorum, and a failure never becomes an address', async () => {
    expect((await two(proofs.alice, 'down').lookup('alice.nim')).state).toBe('failed');
    expect((await two('down', 'down').lookup('alice.nim')).state).toBe('failed');
  });

  test('not registered needs the quorum to say so', async () => {
    expect((await two(404, 404).lookup('nobody.nim')).state).toBe('missing');
    expect((await two(400, 404).lookup('nobody.nim')).state).toBe('missing');
    expect((await two(404, 'down').lookup('nobody.nim')).state).toBe('failed');
  });

  test('expiry: past the grace nobody holds it, inside the grace it still pays', async () => {
    const at = (now: number) => createNameResolver({
      fetch: hosts({ 'a.test': proofs.carol }),
      nim: { endpoints: ['https://a.test'], singleOperator: true, now: () => now },
    });
    const end = proofs.carol.leaf.expiresAt + 90 * 24 * 60 * 60;
    expect((await at(end - 1).lookup('carol.nim')).state).toBe('found');
    expect((await at(end).lookup('carol.nim')).state).toBe('missing');
  });
});
